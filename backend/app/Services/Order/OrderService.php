<?php

namespace App\Services\Order;

use App\Models\Cart;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\StoreOrder;
use App\Models\User;
use App\Models\UserAddress;
use App\Services\Coupon\CouponService;
use App\Services\Inventory\InventoryService;
use App\Services\Points\PointService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class OrderService
{
    public function __construct(
        private CouponService $couponService,
        private PointService $pointService,
        private InventoryService $inventoryService
    ) {}

    /**
     * Place order from cart.
     * Creates one Order and multiple StoreOrders (one per store).
     */
    public function placeOrder(User $user, int $deliveryAddressId, ?string $paymentMethod = null, ?string $couponCode = null, ?float $pointsToRedeem = null): array
    {
        DB::beginTransaction();

        try {
            $cart = Cart::where('user_id', $user->id)->lockForUpdate()->first();

            if (! $cart || $cart->items()->count() === 0) {
                throw new \Exception('Cart is empty');
            }

            $deliveryAddress = UserAddress::where('user_id', $user->id)->lockForUpdate()->findOrFail($deliveryAddressId);
            $snapshot = $deliveryAddress->only(['full_name', 'phone', 'address_line_1', 'address_line_2', 'postal_code', 'country_id', 'state_id', 'city_id']);
            foreach (['country', 'state', 'city'] as $relation) {
                $snapshot[$relation] = $deliveryAddress->$relation?->name;
            }
            $snapshot['source'] = 'checkout';
            app(\App\Services\Marketplace\BuyerWalletService::class)->locked($user);
            app(\App\Services\Campaigns\DiscountPricingService::class)->repriceCart($cart, true);

            // Group cart items by store
            $itemsByStore = $cart->items()
                ->with([
                    'product' => fn ($q) => $q->withTrashed(),
                    'store' => fn ($q) => $q->withTrashed(),
                    'variant',
                ])
                ->get()
                ->groupBy('store_id');

            // Create parent order
            $order = Order::create([
                'user_id' => $user->id,
                'order_no' => Order::generateOrderNumber(),
                'delivery_address_snapshot' => $snapshot,
                'payment_method' => $paymentMethod,
                'payment_status' => 'pending',
                'items_total' => 0,
                'shipping_total' => 0,
                'platform_fee' => 0,
                'discount_total' => 0,
                'grand_total' => 0,
            ]);

            $storeOrders = [];
            $totalItems = 0;
            $totalShipping = 0;
            $totalPlatformFee = 0;
            $totalDiscount = 0;
            $grandTotal = 0;

            // Calculate total items first for coupon validation
            foreach ($itemsByStore as $storeId => $items) {
                $subtotal = $items->sum(function ($item) {
                    return $item->price * $item->quantity;
                });
                $totalItems += $subtotal;
            }

            // Validate and apply coupon if provided
            $coupon = null;
            $couponDiscount = 0;
            if ($couponCode) {
                $validation = $this->couponService->validateCoupon($couponCode, $user->id, $totalItems);
                if ($validation['valid']) {
                    $coupon = $validation['coupon'];
                    $couponDiscount = $validation['discount_amount'];
                } else {
                    throw new \Exception($validation['message']);
                }
            }

            // Validate and apply points redemption if provided
            $pointsDiscount = 0;
            $pointsUsed = 0;
            if ($pointsToRedeem && $pointsToRedeem > 0) {
                try {
                    // Calculate order total after coupon discount
                    $orderTotalAfterCoupon = max(0, $totalItems - $couponDiscount);

                    // Redeem points (this will deduct points from wallet)
                    $redeemResult = $this->pointService->redeemPoints($user, $pointsToRedeem, null);
                    $pointsDiscount = $redeemResult['discount_amount'];
                    $pointsUsed = $redeemResult['points_used'];

                    // Ensure points discount doesn't exceed order total
                    if ($pointsDiscount > $orderTotalAfterCoupon) {
                        $pointsDiscount = $orderTotalAfterCoupon;
                    }
                } catch (\Exception $e) {
                    throw new \Exception('Points redemption failed: '.$e->getMessage());
                }
            }

            // Reserve / decrement inventory (row locks; throws if oversold vs current stock)
            foreach ($itemsByStore as $items) {
                foreach ($items as $cartItem) {
                    $this->inventoryService->decrementForCartLine($cartItem);
                }
            }

            // Create StoreOrder for each store
            foreach ($itemsByStore as $storeId => $items) {
                $store = $items->first()?->store;
                if (! $store) {
                    throw new \Exception('Cart contains items from a store that is no longer available.');
                }

                // Calculate subtotal for this store
                $subtotal = $items->sum(function ($item) {
                    return $item->price * $item->quantity;
                });

                // Generate delivery code (OTP)
                // Delivery codes are issued only after verified payment.

                // Create StoreOrder (status: pending, delivery fee will be set by seller)
                $storeOrder = StoreOrder::create([
                    'order_id' => $order->id,
                    'store_id' => $storeId,
                    'status' => 'pending',
                    'subtotal' => $subtotal,
                    'delivery_fee' => 0, // Will be set by seller on accept
                    'total' => $subtotal,
                    'delivery_code' => null,
                    'payment_status' => 'pending', 'financial_version' => 1,
                    'delivery_address_snapshot' => $snapshot,
                    'delivery_address_id' => $deliveryAddressId,
                ]);

                // Create OrderItems
                foreach ($items as $cartItem) {
                    $product = $cartItem->product;
                    $variant = $cartItem->variant;

                    // Use variant images if available, otherwise product images
                    $images = $variant && $variant->images ? $variant->images : $product->images;
                    $pv = $cartItem->product_variant;
                    if (is_array($pv) && ! empty($pv['eye_hygiene']['image_url'])) {
                        $ehImg = $pv['eye_hygiene']['image_url'];
                        $baseImages = is_array($images) ? $images : (array) ($images ?? []);
                        $images = array_values(array_unique(array_merge([$ehImg], $baseImages)));
                    }

                    OrderItem::create([
                        'store_order_id' => $storeOrder->id,
                        'product_id' => $product->id,
                        'variant_id' => $cartItem->variant_id,
                        'product_size_volume_id' => $cartItem->product_size_volume_id,
                        'eye_hygiene_variant_id' => $cartItem->eye_hygiene_variant_id,
                        'quantity' => $cartItem->quantity,
                        'price' => $cartItem->price,
                        'original_price' => $cartItem->original_price,
                        'campaign_discount_amount' => $cartItem->campaign_discount_amount,
                        'campaign_pricing' => $cartItem->campaign_pricing,
                        'line_total' => $cartItem->price * $cartItem->quantity,
                        'product_name' => $product->name,
                        'product_sku' => $product->sku,
                        'product_variant' => $cartItem->product_variant,
                        'lens_configuration' => $cartItem->lens_configuration,
                        'prescription_data' => $cartItem->prescription_data,
                        'product_images' => $images,
                        // Copy specific fields from cart item
                        'frame_size_id' => $cartItem->frame_size_id,
                        'prescription_id' => $cartItem->prescription_id,
                        'lens_index' => $cartItem->lens_index,
                        'lens_type' => $cartItem->lens_type,
                        'lens_thickness_material_id' => $cartItem->lens_thickness_material_id,
                        'lens_thickness_option_id' => $cartItem->lens_thickness_option_id,
                        'lens_color_id' => $cartItem->lens_color_id,
                        'treatment_ids' => $cartItem->treatment_ids,
                        'lens_coatings' => $cartItem->lens_coatings,
                        'photochromic_color_id' => $cartItem->photochromic_color_id,
                        'prescription_sun_color_id' => $cartItem->prescription_sun_color_id,
                        'progressive_variant_id' => $cartItem->progressive_variant_id,
                        // Contact lens fields
                        'contact_lens_left_base_curve' => $cartItem->contact_lens_left_base_curve,
                        'contact_lens_left_diameter' => $cartItem->contact_lens_left_diameter,
                        'contact_lens_left_power' => $cartItem->contact_lens_left_power,
                        'contact_lens_left_qty' => $cartItem->contact_lens_left_qty,
                        'contact_lens_left_cylinder' => $cartItem->contact_lens_left_cylinder,
                        'contact_lens_left_axis' => $cartItem->contact_lens_left_axis,
                        'contact_lens_right_base_curve' => $cartItem->contact_lens_right_base_curve,
                        'contact_lens_right_diameter' => $cartItem->contact_lens_right_diameter,
                        'contact_lens_right_power' => $cartItem->contact_lens_right_power,
                        'contact_lens_right_qty' => $cartItem->contact_lens_right_qty,
                        'contact_lens_right_cylinder' => $cartItem->contact_lens_right_cylinder,
                        'contact_lens_right_axis' => $cartItem->contact_lens_right_axis,
                        'contact_lens_pack_quantity' => $cartItem->contact_lens_pack_quantity,
                    ]);
                }

                $grandTotal += $subtotal;
                $storeOrders[] = $storeOrder;
            }

            // Apply discounts to grand total
            $totalDiscount = $couponDiscount + $pointsDiscount;
            $grandTotal = max(0, $grandTotal - $totalDiscount);

            // Update order totals
            $order->update([
                'items_total' => $totalItems,
                'shipping_total' => $totalShipping,
                'platform_fee' => $totalPlatformFee,
                'discount_total' => $totalDiscount,
                'grand_total' => $grandTotal,
                'meta' => [
                    'coupon_id' => $coupon ? $coupon->id : null,
                    'coupon_code' => $coupon ? $coupon->code : null,
                    'points_redeemed' => $pointsUsed,
                    'points_discount' => $pointsDiscount,
                ],
            ]);

            // Apply coupon to order (create usage record)
            if ($coupon) {
                $this->couponService->applyCoupon($order, $coupon);
            }

            // Update point transaction with order reference if points were redeemed
            if ($pointsUsed > 0) {
                \App\Models\PointTransaction::where('user_id', $user->id)
                    ->where('type', 'redeem')
                    ->whereNull('reference_id')
                    ->orderBy('created_at', 'desc')
                    ->first()
                    ?->update([
                        'reference_type' => 'order',
                        'reference_id' => $order->id,
                    ]);
            }

            app(\App\Services\Marketplace\OrderTotalsService::class)->allocate($order, $totalDiscount, $pointsUsed);
            app(\App\Services\Marketplace\OrderTotalsService::class)->sync($order);
            app(\App\Services\Campaigns\DiscountPricingService::class)->recordUsage($order);

            // Clear cart
            $cart->items()->delete();

            DB::commit();

            return [
                'order' => $order->load([
                    'storeOrders.store',
                    'storeOrders.items.product',
                    'storeOrders.items.variant',
                ]),
                'store_orders' => $storeOrders,
            ];
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Order placement failed: '.$e->getMessage());
            throw $e;
        }
    }
}

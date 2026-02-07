<?php

namespace App\Services\Order;

use App\Models\Order;
use App\Models\StoreOrder;
use App\Models\OrderItem;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\User;
use App\Models\UserAddress;
use App\Services\Coupon\CouponService;
use App\Services\Points\PointService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class OrderService
{
    public function __construct(
        private CouponService $couponService,
        private PointService $pointService
    ) {}

    /**
     * Place order from cart.
     * Creates one Order and multiple StoreOrders (one per store).
     */
    public function placeOrder(User $user, int $deliveryAddressId, string $paymentMethod = null, string $couponCode = null, float $pointsToRedeem = null): array
    {
        DB::beginTransaction();
        
        try {
            $cart = Cart::where('user_id', $user->id)->first();
            
            if (!$cart || $cart->items()->count() === 0) {
                throw new \Exception('Cart is empty');
            }

            $deliveryAddress = UserAddress::findOrFail($deliveryAddressId);
            
            // Group cart items by store
            $itemsByStore = $cart->items()->with('product', 'store')->get()->groupBy('store_id');
            
            // Create parent order
            $order = Order::create([
                'user_id' => $user->id,
                'order_no' => Order::generateOrderNumber(),
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
                    throw new \Exception('Points redemption failed: ' . $e->getMessage());
                }
            }

            // Create StoreOrder for each store
            foreach ($itemsByStore as $storeId => $items) {
                $store = $items->first()->store;
                
                // Calculate subtotal for this store
                $subtotal = $items->sum(function ($item) {
                    return $item->price * $item->quantity;
                });

                // Generate delivery code (OTP)
                $deliveryCode = StoreOrder::generateDeliveryCode();

                // Create StoreOrder (status: pending, delivery fee will be set by seller)
                $storeOrder = StoreOrder::create([
                    'order_id' => $order->id,
                    'store_id' => $storeId,
                    'status' => 'pending',
                    'subtotal' => $subtotal,
                    'delivery_fee' => 0, // Will be set by seller on accept
                    'total' => $subtotal,
                    'delivery_code' => $deliveryCode,
                    'delivery_address_id' => $deliveryAddressId,
                ]);

                // Create OrderItems
                foreach ($items as $cartItem) {
                    $product = $cartItem->product;
                    $variant = $cartItem->variant;
                    
                    // Use variant images if available, otherwise product images
                    $images = $variant && $variant->images ? $variant->images : $product->images;
                    
                    OrderItem::create([
                        'store_order_id' => $storeOrder->id,
                        'product_id' => $product->id,
                        'variant_id' => $cartItem->variant_id,
                        'quantity' => $cartItem->quantity,
                        'price' => $cartItem->price,
                        'line_total' => $cartItem->price * $cartItem->quantity,
                        'product_name' => $product->name,
                        'product_sku' => $product->sku,
                        'product_variant' => $cartItem->product_variant,
                        'lens_configuration' => $cartItem->lens_configuration,
                        'prescription_data' => $cartItem->prescription_data,
                        'product_images' => $images,
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

            // Clear cart
            $cart->items()->delete();

            DB::commit();

            return [
                'order' => $order->load('storeOrders.store', 'storeOrders.items'),
                'store_orders' => $storeOrders,
            ];
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Order placement failed: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Accept store order (seller sets delivery fee).
     */
    public function acceptStoreOrder(StoreOrder $storeOrder, array $data): StoreOrder
    {
        DB::beginTransaction();
        
        try {
            $deliveryFee = $data['delivery_fee'] ?? 0;
            $total = $storeOrder->subtotal + $deliveryFee;

            $storeOrder->update([
                'status' => 'accepted',
                'delivery_fee' => $deliveryFee,
                'total' => $total,
                'estimated_delivery_date' => $data['estimated_delivery_date'] ?? null,
                'delivery_method' => $data['delivery_method'] ?? null,
                'delivery_notes' => $data['delivery_notes'] ?? null,
                'accepted_at' => now(),
            ]);

            DB::commit();
            
            return $storeOrder->fresh();
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * Reject store order.
     */
    public function rejectStoreOrder(StoreOrder $storeOrder, string $reason): StoreOrder
    {
        $storeOrder->update([
            'status' => 'rejected',
            'rejection_reason' => $reason,
        ]);

        return $storeOrder->fresh();
    }

    /**
     * Mark store order as out for delivery.
     */
    public function markOutForDelivery(StoreOrder $storeOrder): StoreOrder
    {
        if ($storeOrder->status !== 'paid') {
            throw new \Exception('Order must be paid before marking as out for delivery');
        }

        $storeOrder->update([
            'status' => 'out_for_delivery',
            'out_for_delivery_at' => now(),
        ]);

        return $storeOrder->fresh();
    }

    /**
     * Mark store order as delivered (requires OTP verification).
     */
    public function markDelivered(StoreOrder $storeOrder, string $otpCode): StoreOrder
    {
        if ($storeOrder->status !== 'out_for_delivery') {
            throw new \Exception('Order must be out for delivery before marking as delivered');
        }

        if ($storeOrder->delivery_code !== $otpCode) {
            throw new \Exception('Invalid delivery code');
        }

        DB::beginTransaction();
        
        try {
            $storeOrder->update([
                'status' => 'delivered',
                'delivered_at' => now(),
            ]);

            // Release escrow (handled by EscrowService)
            if ($storeOrder->escrow) {
                app(\App\Services\Escrow\EscrowService::class)->releaseEscrow($storeOrder);
            }

            // Award points for purchase
            $order = $storeOrder->order;
            if ($order && $order->user) {
                $this->pointService->earnFromPurchase($order);
            }

            DB::commit();
            
            return $storeOrder->fresh();
        } catch (\Exception $e) {
            DB::rollBack();
            throw $e;
        }
    }
}


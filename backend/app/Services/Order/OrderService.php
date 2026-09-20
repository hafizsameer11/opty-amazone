<?php

namespace App\Services\Order;

use App\Models\{Cart, Order, OrderItem, StoreOrder, User, UserAddress};
use App\Services\Campaigns\DiscountPricingService;
use App\Services\Coupon\CouponService;
use App\Services\Inventory\InventoryService;
use App\Services\Marketplace\Money;
use App\Services\Marketplace\OrderTotalsService;
use App\Services\Points\PointService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class OrderService
{
    public function __construct(
        private CouponService $coupons,
        private PointService $points,
        private InventoryService $inventory,
        private DiscountPricingService $pricing,
        private OrderTotalsService $totals,
    ) {}

    /**
     * Prices, coupon eligibility and all store allocations are recalculated
     * inside one transaction. Client totals and eligible item ids are ignored.
     */
    public function placeOrder(
        User $user,
        int $deliveryAddressId,
        ?string $paymentMethod = null,
        ?string $couponCode = null,
        ?float $pointsToRedeem = null,
        array $couponCodes = [],
        ?string $checkoutKey = null,
    ): array {
        try {
            return DB::transaction(function () use ($user, $deliveryAddressId, $paymentMethod, $couponCode, $pointsToRedeem, $couponCodes, $checkoutKey) {
                $checkoutKey = $checkoutKey ? trim($checkoutKey) : null;
                if ($checkoutKey !== null && $checkoutKey !== '') {
                    $existing = Order::where('user_id', $user->id)->where('checkout_key', $checkoutKey)->lockForUpdate()->first();
                    if ($existing) return $this->resultFor($existing);
                }

                $cart = Cart::where('user_id', $user->id)->lockForUpdate()->first();
                if (! $cart || ! $cart->items()->exists()) throw new \RuntimeException('Cart is empty');

                $address = UserAddress::where('user_id', $user->id)->lockForUpdate()->findOrFail($deliveryAddressId);
                $snapshot = $this->addressSnapshot($address);
                app(\App\Services\Marketplace\BuyerWalletService::class)->locked($user);
                $this->pricing->repriceCart($cart, true);

                if ($couponCode && trim($couponCode) !== '') $couponCodes['_single'] = $couponCode;
                $couponQuote = $this->coupons->quoteCart($cart, $user, $couponCodes, true);
                $itemsByStore = $cart->items()->with([
                    'product' => fn ($query) => $query->withTrashed(),
                    'store' => fn ($query) => $query->withTrashed(),
                    'variant',
                ])->get()->groupBy('store_id');

                foreach ($itemsByStore as $items) {
                    foreach ($items as $cartItem) $this->inventory->decrementForCartLine($cartItem);
                }

                $order = Order::create([
                    'user_id' => $user->id, 'order_no' => Order::generateOrderNumber(), 'checkout_key' => $checkoutKey,
                    'delivery_address_snapshot' => $snapshot, 'payment_method' => $paymentMethod, 'payment_status' => 'pending',
                    'items_total' => 0, 'shipping_total' => 0, 'platform_fee' => 0, 'discount_total' => 0, 'grand_total' => 0,
                ]);

                $storeOrders = [];
                $couponDiscountCents = 0;
                foreach ($itemsByStore as $storeId => $items) {
                    $store = $items->first()?->store;
                    if (! $store) throw new \RuntimeException('Cart contains items from a store that is no longer available.');

                    $subtotal = $items->sum(fn ($item) => Money::cents($item->price) * (int) $item->quantity);
                    $storeCoupon = $couponQuote['stores'][(int) $storeId]['_quote'] ?? null;
                    $couponCents = (int) ($storeCoupon['discount_cents'] ?? 0);
                    $couponDiscountCents += $couponCents;
                    $storeOrder = StoreOrder::create([
                        'order_id' => $order->id, 'store_id' => $storeId, 'status' => 'pending',
                        'subtotal' => Money::decimal($subtotal), 'delivery_fee' => Money::decimal(0),
                        'discount_total' => Money::decimal($couponCents), 'total' => Money::decimal($subtotal - $couponCents),
                        'payment_status' => 'pending', 'financial_version' => 1,
                        'delivery_address_snapshot' => $snapshot, 'delivery_address_id' => $deliveryAddressId,
                    ]);

                    $createdItems = [];
                    foreach ($items as $cartItem) $createdItems[$cartItem->id] = $this->createOrderItem($storeOrder, $cartItem);
                    if ($storeCoupon) {
                        $storeCoupon['affected_items'] = $this->attachAffectedOrderItems($storeCoupon['affected_items'], $createdItems);
                        $storeCoupon['snapshot']['affected_items'] = $storeCoupon['affected_items'];
                        $this->coupons->reserve($storeOrder, $user, $storeCoupon, $checkoutKey ?: 'order-'.$order->id);
                    }
                    $storeOrders[] = $storeOrder;
                }

                $pointsDiscount = 0;
                $pointsUsed = 0;
                if ($pointsToRedeem && $pointsToRedeem > 0) {
                    $maximum = max(0, Money::cents($couponQuote['final_before_shipping']));
                    $redemption = $this->points->redeemPoints($user, $pointsToRedeem, null);
                    $pointsDiscount = min($maximum, Money::cents($redemption['discount_amount']));
                    $pointsUsed = (float) $redemption['points_used'];
                }

                if ($pointsDiscount > 0) $this->totals->allocateAdditionalPoints($order, $pointsDiscount, $pointsUsed);
                if ($pointsUsed > 0) {
                    \App\Models\PointTransaction::where('user_id', $user->id)->where('type', 'redeem')->whereNull('reference_id')
                        ->latest()->first()?->update(['reference_type' => 'order', 'reference_id' => $order->id]);
                }

                $order->update(['meta' => [
                    'coupon_codes' => collect($couponQuote['stores'])->filter(fn ($store) => $store['coupon'])->mapWithKeys(fn ($store) => [$store['store_id'] => $store['coupon']['code']])->all(),
                    'coupon_breakdown' => collect($couponQuote['stores'])->mapWithKeys(fn ($store) => [$store['store_id'] => $store['coupon']])->filter()->all(),
                    'points_redeemed' => $pointsUsed, 'points_discount' => Money::decimal($pointsDiscount),
                ]]);
                $this->totals->sync($order);
                $this->pricing->recordUsage($order);
                $cart->items()->delete();

                return $this->resultFor($order);
            }, 5);
        } catch (\Throwable $exception) {
            Log::error('Order placement failed: '.$exception->getMessage());
            throw $exception;
        }
    }

    private function resultFor(Order $order): array
    {
        $order->load(['storeOrders.store', 'storeOrders.items.product', 'storeOrders.items.variant']);
        return ['order' => $order, 'store_orders' => $order->storeOrders->values()->all()];
    }

    private function addressSnapshot(UserAddress $address): array
    {
        $snapshot = $address->only(['full_name', 'phone', 'address_line_1', 'address_line_2', 'postal_code', 'country_id', 'state_id', 'city_id', 'country_name', 'state_name', 'city_name']);
        foreach (['country', 'state', 'city'] as $relation) $snapshot[$relation] = $address->$relation?->name ?? $snapshot[$relation.'_name'] ?? null;
        $snapshot['source'] = 'checkout';
        return $snapshot;
    }

    private function createOrderItem(StoreOrder $storeOrder, $cartItem): OrderItem
    {
        $product = $cartItem->product;
        $variant = $cartItem->variant;
        $images = $variant && $variant->images ? $variant->images : $product->images;
        $productVariant = $cartItem->product_variant;
        if (is_array($productVariant) && ! empty($productVariant['eye_hygiene']['image_url'])) {
            $images = array_values(array_unique(array_merge([$productVariant['eye_hygiene']['image_url']], is_array($images) ? $images : (array) ($images ?? []))));
        }

        return OrderItem::create([
            'store_order_id' => $storeOrder->id, 'product_id' => $product->id, 'variant_id' => $cartItem->variant_id,
            'product_size_volume_id' => $cartItem->product_size_volume_id, 'eye_hygiene_variant_id' => $cartItem->eye_hygiene_variant_id,
            'quantity' => $cartItem->quantity, 'price' => $cartItem->price, 'original_price' => $cartItem->original_price,
            'campaign_discount_amount' => $cartItem->campaign_discount_amount, 'campaign_pricing' => $cartItem->campaign_pricing,
            'line_total' => Money::decimal(Money::cents($cartItem->price) * (int) $cartItem->quantity),
            'product_name' => $product->name, 'product_sku' => $product->sku, 'product_variant' => $productVariant,
            'lens_configuration' => $cartItem->lens_configuration, 'prescription_data' => $cartItem->prescription_data, 'product_images' => $images,
            'frame_size_id' => $cartItem->frame_size_id, 'prescription_id' => $cartItem->prescription_id,
            'lens_index' => $cartItem->lens_index, 'lens_type' => $cartItem->lens_type,
            'lens_thickness_material_id' => $cartItem->lens_thickness_material_id, 'lens_thickness_option_id' => $cartItem->lens_thickness_option_id,
            'lens_color_id' => $cartItem->lens_color_id, 'treatment_ids' => $cartItem->treatment_ids,
            'lens_coatings' => $cartItem->lens_coatings, 'photochromic_color_id' => $cartItem->photochromic_color_id,
            'prescription_sun_color_id' => $cartItem->prescription_sun_color_id, 'progressive_variant_id' => $cartItem->progressive_variant_id,
            'contact_lens_left_base_curve' => $cartItem->contact_lens_left_base_curve, 'contact_lens_left_diameter' => $cartItem->contact_lens_left_diameter,
            'contact_lens_left_power' => $cartItem->contact_lens_left_power, 'contact_lens_left_qty' => $cartItem->contact_lens_left_qty,
            'contact_lens_left_cylinder' => $cartItem->contact_lens_left_cylinder, 'contact_lens_left_axis' => $cartItem->contact_lens_left_axis,
            'contact_lens_right_base_curve' => $cartItem->contact_lens_right_base_curve, 'contact_lens_right_diameter' => $cartItem->contact_lens_right_diameter,
            'contact_lens_right_power' => $cartItem->contact_lens_right_power, 'contact_lens_right_qty' => $cartItem->contact_lens_right_qty,
            'contact_lens_right_cylinder' => $cartItem->contact_lens_right_cylinder, 'contact_lens_right_axis' => $cartItem->contact_lens_right_axis,
            'contact_lens_pack_quantity' => $cartItem->contact_lens_pack_quantity,
        ]);
    }

    /** Snapshot the immutable order-item ids, not only transient cart line ids. */
    private function attachAffectedOrderItems(array $affected, array $orderItems): array
    {
        return collect($affected)->map(function (array $line) use ($orderItems) {
            $match = $orderItems[(int) ($line['cart_item_id'] ?? 0)] ?? null;
            if ($match) $line['order_item_id'] = $match->id;
            return $line;
        })->values()->all();
    }
}

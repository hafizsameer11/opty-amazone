<?php

namespace App\Services\Coupon;

use App\Models\{Cart, CartItem, Coupon, CouponAudit, CouponUsage, Product, ProductVariant, StoreOrder, User};
use App\Services\Marketplace\Money;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

/**
 * The only coupon calculator used by preview, checkout and shipment payment.
 * Amounts are kept in cents until the response/persistence boundary.
 */
class CouponService
{
    public function quoteCart(Cart $cart, User $buyer, array $couponCodes = [], bool $lock = false): array
    {
        $items = $cart->items()
            ->with(['product.store', 'variant'])
            ->orderBy('id')
            ->get();

        if ($items->isEmpty()) {
            throw new CouponValidationException('cart_empty', 'Cart is empty.');
        }

        $codes = $this->normaliseRequestedCodes($couponCodes);
        $byStore = $items->groupBy('store_id');
        $couponByCode = $this->loadRequestedCoupons($codes, $lock);
        $requestedByStore = [];

        foreach ($codes as $requestedStoreKey => $code) {
            $requestedStoreId = is_int($requestedStoreKey) || ctype_digit((string) $requestedStoreKey) ? (int) $requestedStoreKey : null;
            $coupon = $couponByCode[$code] ?? null;
            if (! $coupon) {
                throw new CouponValidationException('coupon_not_found', 'Coupon not found.');
            }
            if ($requestedStoreId !== null && $requestedStoreId !== (int) $coupon->store_id) {
                throw new CouponValidationException('coupon_belongs_to_another_store', 'Coupon belongs to another store.');
            }
            if (isset($requestedByStore[$coupon->store_id])) {
                throw new CouponValidationException('multiple_store_coupons', 'Only one coupon can be applied to each seller store.');
            }
            $requestedByStore[$coupon->store_id] = $coupon;
        }

        $stores = [];
        $originalTotal = $campaignDiscountTotal = $couponDiscountTotal = 0;
        foreach ($byStore as $storeId => $storeItems) {
            $store = $storeItems->first()->store;
            if (! $store || ! $store->is_active || $store->status !== 'active') {
                throw new CouponValidationException('seller_store_inactive', 'Seller/store is inactive.');
            }

            $originalSubtotal = 0;
            $automaticDiscount = 0;
            foreach ($storeItems as $item) {
                $original = Money::cents($item->original_price ?? $item->price) * (int) $item->quantity;
                $campaigned = Money::cents($item->price) * (int) $item->quantity;
                $originalSubtotal += $original;
                $automaticDiscount += max(0, $original - $campaigned);
            }

            $couponQuote = null;
            if ($coupon = ($requestedByStore[(int) $storeId] ?? null)) {
                $couponQuote = $this->quoteCouponForStore($coupon, $storeItems, $buyer, $lock);
            }

            $couponDiscount = $couponQuote['discount_cents'] ?? 0;
            $stores[(int) $storeId] = [
                'store_id' => (int) $storeId,
                'store_name' => $store->name,
                'original_subtotal' => Money::decimal($originalSubtotal),
                'automatic_campaign_discount' => Money::decimal($automaticDiscount),
                'subtotal_after_campaigns' => Money::decimal($originalSubtotal - $automaticDiscount),
                'coupon_discount' => Money::decimal($couponDiscount),
                'shipping_discount' => Money::decimal(0),
                'coupon' => $couponQuote ? $this->publicQuote($couponQuote) : null,
                'final_before_shipping' => Money::decimal($originalSubtotal - $automaticDiscount - $couponDiscount),
                '_quote' => $couponQuote,
            ];
            $originalTotal += $originalSubtotal;
            $campaignDiscountTotal += $automaticDiscount;
            $couponDiscountTotal += $couponDiscount;
        }

        return [
            'stores' => $stores,
            'original_subtotal' => Money::decimal($originalTotal),
            'automatic_campaign_discount' => Money::decimal($campaignDiscountTotal),
            'coupon_discount' => Money::decimal($couponDiscountTotal),
            'shipping_discount' => Money::decimal(0),
            'final_before_shipping' => Money::decimal($originalTotal - $campaignDiscountTotal - $couponDiscountTotal),
        ];
    }

    /** Lock and reserve a quote only after its StoreOrder exists. */
    public function reserve(StoreOrder $storeOrder, User $buyer, array $quote, string $checkoutKey): ?CouponUsage
    {
        if (! $quote || empty($quote['coupon_id'])) return null;

        $key = sprintf('coupon:%s:store-order:%d', $checkoutKey, $storeOrder->id);
        if ($existing = CouponUsage::where('reservation_key', $key)->lockForUpdate()->first()) return $existing;

        $coupon = Coupon::with(['store', 'products', 'categories', 'variants'])->lockForUpdate()->find($quote['coupon_id']);
        if (! $coupon) throw new CouponValidationException('coupon_not_found', 'Coupon not found.');

        // Recheck mutable status/rules under the coupon row lock immediately
        // before consuming a reservation slot.
        $this->assertCouponAvailable($coupon, $buyer->id, true);
        $snapshot = $quote['snapshot'];
        $usage = CouponUsage::create([
            'coupon_id' => $coupon->id,
            'user_id' => $buyer->id,
            'order_id' => $storeOrder->order_id,
            'store_order_id' => $storeOrder->id,
            'status' => 'reserved',
            'reservation_key' => $key,
            'idempotency_key' => $checkoutKey,
            'discount_amount' => Money::decimal($quote['discount_cents']),
            'shipping_discount' => Money::decimal(0),
            'eligible_subtotal' => Money::decimal($quote['eligible_subtotal_cents']),
            'order_total' => Money::decimal(Money::cents($storeOrder->subtotal)),
            'snapshot' => $snapshot,
            'affected_items' => $quote['affected_items'],
            'expires_at' => $coupon->ends_at && $coupon->ends_at->lt(now()->addHours(24)) ? $coupon->ends_at : now()->addHours(24),
        ]);
        $coupon->increment('reserved_count');

        $storeOrder->update([
            'coupon_code' => $coupon->code,
            'coupon_discount' => Money::decimal($quote['discount_cents']),
            'coupon_shipping_discount' => Money::decimal(0),
            'coupon_snapshot' => $snapshot,
        ]);

        return $usage;
    }

    public function redeem(StoreOrder $storeOrder): void
    {
        $usage = CouponUsage::where('store_order_id', $storeOrder->id)->lockForUpdate()->first();
        if (! $usage || $usage->status !== 'reserved') return;

        $coupon = Coupon::withTrashed()->lockForUpdate()->find($usage->coupon_id);
        $usage->update(['status' => 'redeemed', 'redeemed_at' => now()]);
        if ($coupon) {
            $coupon->decrement('reserved_count');
            $coupon->increment('usage_count');
        }
    }

    public function release(StoreOrder $storeOrder, string $reason = 'cancelled'): void
    {
        $usage = CouponUsage::where('store_order_id', $storeOrder->id)->lockForUpdate()->first();
        if (! $usage || $usage->status !== 'reserved') return;

        $coupon = Coupon::withTrashed()->lockForUpdate()->find($usage->coupon_id);
        $usage->update(['status' => 'released', 'released_at' => now(), 'snapshot' => array_merge($usage->snapshot ?? [], ['release_reason' => $reason])]);
        if ($coupon && $coupon->reserved_count > 0) $coupon->decrement('reserved_count');
    }

    public function markRefunded(StoreOrder $storeOrder): void
    {
        $usage = CouponUsage::where('store_order_id', $storeOrder->id)->lockForUpdate()->first();
        if ($usage && $usage->status === 'redeemed') $usage->update(['status' => 'refunded', 'refunded_at' => now()]);
    }

    /** A StoreOrder can only be paid while its coupon reservation is still live. */
    public function ensureReservationPayable(StoreOrder $storeOrder): void
    {
        $usage = CouponUsage::where('store_order_id', $storeOrder->id)->lockForUpdate()->first();
        if (! $usage) return;
        if ($usage->status === 'reserved' && $usage->expires_at?->isPast()) {
            $this->expireReservation($storeOrder);
        }
        if ($usage->fresh()->status !== 'reserved') {
            throw new CouponValidationException('coupon_reservation_expired', 'The coupon reservation has expired. Cancel this order and place a new checkout to recalculate totals.');
        }
    }

    /** Idempotently persist the expiration in a dedicated transaction if needed. */
    public function expireReservation(StoreOrder $storeOrder): bool
    {
        $usage = CouponUsage::where('store_order_id', $storeOrder->id)->lockForUpdate()->first();
        if (! $usage || $usage->status !== 'reserved' || ! $usage->expires_at?->isPast()) return false;
        $coupon = Coupon::withTrashed()->lockForUpdate()->find($usage->coupon_id);
        $usage->update(['status' => 'expired', 'released_at' => now()]);
        if ($coupon && $coupon->reserved_count > 0) $coupon->decrement('reserved_count');
        return true;
    }

    /** Returns cents to deduct only from this StoreOrder's shipping quote. */
    public function shippingDiscountForQuote(StoreOrder $storeOrder, int $deliveryFeeCents): int
    {
        $usage = CouponUsage::where('store_order_id', $storeOrder->id)->lockForUpdate()->first();
        if (! $usage || ! in_array($usage->status, ['reserved', 'redeemed'], true)) return 0;
        if (($usage->snapshot['discount_type'] ?? null) !== 'free_shipping') return 0;

        $discount = max(0, $deliveryFeeCents);
        $usage->update([
            'shipping_discount' => Money::decimal($discount),
            'snapshot' => array_merge($usage->snapshot ?? [], ['shipping_discount' => Money::decimal($discount)]),
        ]);

        return $discount;
    }

    public function releaseExpiredReservations(): int
    {
        $count = 0;
        CouponUsage::where('status', 'reserved')->where('expires_at', '<=', now())->orderBy('id')->chunkById(100, function ($usages) use (&$count) {
            foreach ($usages as $usage) {
                DB::transaction(function () use ($usage, &$count) {
                    $locked = CouponUsage::lockForUpdate()->find($usage->id);
                    if (! $locked || $locked->status !== 'reserved') return;
                    $coupon = Coupon::withTrashed()->lockForUpdate()->find($locked->coupon_id);
                    $locked->update(['status' => 'expired', 'released_at' => now()]);
                    if ($coupon && $coupon->reserved_count > 0) $coupon->decrement('reserved_count');
                    $count++;
                });
            }
        });

        return $count;
    }

    public function syncTargets(Coupon $coupon, array $data): void
    {
        $scope = $data['scope'] ?? $coupon->scope;
        if (! in_array($scope, Coupon::SCOPES, true)) throw new CouponValidationException('invalid_scope', 'Invalid coupon scope.');
        $productIds = collect($data['product_ids'] ?? [])->map(fn ($id) => (int) $id)->filter()->unique()->values();
        $categoryIds = collect($data['category_ids'] ?? [])->map(fn ($id) => (int) $id)->filter()->unique()->values();
        $variantIds = collect($data['variant_ids'] ?? [])->map(fn ($id) => (int) $id)->filter()->unique()->values();

        if ($scope === 'products' && $productIds->isEmpty()) throw new CouponValidationException('target_required', 'Select at least one eligible product.');
        if ($scope === 'categories' && $categoryIds->isEmpty()) throw new CouponValidationException('target_required', 'Select at least one eligible category.');
        if ($scope === 'variants' && $variantIds->isEmpty()) throw new CouponValidationException('target_required', 'Select at least one eligible variant.');

        if ($productIds->isNotEmpty() && Product::whereIn('id', $productIds)->where('store_id', $coupon->store_id)->count() !== $productIds->count()) {
            throw new CouponValidationException('invalid_target', 'A selected product does not belong to your store.');
        }
        if ($variantIds->isNotEmpty() && ProductVariant::whereIn('id', $variantIds)->whereHas('product', fn ($q) => $q->where('store_id', $coupon->store_id))->count() !== $variantIds->count()) {
            throw new CouponValidationException('invalid_target', 'A selected variant does not belong to your store.');
        }
        if ($categoryIds->contains(fn ($id) => ! Product::where('store_id', $coupon->store_id)
            ->where(fn ($query) => $query->where('category_id', $id)->orWhere('sub_category_id', $id))->exists())) {
            throw new CouponValidationException('invalid_target', 'A selected category does not belong to your store.');
        }

        $coupon->update(['scope' => $scope]);
        $coupon->products()->sync($scope === 'products' ? $productIds : []);
        $coupon->categories()->sync($scope === 'categories' ? $categoryIds : []);
        $coupon->variants()->sync($scope === 'variants' ? $variantIds : []);
    }

    public function publicCouponsForStore(int $storeId, ?User $buyer = null, ?Product $product = null): Collection
    {
        $coupons = Coupon::with(['store', 'products', 'categories', 'variants'])
            ->where('store_id', $storeId)->where('is_public', true)->get();

        return $coupons->filter(function (Coupon $coupon) use ($buyer, $product) {
            try {
                $this->assertCouponAvailable($coupon, $buyer?->id, false);
                if ($coupon->followers_only && ! $buyer) return false;
                if ($coupon->followers_only && ! DB::table('store_followers')->where('store_id', $coupon->store_id)->where('user_id', $buyer->id)->exists()) return false;
                return ! $product || $this->matchesProduct($coupon, $product, null);
            } catch (CouponValidationException) {
                return false;
            }
        })->values();
    }

    public function audit(Coupon $coupon, ?User $actor, string $action, ?array $before = null, ?array $after = null, array $context = []): void
    {
        CouponAudit::create(['coupon_id' => $coupon->id, 'store_id' => $coupon->store_id, 'actor_id' => $actor?->id,
            'action' => $action, 'before' => $before, 'after' => $after, 'context' => $context]);
    }

    public function getStoreCouponStats(int $storeId): array
    {
        $coupons = Coupon::withCount(['usages as redeemed_usages_count' => fn ($q) => $q->where('status', 'redeemed')])
            ->where('store_id', $storeId)->get();
        $ids = $coupons->pluck('id');
        $usages = CouponUsage::whereIn('coupon_id', $ids);
        // The revenue query joins store_orders, which has its own status column.
        // Qualifying this predicate keeps the Seller Coupons index query valid.
        $redeemed = (clone $usages)->where('coupon_usages.status', 'redeemed');
        $revenue = (clone $redeemed)->join('store_orders', 'coupon_usages.store_order_id', '=', 'store_orders.id')
            ->sum('store_orders.total');

        return [
            'total_coupons' => $coupons->count(),
            'active_coupons' => $coupons->filter->isAvailableNow()->count(),
            'redeemed_coupons' => (clone $redeemed)->count(),
            'reserved_coupons' => (clone $usages)->where('coupon_usages.status', 'reserved')->count(),
            'total_usages' => (clone $usages)->whereIn('coupon_usages.status', ['reserved', 'redeemed', 'refunded'])->count(),
            'total_discount_given' => (float) ((clone $usages)->whereIn('coupon_usages.status', ['redeemed', 'refunded'])->sum('discount_amount') + (clone $usages)->whereIn('coupon_usages.status', ['redeemed', 'refunded'])->sum('shipping_discount')),
            'revenue_generated' => (float) $revenue,
            'order_count' => (clone $redeemed)->whereNotNull('store_order_id')->count(),
            'conversion_count' => (clone $redeemed)->count(),
            'remaining_usage' => $coupons->sum(fn ($coupon) => $coupon->usage_limit ? max(0, $coupon->usage_limit - $coupon->usage_count - $coupon->reserved_count) : 0),
        ];
    }

    private function quoteCouponForStore(Coupon $coupon, Collection $items, User $buyer, bool $lock): array
    {
        $this->assertCouponAvailable($coupon, $buyer->id, $lock);
        $eligible = $items->filter(fn (CartItem $item) => $this->matchesProduct($coupon, $item->product, $item->variant_id));
        if ($eligible->isEmpty()) throw new CouponValidationException('product_not_eligible', 'No products from this store qualify for this coupon.');

        $eligibleSubtotal = $eligible->sum(fn (CartItem $item) => Money::cents($item->price) * (int) $item->quantity);
        if ($eligibleSubtotal < Money::cents($coupon->min_order_amount ?? 0)) {
            throw new CouponValidationException('minimum_eligible_amount_not_reached', 'Minimum eligible amount not reached.');
        }

        $discount = match ($coupon->discount_type) {
            'percentage' => (int) round($eligibleSubtotal * ((float) $coupon->discount_value / 100)),
            'fixed_amount' => min($eligibleSubtotal, Money::cents($coupon->discount_value)),
            'free_shipping' => 0,
            default => throw new CouponValidationException('unsupported_coupon_type', 'This coupon type is not supported.'),
        };
        $affected = $eligible->map(fn (CartItem $item) => [
            'cart_item_id' => $item->id, 'product_id' => $item->product_id, 'variant_id' => $item->variant_id,
            'quantity' => (int) $item->quantity, 'eligible_line_subtotal' => Money::decimal(Money::cents($item->price) * (int) $item->quantity),
        ])->values()->all();
        $snapshot = $this->snapshot($coupon, $eligibleSubtotal, $discount, $affected);

        return ['coupon_id' => $coupon->id, 'code' => $coupon->code, 'discount_cents' => $discount,
            'eligible_subtotal_cents' => $eligibleSubtotal, 'affected_items' => $affected, 'snapshot' => $snapshot];
    }

    private function matchesProduct(Coupon $coupon, Product $product, ?int $variantId): bool
    {
        if ((int) $coupon->store_id !== (int) $product->store_id) return false;
        return match ($coupon->scope ?: $coupon->applicable_to ?: 'store') {
            'store' => true,
            'products' => $coupon->products->contains('id', $product->id),
            'categories' => $coupon->categories->contains(fn ($category) => in_array((int) $category->id, [(int) $product->category_id, (int) $product->sub_category_id], true)),
            'variants' => $variantId && $coupon->variants->contains('id', $variantId),
            default => false,
        };
    }

    private function assertCouponAvailable(Coupon $coupon, ?int $buyerId, bool $lock): void
    {
        if (! in_array($coupon->discount_type, Coupon::TYPES, true)) throw new CouponValidationException('unsupported_coupon_type', 'This coupon type is not supported.');
        if (! $coupon->store || ! $coupon->store->is_active || $coupon->store->status !== 'active') throw new CouponValidationException('seller_store_inactive', 'Seller/store is inactive.');
        if ($coupon->admin_disabled_at) throw new CouponValidationException('inactive', 'Coupon has been disabled.');
        if ($coupon->archived_at || $coupon->trashed()) throw new CouponValidationException('inactive', 'Coupon is inactive.');
        if ($coupon->ends_at?->isPast()) throw new CouponValidationException('expired', 'Coupon has expired.');
        if ($coupon->starts_at?->isFuture()) throw new CouponValidationException('scheduled', 'Coupon is not active yet.');
        if (! $coupon->is_active || in_array($coupon->status, ['paused', 'inactive', 'archived'], true)) throw new CouponValidationException('inactive', 'Coupon is inactive.');
        if ($buyerId) {
            if ($coupon->followers_only && ! DB::table('store_followers')->where('store_id', $coupon->store_id)->where('user_id', $buyerId)->exists()) throw new CouponValidationException('buyer_not_eligible', 'This coupon is available to store followers only.');
            if ($coupon->first_order_only && StoreOrder::whereHas('order', fn ($query) => $query->where('user_id', $buyerId))
                ->where('payment_status', 'paid')->exists()) throw new CouponValidationException('buyer_not_eligible', 'This coupon is for first-time buyers only.');
            $this->assertUsageLimits($coupon, $buyerId, $lock);
        }
    }

    private function assertUsageLimits(Coupon $coupon, int $buyerId, bool $lock): void
    {
        $active = CouponUsage::where('coupon_id', $coupon->id)->whereIn('status', ['reserved', 'redeemed']);
        if ($lock) $active->lockForUpdate();
        if ($coupon->usage_limit && $active->count() >= $coupon->usage_limit) throw new CouponValidationException('usage_limit_reached', 'Coupon usage limit reached.');
        if ($coupon->usage_per_user) {
            $byBuyer = CouponUsage::where('coupon_id', $coupon->id)->where('user_id', $buyerId)->whereIn('status', ['reserved', 'redeemed']);
            if ($lock) $byBuyer->lockForUpdate();
            if ($byBuyer->count() >= $coupon->usage_per_user) throw new CouponValidationException('buyer_usage_limit_reached', 'Buyer usage limit reached.');
        }
    }

    private function loadRequestedCoupons(array $codes, bool $lock): array
    {
        if ($codes === []) return [];
        $query = Coupon::with(['store', 'products', 'categories', 'variants'])->whereIn(DB::raw('UPPER(code)'), array_values($codes))->orderBy('id');
        if ($lock) $query->lockForUpdate();
        return $query->get()->keyBy(fn (Coupon $coupon) => strtoupper($coupon->code))->all();
    }

    private function normaliseRequestedCodes(array $codes): array
    {
        $result = [];
        foreach ($codes as $storeId => $code) {
            if (! is_string($code) || trim($code) === '') continue;
            $key = is_numeric($storeId) ? (int) $storeId : 'code:'.strtoupper(trim($code));
            $result[$key] = strtoupper(trim($code));
        }
        return $result;
    }

    private function snapshot(Coupon $coupon, int $eligibleSubtotal, int $discount, array $affected): array
    {
        return [
            'coupon_id' => $coupon->id, 'code' => $coupon->code, 'store_id' => $coupon->store_id,
            'discount_type' => $coupon->discount_type, 'discount_value' => (float) $coupon->discount_value,
            'scope' => $coupon->scope, 'eligible_subtotal' => Money::decimal($eligibleSubtotal),
            'discount_amount' => Money::decimal($discount), 'shipping_discount' => Money::decimal(0),
            'product_ids' => $coupon->products->pluck('id')->values()->all(),
            'category_ids' => $coupon->categories->pluck('id')->values()->all(),
            'variant_ids' => $coupon->variants->pluck('id')->values()->all(),
            'rules' => ['minimum_eligible_subtotal' => $coupon->min_order_amount, 'usage_limit' => $coupon->usage_limit,
                'per_buyer_limit' => $coupon->usage_per_user, 'followers_only' => $coupon->followers_only,
                'first_order_only' => $coupon->first_order_only, 'starts_at' => $coupon->starts_at?->toISOString(), 'ends_at' => $coupon->ends_at?->toISOString()],
            'affected_items' => $affected, 'calculated_at' => now()->toISOString(),
        ];
    }

    private function publicQuote(array $quote): array
    {
        return ['id' => $quote['coupon_id'], 'code' => $quote['code'], 'eligible_subtotal' => Money::decimal($quote['eligible_subtotal_cents']),
            'discount_amount' => Money::decimal($quote['discount_cents']), 'snapshot' => $quote['snapshot'], 'affected_items' => $quote['affected_items']];
    }
}

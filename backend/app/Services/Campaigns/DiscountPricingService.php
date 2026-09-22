<?php

namespace App\Services\Campaigns;

use App\Models\{Product, Cart, DiscountCampaign, DiscountCampaignUsage, Order};
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class DiscountPricingService
{
    public function __construct(
        private ConfigurationPriceService $base,
        private CommerceCampaignLifecycleService $lifecycle,
    ) {}

    public function matches(DiscountCampaign $c, Product $p, array $selection): bool
    {
        if ((int) $c->store_id !== (int) $p->store_id) { return false; }
        return match ($c->scope) {
            'store' => true,
            'products' => $c->products->contains('id', $p->id),
            'categories' => $c->categories->contains(fn ($category) => in_array($category->id, [$p->category_id, $p->sub_category_id])),
            'variants' => $c->variants->contains(fn ($v) => (int) $v->product_id === (int) $p->id && (int) ($selection[$v->variant_type] ?? 0) === (int) $v->variant_id),
            default => false,
        };
    }

    /** Minimums apply to the eligible store lines, before coupon calculation. */
    public function quote(array $lines, ?int $buyerId = null, bool $lock = false, bool $refreshLifecycle = true): array
    {
        if ($lines === []) {
            return [];
        }

        $storeIds = array_values(array_unique(array_map(fn ($l) => (int) $l['product']->store_id, $lines)));
        foreach ($lines as $line) {
            $line['product']->loadMissing('store');
        }

        $now = now('UTC')->toImmutable();
        if ($refreshLifecycle) {
            $this->lifecycle->refreshForStores($storeIds, $now);
        }

        $q = DiscountCampaign::with(['products', 'categories', 'variants'])->whereIn('store_id', $storeIds)
            ->where('status', 'active')->whereNull('review_reason')
            ->where('starts_at', '<=', $now)->where('ends_at', '>', $now)->orderBy('id');
        if ($lock) { $q->lockForUpdate(); }
        $campaigns = $q->get()->filter(function ($c) use ($buyerId, $lock) {
            if ($c->usage_limit && $c->usage_count >= $c->usage_limit) { return false; }
            if (!$c->per_buyer_limit) { return true; }
            if (!$buyerId) { return false; }
            $usages = $c->usages()->where('user_id', $buyerId);
            // A locking read sees committed usage after waiting, even under REPEATABLE READ.
            if ($lock) { $usages->lockForUpdate(); }
            return $usages->get(['id'])->count() < $c->per_buyer_limit;
        });
        $result = []; $eligible = [];
        foreach ($lines as $key => $line) {
            $p = $line['product']; $selection = $line['selection'] ?? []; $qty = max(1, (int) ($line['quantity'] ?? 1));
            $original = $this->base->cents($p, $selection);
            $result[$key] = ['original_cents' => $original, 'final_line_cents' => $original * $qty, 'quantity' => $qty, 'campaigns' => []];
            foreach ($campaigns as $c) {
                if (!$p->is_active || !$p->is_approved || $p->is_muted || !$p->store?->is_active || $p->store->status !== 'active') { continue; }
                if ($this->matches($c, $p, $selection)) { $eligible[$c->id][] = $key; }
            }
        }
        $campaigns = $campaigns->filter(function ($c) use ($eligible, $result) {
            $keys = $eligible[$c->id] ?? [];
            $amount = array_sum(array_map(fn ($k) => $result[$k]['final_line_cents'], $keys));
            $qty = array_sum(array_map(fn ($k) => $result[$k]['quantity'], $keys));
            return $amount >= (int) round((float) $c->minimum_order_amount * 100) && $qty >= $c->minimum_quantity;
        });
        foreach ($result as $key => &$r) {
            $remaining = $campaigns->filter(fn ($c) => in_array($key, $eligible[$c->id] ?? [], true));
            while ($remaining->isNotEmpty()) {
                $ranked = $remaining->map(function ($c) use ($r) {
                    $discount = $c->discount_type === 'percentage'
                        ? (int) round($r['final_line_cents'] * (float) $c->discount_value / 100)
                        : (int) round((float) $c->discount_value * 100) * $r['quantity'];
                    // Unit prices must be representable in cents, matching existing checkout arithmetic.
                    $discount = intdiv(min($discount, $r['final_line_cents']), $r['quantity']) * $r['quantity'];
                    return ['campaign' => $c, 'discount' => $discount];
                })->filter(fn ($x) => $x['discount'] > 0)->sort(function ($a, $b) {
                    return ($b['campaign']->priority <=> $a['campaign']->priority) ?: ($b['discount'] <=> $a['discount']) ?: ($a['campaign']->id <=> $b['campaign']->id);
                });
                if ($ranked->isEmpty()) { break; }
                $winner = $ranked->first(); $c = $winner['campaign']; $discount = $winner['discount'];
                $r['final_line_cents'] -= $discount;
                // The end instant travels with every calculated price.  Buyers use this
                // canonical UTC value for the promotion countdown; it is never derived
                // from a product's (potentially stale) display price.
                $r['campaigns'][] = [
                    'id' => $c->id,
                    'name' => $c->name,
                    'discount_amount' => $discount / 100,
                    'ends_at' => $c->ends_at->utc()->toISOString(),
                ];
                if (!$c->stacking) { break; }
                $remaining = $remaining->filter(fn ($other) => $other->id !== $c->id && $other->stacking);
            }
            $r['original_price'] = $r['original_cents'] / 100;
            $r['discounted_price'] = $r['final_line_cents'] / $r['quantity'] / 100;
            $r['discount_amount'] = round($r['original_price'] - $r['discounted_price'], 2);
            $r['discount_percentage'] = $r['original_cents'] > 0 ? round(100 * $r['discount_amount'] / $r['original_price'], 2) : 0;
            $r['campaign_id'] = $r['campaigns'][0]['id'] ?? null; $r['campaign_name'] = $r['campaigns'][0]['name'] ?? null;
            $r['applied_campaign'] = $r['campaigns'][0] ?? null;
        }
        unset($r);
        return $result;
    }

    public function repriceCart(Cart $cart, bool $lock = false): void
    {
        $items = $cart->items()->with(['product.store'])->orderBy('id')->get();
        $lines = [];
        foreach ($items as $item) {
            if (!$item->product || !$item->product->is_active || !$item->product->is_approved || $item->product->is_muted
                || !$item->product->store?->is_active || $item->product->store->status !== 'active') {
                throw ValidationException::withMessages(['cart' => 'A product in your cart is no longer available.']);
            }
            $lines[$item->id] = ['product' => $item->product, 'quantity' => $item->quantity, 'selection' => $item->toArray()];
        }
        $quotes = $this->quote($lines, $cart->user_id, $lock);
        foreach ($items as $item) {
            $price = $quotes[$item->id];
            $item->forceFill(['price' => $price['discounted_price'], 'original_price' => $price['original_price'],
                'campaign_discount_amount' => $price['discount_amount'], 'campaign_pricing' => $price])->save();
        }
        $cart->unsetRelation('items'); $cart->load('items.product', 'items.store', 'items.variant', 'items.frameSize');
    }

    /** Called in the same transaction as locked repricing and order creation. */
    public function recordUsage(Order $order): void
    {
        $groups = [];
        foreach ($order->storeOrders()->with('items')->get() as $storeOrder) {
            foreach ($storeOrder->items as $item) {
                foreach ($item->campaign_pricing['campaigns'] ?? [] as $c) {
                    $groups[$c['id']] ??= ['units' => 0, 'revenue' => 0, 'discount_amount' => 0];
                    $groups[$c['id']]['units'] += $item->quantity;
                    $groups[$c['id']]['revenue'] += (float) $item->line_total;
                    $groups[$c['id']]['discount_amount'] += $c['discount_amount'];
                }
            }
        }
        ksort($groups);
        foreach ($groups as $id => $metrics) {
            $c = DiscountCampaign::lockForUpdate()->findOrFail($id);
            if ($c->usages()->where('order_id', $order->id)->lockForUpdate()->first()) { continue; }
            if (($c->usage_limit && $c->usage_count >= $c->usage_limit)
                || ($c->per_buyer_limit && $c->usages()->where('user_id', $order->user_id)->lockForUpdate()->get(['id'])->count() >= $c->per_buyer_limit)) {
                throw ValidationException::withMessages(['campaign' => 'Campaign usage limit reached. Please refresh checkout.']);
            }
            $c->usages()->create($metrics + ['order_id' => $order->id, 'user_id' => $order->user_id]);
            $c->increment('usage_count');
        }
    }

    public function product(Product $product, ?int $buyerId = null): array
    {
        $data = $product->toArray();
        $quote = $this->quote([['product' => $product]], $buyerId)[0];
        $data['pricing'] = $quote; $data['price'] = $quote['discounted_price'];
        if ($quote['discount_amount'] > 0) { $data['compare_at_price'] = $quote['original_price']; }
        foreach (['variants' => 'variant_id', 'frame_sizes' => 'frame_size_id', 'size_volume_variants' => 'product_size_volume_id', 'eye_hygiene_variants' => 'eye_hygiene_variant_id'] as $relation => $key) {
            foreach ($data[$relation] ?? [] as $i => $variant) {
                if (isset($variant['is_active']) && !$variant['is_active']) { unset($data[$relation][$i]); continue; }
                $selection = [$key => $variant['id']];
                if ($key === 'frame_size_id') { $selection['variant_id'] = $variant['product_variant_id']; }
                $q = $this->quote([['product' => $product, 'selection' => $selection]], $buyerId, false, false)[0];
                $data[$relation][$i]['pricing'] = $q; $data[$relation][$i]['price'] = $q['discounted_price'];
            }
            if (isset($data[$relation])) { $data[$relation] = array_values($data[$relation]); }
        }
        foreach ($data['contact_lens_unit_config']['packs'] ?? [] as $i => $pack) {
            $q = $this->quote([['product' => $product, 'selection' => ['contact_lens_pack_quantity' => $pack['quantity']]]], $buyerId, false, false)[0];
            $data['contact_lens_unit_config']['packs'][$i]['price'] = $q['discounted_price'];
            $data['contact_lens_unit_config']['packs'][$i]['pricing'] = $q;
        }
        return $data;
    }
}

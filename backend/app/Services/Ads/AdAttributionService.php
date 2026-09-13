<?php

namespace App\Services\Ads;

use App\Models\AdCampaign;
use App\Models\AdEvent;
use App\Models\StoreOrder;
use Illuminate\Support\Facades\DB;

class AdAttributionService
{
    public function attribute(int $storeOrderId): void
    {
        DB::transaction(function () use ($storeOrderId) {
            $order = StoreOrder::with('order', 'items', 'escrow')->whereKey($storeOrderId)->lockForUpdate()->first();
            if (! $order || ! $order->paid_at || ! $order->escrow) {
                return;
            }
            $reversed = in_array($order->status, ['cancelled', 'rejected']) || $order->escrow->status === 'refunded';
            if (! $reversed && ! in_array($order->status, ['paid', 'processing', 'out_for_delivery', 'delivered'])) {
                return;
            }
            foreach ($order->items as $item) {
                $key = hash('sha256', 'conversion:'.$item->id);
                $existing = AdEvent::where('event_key', $key)->first();
                if ($reversed) {
                    if ($existing) {
                        $this->reverse($existing);
                    }

                    continue;
                }
                if ($existing) {
                    continue;
                }
                $userId = $order->order->user_id;
                // Authenticated click, or a guest click later linked by a token-verified
                // product view / cart event after login. Never attribute by IP alone.
                $linked = AdEvent::where('user_id', $userId)->whereIn('type', ['product_view', 'add_to_cart'])
                    ->where('occurred_at', '<=', $order->paid_at)->select('delivery_id');
                $click = AdEvent::where('type', 'click')
                    ->whereHas('campaign', fn ($c) => $c->where('product_id', $item->product_id)->where('seller_id', '!=', $userId))
                    ->where(fn ($q) => $q->where('user_id', $userId)->orWhereIn('delivery_id', $linked))
                    ->whereBetween('occurred_at', [$order->paid_at->copy()->subDays(config('ads.attribution_days')), $order->paid_at])
                    ->latest('occurred_at')->latest('id')->first();
                if (! $click) {
                    continue;
                }
                $c = AdCampaign::whereKey($click->ad_campaign_id)->lockForUpdate()->firstOrFail();
                $revenue = AdMoney::cents($item->line_total);
                AdEvent::create(['ad_campaign_id' => $c->id, 'type' => 'conversion', 'event_key' => $key,
                    'delivery_id' => $click->delivery_id, 'visitor_hash' => $click->visitor_hash, 'user_id' => $userId,
                    'placement' => $click->placement, 'location' => $click->location, 'order_item_id' => $item->id,
                    'revenue_cents' => $revenue, 'occurred_at' => $order->paid_at]);
                $c->conversions += 1;
                $c->revenue_cents += $revenue;
                $c->save();
            }
        }, 3);
    }

    private function reverse(AdEvent $conversion): void
    {
        $key = hash('sha256', 'conversion_reversal:'.$conversion->order_item_id);
        $c = AdCampaign::whereKey($conversion->ad_campaign_id)->lockForUpdate()->firstOrFail();
        if (AdEvent::where('event_key', $key)->exists()) {
            return;
        }
        AdEvent::create(array_merge($conversion->only(['ad_campaign_id', 'delivery_id', 'visitor_hash', 'user_id', 'placement', 'location', 'order_item_id']),
            ['type' => 'conversion_reversal', 'event_key' => $key, 'revenue_cents' => -$conversion->revenue_cents, 'occurred_at' => now()]));
        $c->conversions -= 1;
        $c->revenue_cents -= $conversion->revenue_cents;
        $c->save();
    }
}

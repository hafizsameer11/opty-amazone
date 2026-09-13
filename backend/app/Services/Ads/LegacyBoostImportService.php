<?php

namespace App\Services\Ads;

use App\Models\AdCampaign;
use App\Models\Product;
use Illuminate\Support\Facades\DB;

class LegacyBoostImportService
{
    public function import(int $productId): ?AdCampaign
    {
        return DB::transaction(function () use ($productId) {
            $p = Product::withTrashed()->whereKey($productId)->lockForUpdate()->firstOrFail();
            $existing = AdCampaign::where('legacy_product_id', $p->id)->first();
            if ($existing) {
                return $existing;
            }
            $store = $p->store()->withTrashed()->first();
            if (! $store) {
                return null;
            }
            $snapshot = $p->only(['is_boosted', 'boosted_at', 'boost_location', 'boost_budget', 'boost_start_at', 'boost_end_at', 'boost_payment_status']);
            // Legacy code had no verifiable payment reference, no spend ledger, and an
            // unauthenticated payment-confirmation stub. Preserve ALL flags without charging,
            // delivering or refunding any claimed historic balance.
            $budget = max(0, (int) round((float) $p->boost_budget * 100));
            $c = AdCampaign::create([
                'seller_id' => $store->user_id, 'product_id' => $p->id, 'name' => 'Legacy boost: '.mb_substr($p->name, 0, 100),
                'status' => 'legacy_review', 'payment_status' => 'unverified', 'payment_method' => 'legacy_unknown',
                'starts_at' => $p->boost_start_at ?? $p->boosted_at ?? now(), 'ends_at' => $p->boost_end_at ?? now(),
                'budget_type' => 'total', 'budget_amount_cents' => $budget, 'budget_cents' => $budget, 'bid_cents' => 1,
                'locations' => [], 'placements' => [], 'legacy_product_id' => $p->id, 'legacy_snapshot' => $snapshot,
                'idempotency_key' => 'legacy:'.$p->id, 'request_hash' => hash('sha256', json_encode($snapshot)),
            ]);
            app(AdCampaignService::class)->audit($c, 'legacy_imported', null, null,
                'Historic payment, targeting, bid and unused balance require evidence. No funds moved.', $snapshot);

            return $c;
        }, 3);
    }
}

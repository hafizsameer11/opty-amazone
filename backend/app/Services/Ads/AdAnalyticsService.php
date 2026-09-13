<?php

namespace App\Services\Ads;

use App\Models\AdCampaign;
use App\Models\AdDailyMetric;
use Illuminate\Support\Facades\DB;

class AdAnalyticsService
{
    public function summary(AdCampaign $c): array
    {
        return array_merge($c->toArray(), $this->ratios($c->toArray()));
    }

    public function ratios(array $m): array
    {
        $clicks = (int) ($m['clicks'] ?? 0);
        $impressions = (int) ($m['impressions'] ?? 0);
        $spent = (int) ($m['spent_cents'] ?? 0);
        $conversions = (int) ($m['conversions'] ?? 0);

        return ['ctr' => $impressions ? round(100 * $clicks / $impressions, 2) : 0,
            'average_cpc_cents' => $clicks ? round($spent / $clicks, 2) : 0,
            'conversion_rate' => $clicks ? round(100 * $conversions / $clicks, 2) : 0,
            'roas' => $spent ? round(($m['revenue_cents'] ?? 0) / $spent, 2) : 0];
    }

    public function aggregate(int $id): void
    {
        DB::transaction(function () use ($id) {
            $c = AdCampaign::whereKey($id)->lockForUpdate()->firstOrFail();
            $groups = $this->grouped($c, 'DATE(occurred_at) as day, placement, location', ['day', 'placement', 'location']);
            foreach ($groups as $row) {
                AdDailyMetric::updateOrCreate(['ad_campaign_id' => $id, 'day' => $row['day'],
                    'placement' => $row['placement'], 'location' => $row['location']], $row);
            }
            $totals = $this->grouped($c, 'ad_campaign_id', ['ad_campaign_id'])->first();
            if ($totals) {
                unset($totals['ad_campaign_id'], $totals['spent_cents']);
                $c->fill($totals)->save(); // Financial balances are reconciled against the ledger separately.
            }
        }, 3);
    }

    private function grouped(AdCampaign $c, string $select, array $groups)
    {
        return $c->events()->selectRaw($select)
            ->selectRaw("SUM(CASE WHEN type = 'impression' THEN 1 ELSE 0 END) as impressions,
                SUM(CASE WHEN type = 'impression' AND is_unique = 1 THEN 1 ELSE 0 END) as unique_impressions,
                SUM(CASE WHEN type = 'click' THEN 1 ELSE 0 END) as clicks,
                SUM(CASE WHEN type = 'product_view' THEN 1 ELSE 0 END) as product_views,
                SUM(CASE WHEN type = 'add_to_cart' THEN 1 ELSE 0 END) as add_to_carts,
                SUM(CASE WHEN type = 'conversion' THEN 1 WHEN type = 'conversion_reversal' THEN -1 ELSE 0 END) as conversions,
                SUM(cost_cents) as spent_cents, SUM(revenue_cents) as revenue_cents")
            ->groupBy($groups)->get()->map(fn ($row) => $row->getAttributes());
    }

    public function report(AdCampaign $c): array
    {
        $c->loadMissing('product', 'seller:id,name');
        // Query authoritative events: details do not depend on queue latency.
        $totals = $this->grouped($c, 'ad_campaign_id', ['ad_campaign_id'])->first() ?? [];

        return ['summary' => array_merge($this->summary($c), $totals, $this->ratios($totals)),
            'daily' => $this->grouped($c, 'DATE(occurred_at) as day', ['day'])->sortBy('day')->values(),
            'placements' => $this->grouped($c, 'placement', ['placement']),
            'locations' => $this->grouped($c, 'location', ['location']),
            'attribution_window_days' => config('ads.attribution_days')];
    }
}

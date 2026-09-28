<?php

namespace App\Http\Controllers\Api\Crm;

use App\Helpers\ResponseHelper;
use App\Models\AdCampaign;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Read-only boost-ad performance for the CRM.
 *
 * The ads subsystem is the one place in the platform that stores money as
 * integer *cents* rather than decimal euros. Every figure below is converted
 * to EUR at this boundary so the CRM receives a single consistent unit.
 */
class CrmAdsController extends CrmController
{
    /** Every value the `status` enum can hold. */
    private const STATUSES = [
        'pending_payment', 'payment_failed', 'pending_review', 'scheduled', 'active',
        'paused', 'completed', 'exhausted', 'cancelled', 'rejected', 'terminated',
        'invalid', 'legacy_review', 'reconciliation_hold',
    ];

    private const PAYMENT_STATUSES = ['unpaid', 'failed', 'reserved', 'released', 'unverified'];

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'search' => 'nullable|string|max:120',
            'status' => 'nullable|string|max:40',
            'payment_status' => 'nullable|string|max:40',
            'seller_id' => 'nullable|integer',
        ]);

        // Ads are scheduled, so the optional window applies to starts_at
        // (matching the Admin Panel's ad-campaigns filter semantics).
        $window = $this->validateWindow($request);
        $paging = $this->validatePagination($request);

        $query = AdCampaign::query()
            ->with(['seller:id,name,email', 'product:id,name,sku,price'])
            ->when($filters['search'] ?? null, function ($q, $search) {
                $q->where('name', 'like', "%{$search}%");
            })
            ->when($filters['status'] ?? null, fn ($q, $status) => $q->where('status', $status))
            ->when($filters['payment_status'] ?? null, fn ($q, $status) => $q->where('payment_status', $status))
            ->when($filters['seller_id'] ?? null, fn ($q, $id) => $q->where('seller_id', $id));

        $this->applyWindow($query, $window['from'], $window['to'], 'starts_at');

        $paginator = $query->orderByDesc('created_at')
            ->paginate($paging['per_page'], ['*'], 'page', $paging['page']);

        $rows = collect($paginator->items())->map(fn (AdCampaign $campaign) => [
            'id' => (int) $campaign->id,
            'name' => (string) $campaign->name,
            'status' => (string) $campaign->status,
            'payment_status' => (string) $campaign->payment_status,
            'seller' => $campaign->seller ? [
                'id' => (int) $campaign->seller->id,
                'name' => (string) $campaign->seller->name,
                'email' => (string) $campaign->seller->email,
            ] : null,
            'product' => $campaign->product ? [
                'id' => (int) $campaign->product->id,
                'name' => (string) $campaign->product->name,
                'sku' => (string) $campaign->product->sku,
            ] : null,
            'budget' => round((float) $campaign->budget_cents / 100, 2),
            'spent' => round((float) $campaign->spent_cents / 100, 2),
            'remaining' => round((float) $campaign->remaining_cents / 100, 2),
            'attributed_revenue' => round((float) $campaign->revenue_cents / 100, 2),
            'currency' => 'EUR',
            'impressions' => (int) $campaign->impressions,
            'clicks' => (int) $campaign->clicks,
            'product_views' => (int) $campaign->product_views,
            'conversions' => (int) $campaign->conversions,
            'ctr' => $campaign->impressions > 0
                ? round((float) $campaign->clicks / (float) $campaign->impressions * 100, 2)
                : 0.0,
            'roas' => $campaign->spent_cents > 0
                ? round((float) $campaign->revenue_cents / (float) $campaign->spent_cents, 2)
                : 0.0,
            'locations' => $campaign->locations,
            'placements' => $campaign->placements,
            'starts_at' => $campaign->starts_at?->toISOString(),
            'ends_at' => $campaign->ends_at?->toISOString(),
        ])->values();

        return $this->paginated(
            $paginator->setCollection($rows),
            ['summary' => $this->summary()],
            [
                'statuses' => self::STATUSES,
                'payment_statuses' => self::PAYMENT_STATUSES,
            ]
        );
    }

    /** @return array<string, float|int|string> */
    private function summary(): array
    {
        $row = AdCampaign::query()
            ->selectRaw('COUNT(*) as campaigns')
            ->selectRaw('COALESCE(SUM(budget_cents), 0) as budget_cents')
            ->selectRaw('COALESCE(SUM(spent_cents), 0) as spent_cents')
            ->selectRaw('COALESCE(SUM(revenue_cents), 0) as revenue_cents')
            ->selectRaw('COALESCE(SUM(impressions), 0) as impressions')
            ->selectRaw('COALESCE(SUM(clicks), 0) as clicks')
            ->selectRaw('COALESCE(SUM(product_views), 0) as product_views')
            ->selectRaw('COALESCE(SUM(add_to_carts), 0) as add_to_carts')
            ->selectRaw('COALESCE(SUM(conversions), 0) as conversions')
            ->first();

        $budget = (float) $row->budget_cents;
        $spent = (float) $row->spent_cents;
        $revenue = (float) $row->revenue_cents;
        $clicks = (int) $row->clicks;
        $conversions = (int) $row->conversions;

        return [
            'campaigns' => (int) $row->campaigns,
            'active' => (int) AdCampaign::where('status', 'active')->count(),
            'paused' => (int) AdCampaign::where('status', 'paused')->count(),
            'pending_review' => (int) AdCampaign::where('status', 'pending_review')->count(),
            'total_budget' => round($budget / 100, 2),
            'total_spent' => round($spent / 100, 2),
            'total_remaining' => round(($budget - $spent) / 100, 2),
            'attributed_revenue' => round($revenue / 100, 2),
            'impressions' => (int) $row->impressions,
            'clicks' => $clicks,
            'ctr' => (int) $row->impressions > 0 ? round($clicks / (int) $row->impressions * 100, 2) : 0.0,
            'average_cpc' => $clicks > 0 ? round($spent / $clicks / 100, 2) : 0.0,
            'product_views' => (int) $row->product_views,
            'add_to_carts' => (int) $row->add_to_carts,
            'conversions' => $conversions,
            'conversion_rate' => $clicks > 0 ? round($conversions / $clicks * 100, 2) : 0.0,
            'roas' => $spent > 0 ? round($revenue / $spent, 2) : 0.0,
            'currency' => 'EUR',
        ];
    }
}

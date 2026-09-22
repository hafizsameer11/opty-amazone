<?php

namespace App\Services\Campaigns;

use App\Models\{BannerCampaign, DiscountCampaign, Product};
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

/**
 * Maintains the authoritative lifecycle state for scheduled commerce campaigns.
 *
 * Campaign timestamps are stored as UTC instants.  The seller's IANA timezone is
 * retained only for editing and display, so lifecycle decisions are identical on
 * every server and for every buyer.
 */
class CommerceCampaignLifecycleService
{
    /**
     * Refresh all due campaigns, or only campaigns for the supplied stores.
     *
     * The scheduler invokes this for the platform. Buyer-facing pricing and
     * banner delivery invoke the scoped form as a safety net, so a campaign can
     * never stay displayed or priced beyond its end instant when a scheduler
     * worker is briefly unavailable.
     */
    public function refreshDue(?array $storeIds = null, ?CarbonImmutable $now = null): int
    {
        $now ??= now('UTC')->toImmutable();
        $storeIds = $storeIds === null
            ? null
            : array_values(array_unique(array_filter(array_map('intval', $storeIds))));

        if ($storeIds !== null && $storeIds === []) {
            return 0;
        }

        $changes = 0;

        foreach ([DiscountCampaign::class, BannerCampaign::class] as $model) {
            $query = $model::query()
                ->whereIn('status', ['scheduled', 'active', 'paused'])
                ->with($model === DiscountCampaign::class
                    ? ['store', 'products', 'categories', 'variants']
                    : ['store', 'creatives']);

            if ($storeIds !== null) {
                $query->whereIn('store_id', $storeIds);
            }

            $query->chunkById(100, function ($rows) use (&$changes, $model, $now): void {
                foreach ($rows as $row) {
                    $changed = DB::transaction(function () use ($row, $model, $now): bool {
                        $campaign = $model::query()
                            ->with($model === DiscountCampaign::class
                                ? ['store', 'products', 'categories', 'variants']
                                : ['store', 'creatives'])
                            ->lockForUpdate()
                            ->find($row->id);

                        if (!$campaign || !in_array($campaign->status, ['scheduled', 'active', 'paused'], true)) {
                            return false;
                        }

                        $before = $campaign->status;

                        if ($campaign->ends_at->lte($now)) {
                            $campaign->status = 'expired';
                        } elseif ($campaign instanceof DiscountCampaign
                            && $campaign->usage_limit
                            && $campaign->usage_count >= $campaign->usage_limit) {
                            $campaign->status = 'completed';
                        } elseif ($campaign->status !== 'paused' && $campaign->starts_at->gt($now)) {
                            // A timestamp is the source of truth. This also repairs
                            // old rows that were marked active before their start.
                            $campaign->status = 'scheduled';
                        } elseif ($campaign->status !== 'paused') {
                            $valid = $campaign->store?->is_active && $campaign->store->status === 'active';

                            if ($campaign instanceof DiscountCampaign) {
                                $products = Product::query()
                                    ->where('store_id', $campaign->store_id)
                                    ->visibleToBuyers()
                                    ->get();

                                $valid = $valid && !$campaign->review_reason && $products->contains(
                                    fn (Product $product) => $this->matchesEligibleProduct($campaign, $product)
                                );
                            } else {
                                $valid = $valid
                                    && app(BannerDestinationService::class)->resolve($campaign, true)
                                    && $campaign->creatives()->where('is_active', true)->exists();
                            }

                            if (!$valid) {
                                $campaign->status = 'paused';
                            } elseif ($campaign instanceof DiscountCampaign || $campaign->approval_status === 'approved') {
                                $campaign->status = 'active';
                            }
                        }

                        if ($campaign->status === $before) {
                            return false;
                        }

                        $campaign->save();
                        CampaignAudit::record($campaign, 'scheduler_'.$campaign->status);

                        return true;
                    });

                    if ($changed) {
                        $changes++;
                    }
                }
            });
        }

        return $changes;
    }

    public function refreshForStores(array $storeIds, ?CarbonImmutable $now = null): int
    {
        return $this->refreshDue($storeIds, $now);
    }

    private function matchesEligibleProduct(DiscountCampaign $campaign, Product $product): bool
    {
        if ($campaign->scope !== 'variants') {
            return app(DiscountPricingService::class)->matches($campaign, $product, []);
        }

        return $campaign->variants
            ->where('product_id', $product->id)
            ->contains(function ($variant) use ($product): bool {
                $class = ConfigurationPriceService::VARIANTS[$variant->variant_type] ?? null;

                return $class !== null
                    && ($selected = $class::where('product_id', $product->id)->find($variant->variant_id))
                    && ($selected->is_active ?? true);
            });
    }
}

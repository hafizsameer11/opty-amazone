<?php

namespace App\Jobs;

use App\Models\{DiscountCampaign, BannerCampaign, Product};
use App\Services\Campaigns\{CampaignAudit, DiscountPricingService, BannerDestinationService};
use Illuminate\Support\Facades\DB;

class RefreshCommerceCampaigns
{
    public function handle(): void
    {
        $now = now('UTC');
        foreach ([DiscountCampaign::class,BannerCampaign::class] as $model) {
            $model::whereIn('status',['scheduled','active','paused'])->chunkById(100,function ($rows) use ($model, $now) {
                foreach ($rows as $row) {
                    DB::transaction(function () use ($row,$model,$now) {
                        $c=$model::lockForUpdate()->find($row->id); $before=$c->status;
                        if ($c->ends_at->lte($now)) { $c->status='expired'; }
                        elseif ($c instanceof DiscountCampaign && $c->usage_limit && $c->usage_count >= $c->usage_limit) { $c->status='completed'; }
                        elseif ($c->status!=='paused') {
                            $valid=$c->store?->is_active && $c->store->status==='active';
                            if ($c instanceof DiscountCampaign) {
                                $products=Product::where('store_id',$c->store_id)->visibleToBuyers()->get();
                                $valid=$valid && !$c->review_reason && $products->contains(function ($p) use ($c) {
                                    if ($c->scope==='variants') {
                                        return $c->variants->where('product_id',$p->id)->contains(function ($v) use ($p) {
                                            $class=\App\Services\Campaigns\ConfigurationPriceService::VARIANTS[$v->variant_type];
                                            $variant=$class::where('product_id',$p->id)->find($v->variant_id);
                                            return $variant && ($variant->is_active ?? true);
                                        });
                                    }
                                    return app(DiscountPricingService::class)->matches($c,$p,[]);
                                });
                            } else { $valid=$valid && app(BannerDestinationService::class)->resolve($c,true) && $c->creatives()->where('is_active',true)->exists(); }
                            if (!$valid) { $c->status='paused'; }
                            elseif ($c->starts_at->lte($now) && (!($c instanceof BannerCampaign) || $c->approval_status==='approved')) { $c->status='active'; }
                        }
                        if ($c->status!==$before) { $c->save(); CampaignAudit::record($c,'scheduler_'.$c->status); }
                    });
                }
            });
        }
    }
}

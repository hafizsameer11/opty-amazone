<?php

namespace App\Services\Campaigns;

use App\Models\{DiscountCampaign, BannerCampaign};
use Illuminate\Support\Facades\DB;

class CampaignAnalyticsService
{
    public function metrics($c): array
    {
        if ($c instanceof DiscountCampaign) {
            return ['usage'=>$c->usages()->count(),'orders'=>$c->usages()->count(),'units_sold'=>(int) $c->usages()->sum('units'),
                'revenue'=>(float) $c->usages()->sum('revenue'),'discounts_given'=>(float) $c->usages()->sum('discount_amount'),
                'conversion_rate'=>null,'conversion_note'=>'Discount usage is measured per placed order; no exposure denominator is available.'];
        }
        $impressions = $c->events()->where('type','impression')->count(); $clicks=$c->events()->where('type','click')->count();
        $conversions=$c->events()->where('type','conversion')->count();
        return ['impressions'=>$impressions,'unique_impressions'=>$c->events()->where('type','impression')->distinct()->count('visitor_hash'),
            'clicks'=>$clicks,'ctr'=>$impressions ? round(100*$clicks/$impressions,2) : 0,'conversions'=>$conversions,
            'conversion_rate'=>$clicks ? round(100*$conversions/$clicks,2) : 0,'attributed_revenue'=>(float) $c->events()->where('type','conversion')->sum('revenue')];
    }

    public function aggregate(): void
    {
        foreach ([DiscountCampaign::class=>'discount', BannerCampaign::class=>'banner'] as $model=>$type) {
            $model::chunkById(100,function ($campaigns) use ($type) {
                foreach ($campaigns as $c) {
                    DB::table('commerce_campaign_analytics')->updateOrInsert(['campaign_type'=>$type,'campaign_id'=>$c->id],
                        ['metrics'=>json_encode($this->metrics($c)),'created_at'=>now(),'updated_at'=>now()]);
                }
            });
        }
    }
}

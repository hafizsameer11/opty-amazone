<?php

namespace App\Services\Campaigns;

use Illuminate\Support\Facades\DB;

class CampaignAudit
{
    public static function record($campaign, string $action, ?int $actor = null, ?string $reason = null): void
    {
        DB::table('commerce_campaign_audits')->insert(['campaign_type' => $campaign instanceof \App\Models\DiscountCampaign ? 'discount' : 'banner',
            'campaign_id'=>$campaign->id, 'actor_id'=>$actor,'action'=>$action,'snapshot'=>json_encode($campaign instanceof \App\Models\BannerCampaign
                ? $campaign->load('creatives')->toArray() : $campaign->load('products','categories','variants')->toArray()),
            'reason'=>$reason,'created_at'=>now(),'updated_at'=>now()]);
    }
}

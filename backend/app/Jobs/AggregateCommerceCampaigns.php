<?php

namespace App\Jobs;

class AggregateCommerceCampaigns
{
    public function handle(): void
    {
        app(\App\Services\Campaigns\CampaignAnalyticsService::class)->aggregate();
        // Retry attribution for trusted paid orders; the unique order key makes reruns idempotent.
        \App\Models\StoreOrder::whereIn('status',['paid','out_for_delivery','delivered'])->where('created_at','>=',now()->subDays(30))->chunkById(100,function ($orders) {
            foreach ($orders as $order) { app(\App\Services\Campaigns\BannerDeliveryService::class)->convert($order); }
        });
    }
}

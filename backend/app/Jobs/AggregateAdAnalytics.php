<?php

namespace App\Jobs;

use App\Models\AdCampaign;
use App\Services\Ads\AdAnalyticsService;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class AggregateAdAnalytics implements ShouldBeUnique, ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public int $uniqueFor = 600;

    public function handle(AdAnalyticsService $analytics): void
    {
        AdCampaign::select('id')->chunkById(100, function ($rows) use ($analytics) {
            foreach ($rows as $c) {
                $analytics->aggregate($c->id);
            }
        });
    }
}

<?php

namespace App\Jobs;

use App\Models\AdCampaign;
use App\Services\Ads\AdCampaignService;
use App\Services\Ads\AdReconciliationService;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class RefreshAdCampaigns implements ShouldBeUnique, ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public int $uniqueFor = 300;

    public function handle(AdCampaignService $lifecycle, AdReconciliationService $reconciliation): void
    {
        AdCampaign::whereNotIn('status', AdCampaign::TERMINAL)->select('id')->chunkById(100, function ($rows) use ($lifecycle, $reconciliation) {
            foreach ($rows as $c) {
                if ($reconciliation->reconcile($c->id)) {
                    $lifecycle->refreshLifecycle($c->id);
                }
            }
        });
    }
}

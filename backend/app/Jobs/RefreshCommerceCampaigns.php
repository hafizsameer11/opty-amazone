<?php

namespace App\Jobs;

use App\Services\Campaigns\CommerceCampaignLifecycleService;

class RefreshCommerceCampaigns
{
    public function handle(): void
    {
        app(CommerceCampaignLifecycleService::class)->refreshDue();
    }
}

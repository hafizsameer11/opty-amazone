<?php

namespace App\Jobs;

use App\Services\Ads\AdAttributionService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class AttributeAdPurchase implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public function __construct(public int $storeOrderId)
    {
        $this->afterCommit();
    }

    public function handle(AdAttributionService $attribution): void
    {
        $attribution->attribute($this->storeOrderId);
    }
}

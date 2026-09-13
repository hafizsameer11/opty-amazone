<?php

namespace App\Jobs;

use App\Models\AdCampaign;
use App\Models\StoreOrder;
use App\Services\Ads\AdAttributionService;
use App\Services\Ads\AdReconciliationService;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class ReconcileAdSpending implements ShouldBeUnique, ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public int $uniqueFor = 3600;

    public function handle(AdReconciliationService $ledger, AdAttributionService $attribution): void
    {
        AdCampaign::select('id')->chunkById(100, function ($rows) use ($ledger) {
            foreach ($rows as $c) {
                $ledger->reconcile($c->id);
            }
        });
        // Recover missed queue notifications, including later order cancellations.
        StoreOrder::whereNotNull('paid_at')->where('updated_at', '>=', now()->subDays(30))
            ->select('id')->chunkById(100, function ($rows) use ($attribution) {
                foreach ($rows as $order) {
                    $attribution->attribute($order->id);
                }
            });
    }
}

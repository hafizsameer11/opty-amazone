<?php

namespace App\Console\Commands;

use App\Services\Marketplace\ReconciliationService;
use Illuminate\Console\Command;

class ReconcileMarketplace extends Command
{
    protected $signature = 'marketplace:reconcile';

    protected $description = 'Read-only audit of marketplace payments, escrow, totals and seller ledgers';

    public function handle(ReconciliationService $service): int
    {
        $result = $service->audit();
        $this->line(json_encode($result, JSON_PRETTY_PRINT));

        return $result['ok'] ? self::SUCCESS : self::FAILURE;
    }
}

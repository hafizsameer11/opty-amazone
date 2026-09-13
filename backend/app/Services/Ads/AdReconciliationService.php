<?php

namespace App\Services\Ads;

use App\Models\AdCampaign;
use Illuminate\Support\Facades\DB;

class AdReconciliationService
{
    public function reconcile(int $id): bool
    {
        return DB::transaction(function () use ($id) {
            $c = AdCampaign::whereKey($id)->lockForUpdate()->firstOrFail();
            if ($c->status === 'legacy_review') {
                return true;
            }
            $reserved = (int) $c->transactions()->where('type', 'reservation')->sum('amount_cents');
            $spent = (int) $c->transactions()->where('type', 'spend')->sum('amount_cents');
            $released = (int) $c->transactions()->whereIn('type', ['release', 'refund'])->sum('amount_cents');
            $eventSpend = (int) $c->events()->sum('cost_cents');
            $valid = $reserved === (int) $c->reserved_cents && $spent === (int) $c->spent_cents
                && $released === (int) $c->released_cents && $reserved - $spent - $released === (int) $c->remaining_cents
                && $reserved <= $c->budget_cents && $spent + $released <= $reserved && $eventSpend === $spent;
            if (! $valid && $c->status !== 'reconciliation_hold') {
                // Fail closed; never invent financial corrections or refunds from inconsistent balances.
                app(AdCampaignService::class)->transition($c, 'reconciliation_hold', 'reconciliation_mismatch', null,
                    'Ledger, events or campaign balances disagree. Investigate before releasing funds.');
            }

            return $valid;
        }, 3);
    }
}

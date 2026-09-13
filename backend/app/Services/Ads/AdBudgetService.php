<?php

namespace App\Services\Ads;

use App\Models\AdBudgetTransaction;
use App\Models\AdCampaign;
use App\Models\Transaction;
use App\Models\Wallet;

class AdBudgetService
{
    // Caller MUST hold the campaign row lock inside a transaction. All money is cents.
    public function reserve(AdCampaign $c, int $actorId): bool
    {
        if ($c->reserved_cents > 0) {
            return $c->payment_status === 'reserved';
        }
        $wallet = Wallet::where('user_id', $c->seller_id)->lockForUpdate()->first();
        if (! $wallet) {
            return false;
        }
        $ad = AdMoney::cents($wallet->ad_credit);
        $shopping = AdMoney::cents($wallet->shopping_balance);
        if ($ad + $shopping < $c->budget_cents) {
            return false;
        }
        $fromAd = min($ad, $c->budget_cents);
        $fromShopping = $c->budget_cents - $fromAd;
        $wallet->update([
            'ad_credit' => AdMoney::decimal($ad - $fromAd),
            'shopping_balance' => AdMoney::decimal($shopping - $fromShopping),
        ]);
        $c->fill([
            'reserved_cents' => $c->budget_cents, 'remaining_cents' => $c->budget_cents,
            'ad_credit_cents' => $fromAd, 'shopping_cents' => $fromShopping,
            'payment_status' => 'reserved', 'paid_at' => now(),
        ])->save();
        $this->entry($c, 'reservation', $c->budget_cents, "reservation:{$c->id}", $actorId,
            ['ad_credit_cents' => $fromAd, 'shopping_cents' => $fromShopping]);
        Transaction::create([
            'user_id' => $c->seller_id, 'type' => 'ad_reservation',
            'amount' => '-'.AdMoney::decimal($c->budget_cents), 'status' => 'success',
            'description' => "Ad campaign #{$c->id} budget reservation",
            'meta' => ['ad_campaign_id' => $c->id, 'ad_credit_cents' => $fromAd, 'shopping_cents' => $fromShopping],
        ]);

        return true;
    }

    public function spend(AdCampaign $c, string $eventKey): bool
    {
        $key = "spend:{$eventKey}";
        if (AdBudgetTransaction::where('idempotency_key', $key)->exists()) {
            return false;
        }
        if (! app(AdEligibilityService::class)->deliverable($c)) {
            return false;
        }
        $c->spent_cents += $c->bid_cents;
        $c->remaining_cents -= $c->bid_cents;
        $c->save();
        $this->entry($c, 'spend', $c->bid_cents, $key, null);

        return true;
    }

    public function release(AdCampaign $c, ?int $actorId, string $type = 'release'): void
    {
        if ($c->remaining_cents <= 0 || $c->payment_status !== 'reserved') {
            return;
        }
        $key = "release:{$c->id}";
        if (AdBudgetTransaction::where('idempotency_key', $key)->exists()) {
            return;
        }
        $wallet = Wallet::where('user_id', $c->seller_id)->lockForUpdate()->firstOrFail();
        // Spend ad credit first; return unused funds to their ORIGINAL balance buckets.
        $adReturn = max(0, $c->ad_credit_cents - $c->spent_cents);
        $shoppingReturn = $c->remaining_cents - $adReturn;
        $amount = $c->remaining_cents;
        $wallet->update([
            'ad_credit' => AdMoney::decimal(AdMoney::cents($wallet->ad_credit) + $adReturn),
            'shopping_balance' => AdMoney::decimal(AdMoney::cents($wallet->shopping_balance) + $shoppingReturn),
        ]);
        $c->released_cents += $amount;
        $c->remaining_cents = 0;
        $c->payment_status = 'released';
        $c->save();
        $this->entry($c, $type, $amount, $key, $actorId,
            ['ad_credit_cents' => $adReturn, 'shopping_cents' => $shoppingReturn]);
        Transaction::create([
            'user_id' => $c->seller_id, 'type' => 'ad_release', 'amount' => AdMoney::decimal($amount),
            'status' => 'success', 'description' => "Unused campaign #{$c->id} funds returned",
            'meta' => ['ad_campaign_id' => $c->id, 'ad_credit_cents' => $adReturn, 'shopping_cents' => $shoppingReturn],
        ]);
    }

    public function entry(AdCampaign $c, string $type, int $amount, string $key, ?int $actor, array $meta = []): void
    {
        AdBudgetTransaction::create([
            'ad_campaign_id' => $c->id, 'type' => $type, 'amount_cents' => $amount,
            'balance_after_cents' => $c->remaining_cents, 'idempotency_key' => $key,
            'actor_id' => $actor, 'metadata' => $meta, 'created_at' => now(),
        ]);
    }
}

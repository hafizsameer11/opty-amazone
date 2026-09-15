<?php

namespace App\Services\Ads;

use App\Models\AdBudgetTransaction;
use App\Models\AdCampaign;
use App\Models\SellerWallet;
use App\Models\Store;
use App\Models\Transaction;
use App\Models\Wallet;
use App\Services\Marketplace\Money;
use App\Services\Marketplace\PlatformRevenueService;
use App\Services\Marketplace\SellerWalletService;

class AdBudgetService
{
    public function __construct(private SellerWalletService $sellerWallets, private PlatformRevenueService $platform) {}

    // Caller MUST hold the campaign row lock inside a transaction. All money is cents.
    public function reserve(AdCampaign $c, int $actorId): bool
    {
        if ($c->reserved_cents > 0) {
            return $c->payment_status === 'reserved';
        }
        if ($c->funding_source === 'legacy_user_wallet') {
            return $this->reserveLegacy($c, $actorId);
        }
        $wallet = $this->sellerWallet($c);
        $before = Money::cents($wallet->available_balance);
        if ($before < $c->budget_cents) {
            return false;
        }
        $entry = $this->sellerWallets->entry($wallet, "boost:{$c->id}:reservation", 'boost_campaign_reservation', -$c->budget_cents,
            ['available_balance' => -$c->budget_cents, 'ad_reserved_balance' => $c->budget_cents], null, null, $c->id,
            "Boost Campaign Payment – {$c->name}", ['campaign_name' => $c->name, 'campaign_status' => $c->status]);
        $c->fill([
            'seller_wallet_id' => $wallet->id, 'reserved_cents' => $c->budget_cents, 'remaining_cents' => $c->budget_cents,
            'ad_credit_cents' => 0, 'shopping_cents' => 0, 'payment_status' => 'reserved', 'paid_at' => now(),
        ])->save();
        $this->entry($c, 'reservation', $c->budget_cents, "reservation:{$c->id}", $actorId, [
            'funding_source' => 'seller_wallet', 'campaign_name' => $c->name, 'seller_wallet_id' => $wallet->id,
            'seller_wallet_entry_id' => $entry->id, 'wallet_balance_before_cents' => $before,
            'wallet_balance_after_cents' => Money::cents($entry->balances_after['available_balance']),
            'funds_destination' => 'campaign_reservation',
        ]);

        return true;
    }

    private function reserveLegacy(AdCampaign $c, int $actorId): bool
    {
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
        if ($c->funding_source === 'legacy_user_wallet') {
            $this->entry($c, 'spend', $c->bid_cents, $key, null, ['funding_source' => 'legacy_user_wallet', 'campaign_name' => $c->name]);

            return true;
        }
        $wallet = $this->sellerWallet($c);
        abort_if(Money::cents($wallet->ad_reserved_balance) < $c->bid_cents, 409, 'Advertising reservation requires reconciliation.');
        $sellerEntry = $this->sellerWallets->entry($wallet, "boost:{$c->id}:{$key}", 'boost_campaign_spend', -$c->bid_cents,
            ['ad_reserved_balance' => -$c->bid_cents, 'ad_spend_total' => $c->bid_cents], null, null, $c->id,
            "Boost Campaign Spend – {$c->name}", ['campaign_name' => $c->name, 'campaign_status' => $c->status]);
        $platformEntry = $this->platform->adSpend($c, $wallet, $c->bid_cents, "platform:{$key}");
        $this->entry($c, 'spend', $c->bid_cents, $key, null, [
            'funding_source' => 'seller_wallet', 'campaign_name' => $c->name, 'seller_wallet_id' => $wallet->id,
            'seller_wallet_entry_id' => $sellerEntry->id, 'wallet_ad_reserve_after_cents' => Money::cents($sellerEntry->balances_after['ad_reserved_balance']),
            'platform_ledger_entry_id' => $platformEntry->id, 'funds_destination' => 'platform_advertising_revenue',
        ]);

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
        if ($c->funding_source !== 'legacy_user_wallet') {
            $wallet = $this->sellerWallet($c);
            $amount = $c->remaining_cents;
            abort_if(Money::cents($wallet->ad_reserved_balance) < $amount, 409, 'Advertising reservation requires reconciliation.');
            $entry = $this->sellerWallets->entry($wallet, "boost:{$c->id}:release", 'boost_campaign_release', $amount,
                ['available_balance' => $amount, 'ad_reserved_balance' => -$amount], null, null, $c->id,
                "Boost Campaign Refund – {$c->name}", ['campaign_name' => $c->name, 'campaign_status' => $c->status, 'release_type' => $type]);
            $c->released_cents += $amount;
            $c->remaining_cents = 0;
            $c->payment_status = 'released';
            $c->save();
            $this->entry($c, $type, $amount, $key, $actorId, [
                'funding_source' => 'seller_wallet', 'campaign_name' => $c->name, 'seller_wallet_id' => $wallet->id,
                'seller_wallet_entry_id' => $entry->id, 'wallet_balance_after_cents' => Money::cents($entry->balances_after['available_balance']),
                'funds_destination' => 'seller_wallet_refund',
            ]);

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

    private function sellerWallet(AdCampaign $campaign): SellerWallet
    {
        $storeId = $campaign->sellerWallet?->store_id
            ?? Store::where('user_id', $campaign->seller_id)->value('id');
        abort_unless($storeId, 422, 'Seller wallet is unavailable.');

        return $this->sellerWallets->locked((int) $storeId);
    }
}

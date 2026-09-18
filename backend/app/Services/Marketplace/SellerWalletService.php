<?php

namespace App\Services\Marketplace;

use App\Models\SellerWallet;
use App\Models\SellerWalletEntry;
use App\Models\Store;
use App\Services\Notifications\MarketplaceNotificationService;
use Illuminate\Support\Facades\DB;

class SellerWalletService
{
    public const BALANCES = ['available_balance', 'pending_balance', 'reserved_balance', 'ad_reserved_balance', 'ad_spend_total', 'top_up_total', 'disputed_balance', 'debt_balance', 'total_earnings'];

    public function locked(int $storeId): SellerWallet
    {
        Store::whereKey($storeId)->lockForUpdate()->firstOrFail();
        $wallet = SellerWallet::firstOrCreate(['store_id' => $storeId]);

        return SellerWallet::whereKey($wallet->id)->lockForUpdate()->firstOrFail();
    }

    public function entry(SellerWallet $wallet, string $reference, string $type, int $amount, array $deltas, ?int $orderId = null, ?int $withdrawalId = null, ?int $campaignId = null, ?string $description = null, array $metadata = []): SellerWalletEntry
    {
        abort_unless(DB::transactionLevel() > 0, 500);
        if ($entry = SellerWalletEntry::where('reference', $reference)->first()) {
            return $entry;
        }
        $balances = [];
        foreach (self::BALANCES as $field) {
            $value = Money::cents($wallet->$field) + ($deltas[$field] ?? 0);
            abort_if($value < 0, 409, 'Seller ledger requires reconciliation.');
            $balances[$field] = Money::decimal($value);
        }
        $wallet->update($balances);

        $entry = SellerWalletEntry::create(['seller_wallet_id' => $wallet->id, 'store_order_id' => $orderId,
            'withdrawal_id' => $withdrawalId, 'reference' => $reference, 'type' => $type,
            'ad_campaign_id' => $campaignId, 'amount' => Money::decimal($amount),
            'deltas' => array_map([Money::class, 'decimal'], $deltas), 'balances_after' => $balances,
            'description' => $description, 'metadata' => $metadata]);

        $store = Store::with('user')->find($wallet->store_id);
        $isBoost = str_starts_with($type, 'boost_');
        $isReferral = str_starts_with($type, 'referral_');
        app(MarketplaceNotificationService::class)->send(
            $store?->user,
            $isBoost ? 'boost.campaign' : ($isReferral ? 'referral.seller_transaction' : 'wallet.seller_transaction'),
            $isBoost ? 'Boost campaign updated' : ($isReferral ? 'Referral campaign transaction' : 'Seller wallet updated'),
            $description ?: 'Your seller wallet has a new transaction.',
            $isBoost ? '/boost-ads' : ($isReferral ? '/referral-campaigns' : '/wallet'),
            ['wallet_entry_id' => $entry->id, 'transaction_type' => $type, 'amount' => (float) $entry->amount]
        );

        return $entry;
    }

    // Reversals after a payout become a debt, recovered from future settlements.
    public function debitAvailable(SellerWallet $wallet, int $amount): array
    {
        $taken = min(Money::cents($wallet->available_balance), $amount);

        return ['available_balance' => -$taken, 'debt_balance' => $amount - $taken];
    }

    public function creditAvailable(SellerWallet $wallet, int $amount): array
    {
        $recovered = min(Money::cents($wallet->debt_balance), $amount);

        return ['available_balance' => $amount - $recovered, 'debt_balance' => -$recovered];
    }

    public function summary(int $storeId): array
    {
        return DB::transaction(function () use ($storeId) {
            $wallet = $this->locked($storeId);
            $locked = \App\Models\Escrow::whereHas('storeOrder', fn ($q) => $q->where('store_id', $storeId)->where('financial_version', 1))
                ->where('status', 'locked')->sum('amount');

            return $wallet->toArray() + ['currency' => 'EUR', 'locked_escrow_amount' => Money::decimal(Money::cents($locked))];
        }, 5);
    }
}

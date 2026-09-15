<?php

namespace App\Services\Marketplace;

use App\Models\SellerWallet;
use App\Models\SellerWalletEntry;
use App\Models\Store;
use Illuminate\Support\Facades\DB;

class SellerWalletService
{
    public const BALANCES = ['available_balance', 'pending_balance', 'reserved_balance', 'disputed_balance', 'debt_balance', 'total_earnings'];

    public function locked(int $storeId): SellerWallet
    {
        Store::whereKey($storeId)->lockForUpdate()->firstOrFail();
        $wallet = SellerWallet::firstOrCreate(['store_id' => $storeId]);

        return SellerWallet::whereKey($wallet->id)->lockForUpdate()->firstOrFail();
    }

    public function entry(SellerWallet $wallet, string $reference, string $type, int $amount, array $deltas, ?int $orderId = null, ?int $withdrawalId = null): SellerWalletEntry
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

        return SellerWalletEntry::create(['seller_wallet_id' => $wallet->id, 'store_order_id' => $orderId,
            'withdrawal_id' => $withdrawalId, 'reference' => $reference, 'type' => $type,
            'amount' => Money::decimal($amount), 'deltas' => array_map([Money::class, 'decimal'], $deltas), 'balances_after' => $balances]);
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

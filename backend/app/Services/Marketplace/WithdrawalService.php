<?php

namespace App\Services\Marketplace;

use App\Models\SellerWithdrawal;
use App\Models\StoreOrder;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class WithdrawalService
{
    public function __construct(private SellerWalletService $wallets) {}

    public function request(User $seller, array $data): SellerWithdrawal
    {
        abort_unless($seller->isSeller() && $seller->store, 403);

        return DB::transaction(function () use ($seller, $data) {
            $wallet = $this->wallets->locked($seller->store->id);
            $amount = Money::cents($data['amount']);
            $key = 'withdrawal:'.$wallet->id.':'.$data['idempotency_key'];
            if ($existing = SellerWithdrawal::where('idempotency_key', $key)->first()) {
                abort_unless(Money::cents($existing->amount) === $amount && $existing->bank_details === $data['bank_details'], 409, 'Withdrawal key already used for different details.');

                return $existing;
            }
            abort_unless($amount >= 1000 && $amount <= Money::cents($wallet->available_balance), 422, 'Insufficient available earnings or withdrawal below EUR 10.');
            abort_if(Money::cents($wallet->debt_balance) > 0 || $this->hasOpenDispute($wallet->store_id), 409, 'Withdrawals are held while a debt or dispute is open.');
            $withdrawal = SellerWithdrawal::create(['seller_wallet_id' => $wallet->id, 'idempotency_key' => $key,
                'amount' => Money::decimal($amount), 'bank_details' => $data['bank_details'], 'status' => 'pending']);
            $this->wallets->entry($wallet, $key.':reserve', 'withdrawal_reserved', -$amount,
                ['available_balance' => -$amount, 'reserved_balance' => $amount], null, $withdrawal->id);

            return $withdrawal;
        }, 5);
    }

    public function transition(SellerWithdrawal $input, User $admin, array $data): SellerWithdrawal
    {
        abort_unless($admin->isAdmin(), 403);

        return DB::transaction(function () use ($input, $admin, $data) {
            $wallet = $this->wallets->locked($input->wallet->store_id);
            $withdrawal = SellerWithdrawal::whereKey($input->id)->lockForUpdate()->firstOrFail();
            $status = $data['status'];
            if ($withdrawal->status === $status) {
                abort_if($status === 'completed' && $withdrawal->payout_reference !== ($data['payout_reference'] ?? null), 409, 'Payout reference does not match.');

                return $withdrawal;
            }
            $allowed = ['pending' => ['approved', 'rejected'], 'approved' => ['processing', 'rejected'], 'processing' => ['completed', 'failed']];
            abort_unless(in_array($status, $allowed[$withdrawal->status] ?? []), 409, 'Invalid withdrawal transition.');
            if (in_array($status, ['approved', 'processing', 'completed'])) {
                abort_if(Money::cents($wallet->debt_balance) > 0 || $this->hasOpenDispute($wallet->store_id), 409, 'Resolve the debt or dispute before paying out.');
            }
            $amount = Money::cents($withdrawal->amount);
            $deltas = [];
            if (in_array($status, ['rejected', 'failed'])) {
                $deltas = $this->wallets->creditAvailable($wallet, $amount) + ['reserved_balance' => -$amount];
            }
            if ($status === 'completed') {
                abort_unless(! empty($data['payout_reference']), 422, 'A completed bank payout reference is required.');
                abort_if(SellerWithdrawal::where('payout_reference', $data['payout_reference'])->whereKeyNot($withdrawal->id)->exists(), 409, 'Payout reference already recorded.');
                $deltas = ['reserved_balance' => -$amount];
            }
            $this->wallets->entry($wallet, 'withdrawal:'.$withdrawal->id.':'.$status, 'withdrawal_'.$status,
                $status === 'completed' ? -$amount : 0, $deltas, null, $withdrawal->id);
            $withdrawal->update(['status' => $status, 'processed_by' => $admin->id, 'notes' => $data['notes'] ?? null]
                + ($status === 'completed' ? ['payout_reference' => $data['payout_reference'], 'completed_at' => now()] : []));

            return $withdrawal;
        }, 5);
    }

    private function hasOpenDispute(int $storeId): bool
    {
        // Use a current locking read: a dispute may have committed while we waited
        // for the wallet lock, after this transaction's first consistent read.
        // The enclosing transaction retries any lock-order deadlock with a refund.
        return StoreOrder::where('store_id', $storeId)->where('status', 'disputed')
            ->orderBy('id')->lockForUpdate()->first(['id']) !== null;
    }
}

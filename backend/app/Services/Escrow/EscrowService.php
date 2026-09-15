<?php

namespace App\Services\Escrow;

use App\Models\Escrow;
use App\Models\StoreOrder;
use App\Services\Marketplace\Money;
use App\Services\Marketplace\SellerWalletService;
use Illuminate\Support\Facades\DB;

class EscrowService
{
    public function __construct(private SellerWalletService $wallets) {}

    public function createEscrow(StoreOrder $so): Escrow
    {
        abort_unless(DB::transactionLevel() > 0 && $so->payment()->where('status', 'paid')->exists(), 409, 'Verified payment required.');
        if ($escrow = $so->escrow()->lockForUpdate()->first()) {
            return $escrow;
        }
        $escrow = Escrow::create(['order_id' => $so->order_id, 'store_order_id' => $so->id, 'amount' => $so->total,
            'shipping_fee' => $so->delivery_fee, 'status' => 'locked', 'locked_at' => now()]);
        $wallet = $this->wallets->locked($so->store_id);
        $amount = Money::cents($escrow->amount);
        $this->wallets->entry($wallet, 'order:'.$so->id.':pending', 'order_payment', $amount, ['pending_balance' => $amount], $so->id);

        return $escrow;
    }

    public function releaseEscrow(StoreOrder $so): Escrow
    {
        abort_unless(DB::transactionLevel() > 0 && $so->delivery_verified_at && $so->status === 'delivered', 409, 'Verified delivery required.');
        $escrow = $so->escrow()->lockForUpdate()->firstOrFail();
        if ($escrow->status === 'released') {
            return $escrow;
        }
        abort_unless($escrow->status === 'locked', 409, 'Escrow is not available for release.');
        $wallet = $this->wallets->locked($so->store_id);
        $amount = Money::cents($escrow->amount);
        $this->wallets->entry($wallet, 'order:'.$so->id.':release', 'escrow_release', $amount,
            $this->wallets->creditAvailable($wallet, $amount) + ['pending_balance' => -$amount, 'total_earnings' => $amount], $so->id);
        $escrow->update(['status' => 'released', 'released_at' => now()]);

        return $escrow;
    }

    public function getLockedEscrowBalance($userId): float
    {
        return (float) Escrow::whereHas('storeOrder.order', fn ($q) => $q->where('user_id', $userId))->whereIn('status', ['locked', 'disputed'])->sum('amount');
    }
}

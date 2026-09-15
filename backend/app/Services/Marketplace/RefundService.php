<?php

namespace App\Services\Marketplace;

use App\Models\PointTransaction;
use App\Models\StoreOrder;
use App\Models\User;
use App\Services\Inventory\InventoryService;
use Illuminate\Support\Facades\DB;

class RefundService
{
    public function __construct(private OrderTotalsService $totals, private BuyerWalletService $buyers,
        private SellerWalletService $sellers, private InventoryService $inventory) {}

    public function cancel(StoreOrder $input, User $actor, string $reason): StoreOrder
    {
        return DB::transaction(function () use ($input, $actor, $reason) {
            $so = $this->totals->locked($input);
            if (! $actor->isAdmin()) {
                $this->totals->authorize($so, $actor, $actor->isSeller() ? 'seller' : 'buyer');
            }
            if (in_array($so->status, ['cancelled', 'refunded'])) {
                return $so;
            }
            abort_unless($actor->isAdmin() || in_array($so->status, ['pending', 'awaiting_payment', 'paid', 'processing']), 409, 'Open a dispute for a shipped or delivered order.');
            abort_if($actor->isSeller() && ! in_array($so->status, ['pending', 'awaiting_payment']), 409, 'Paid cancellations require buyer or admin action.');
            abort_unless((int) $so->financial_version === 1, 409, 'Legacy financial records require reconciliation.');
            $wasShipped = $so->out_for_delivery_at || $so->delivered_at;
            $payment = $so->payment()->lockForUpdate()->first();
            if ($payment) {
                abort_unless($payment->status === 'paid' && $payment->method === 'wallet', 409, 'Payment cannot be refunded through this flow.');
                $escrow = $so->escrow()->lockForUpdate()->firstOrFail();
                abort_unless(in_array($escrow->status, ['locked', 'released', 'disputed']), 409, 'Escrow cannot be refunded.');
                $amount = Money::cents($payment->amount);
                abort_unless($amount === Money::cents($escrow->amount) && $amount === Money::cents($so->total), 409, 'Financial totals require reconciliation.');
                $transaction = $this->buyers->change($so->order->user, $amount, 'order:'.$so->id.':refund', 'refund',
                    ['payment_method' => 'wallet', 'store_order_id' => $so->id, 'order_id' => $so->order_id, 'reverses_transaction_id' => $payment->transaction_id, 'reason' => $reason]);
                $wallet = $this->sellers->locked($so->store_id);
                $released = $escrow->status === 'released' || $escrow->dispute_previous_status === 'released';
                $deltas = $escrow->status === 'disputed' && $released ? ['disputed_balance' => -$amount]
                    : ($released ? $this->sellers->debitAvailable($wallet, $amount) : ['pending_balance' => -$amount]);
                if ($released) {
                    $deltas['total_earnings'] = -$amount;
                }
                $this->sellers->entry($wallet, 'order:'.$so->id.':refund', 'refund', -$amount, $deltas, $so->id);
                $payment->update(['status' => 'refunded', 'refund_transaction_id' => $transaction->id, 'refund_reason' => $reason]);
                $escrow->update(['status' => 'refunded', 'refunded_at' => now()]);
            } else {
                abort_unless(in_array($so->status, ['pending', 'awaiting_payment']), 409, 'Missing payment evidence; reconciliation is required.');
            }
            if (! $wasShipped && ! $so->inventory_restored_at) {
                foreach ($so->items as $item) {
                    $this->inventory->restoreForOrderLine($item);
                }
                $so->inventory_restored_at = now();
            }
            $this->reversePoints($so);
            $so->fill(['status' => $payment ? 'refunded' : 'cancelled', 'payment_status' => $payment ? 'refunded' : 'cancelled',
                'rejection_reason' => $reason, 'delivery_code_encrypted' => null, 'delivery_code_hash' => null])->save();
            $this->totals->sync($so->order);

            return $so->fresh(['escrow', 'payment']);
        }, 5);
    }

    private function reversePoints(StoreOrder $so): void
    {
        $delta = Money::cents($so->redeemed_points ?? 0) - Money::cents($so->reward_points ?? 0);
        if (! $delta) {
            return;
        }
        $wallet = $this->buyers->locked($so->order->user);
        $balance = Money::cents($wallet->loyality_points) + $delta;
        // Negative points are a visible reward debt; future rewards repay it.
        $wallet->update(['loyality_points' => Money::decimal($balance)]);
        PointTransaction::create(['user_id' => $so->order->user_id, 'type' => 'adjustment', 'points' => Money::decimal($delta),
            'balance_after' => Money::decimal($balance), 'description' => 'Order cancellation/reward reversal',
            'reference_type' => 'store_order', 'reference_id' => $so->id]);
    }

    public function dispute(StoreOrder $input, User $actor, string $reason): StoreOrder
    {
        return DB::transaction(function () use ($input, $actor, $reason) {
            $so = $this->totals->locked($input);
            if (! $actor->isAdmin()) {
                $this->totals->authorize($so, $actor, 'buyer');
            }
            if ($so->status === 'disputed') {
                return $so;
            }
            abort_unless($so->payment_status === 'paid', 409, 'Only paid orders can be disputed.');
            // One dispute per shipment; resolved cases retain an audit trail.
            abort_if($so->dispute_reason, 409, 'This dispute has already been resolved.');
            $escrow = $so->escrow()->lockForUpdate()->firstOrFail();
            abort_unless(in_array($escrow->status, ['locked', 'released']), 409, 'Escrow cannot be disputed.');
            $wallet = $this->sellers->locked($so->store_id);
            $amount = Money::cents($escrow->amount);
            $deltas = $escrow->status === 'released' ? $this->sellers->debitAvailable($wallet, $amount) + ['disputed_balance' => $amount] : [];
            $this->sellers->entry($wallet, 'order:'.$so->id.':dispute', 'dispute_hold', $amount, $deltas, $so->id);
            $escrow->update(['dispute_previous_status' => $escrow->status, 'status' => 'disputed']);
            $so->update(['dispute_previous_status' => $so->status, 'status' => 'disputed', 'payment_status' => 'disputed', 'dispute_reason' => $reason]);
            $this->totals->sync($so->order);

            return $so;
        }, 5);
    }

    public function resolve(StoreOrder $input, User $admin, string $reason): StoreOrder
    {
        abort_unless($admin->isAdmin(), 403);

        return DB::transaction(function () use ($input, $reason) {
            $so = $this->totals->locked($input);
            if ($so->status !== 'disputed' && $so->dispute_reason) {
                return $so;
            }
            abort_unless($so->status === 'disputed', 409, 'No open dispute.');
            $escrow = $so->escrow()->lockForUpdate()->firstOrFail();
            $wallet = $this->sellers->locked($so->store_id);
            $amount = Money::cents($escrow->amount);
            $deltas = $escrow->dispute_previous_status === 'released'
                ? $this->sellers->creditAvailable($wallet, $amount) + ['disputed_balance' => -$amount] : [];
            $entry = $this->sellers->entry($wallet, 'order:'.$so->id.':resolve', 'dispute_resolved', $amount, $deltas, $so->id);
            $entry->update(['description' => $reason]);
            $escrow->update(['status' => $escrow->dispute_previous_status, 'dispute_previous_status' => null]);
            $so->update(['status' => $so->dispute_previous_status, 'payment_status' => 'paid']);
            $this->totals->sync($so->order);

            return $so;
        }, 5);
    }
}

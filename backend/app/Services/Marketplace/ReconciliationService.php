<?php

namespace App\Services\Marketplace;

use App\Models\SellerWallet;
use App\Models\StoreOrder;
use Illuminate\Support\Facades\DB;

class ReconciliationService
{
    /** Read-only audit of the new ledger. Legacy balances are never inferred or repaired. */
    public function audit(): array
    {
        return DB::transaction(function () {
            $issues = [];
            $check = function (bool $ok, string $message) use (&$issues) {
                if (! $ok) {
                    $issues[] = $message;
                }
            };
            $shipments = StoreOrder::where('financial_version', 1)->with(['items', 'order.storeOrders', 'payment.transaction', 'payment.refundTransaction', 'escrow'])->get();
            foreach ($shipments as $so) {
                $prefix = 'Shipment '.$so->id.': ';
                $amount = Money::cents($so->total);
                $check(Money::cents($so->subtotal) === $so->items->sum(fn ($i) => Money::cents($i->line_total)), $prefix.'item subtotal mismatch');
                $check($amount === Money::cents($so->subtotal) + Money::cents($so->delivery_fee) - Money::cents($so->discount_total), $prefix.'total mismatch');
                $check($so->delivery_address_snapshot === $so->order->delivery_address_snapshot, $prefix.'address snapshot mismatch');
                $payment = $so->payment;
                $escrow = $so->escrow;
                if (! $payment) {
                    $check(! $escrow && in_array($so->status, ['pending', 'awaiting_payment', 'cancelled']), $prefix.'missing payment evidence');

                    continue;
                }
                $check($payment->method === 'wallet' && Money::cents($payment->amount) === $amount, $prefix.'payment amount or method mismatch');
                $tx = $payment->transaction;
                $check($tx && $tx->user_id === $so->order->user_id && $tx->status === 'success' && Money::cents($tx->amount) === -$amount, $prefix.'buyer debit mismatch');
                $check($escrow && Money::cents($escrow->amount) === $amount && Money::cents($escrow->shipping_fee) === Money::cents($so->delivery_fee), $prefix.'escrow mismatch');
                if ($payment->status === 'refunded') {
                    $refund = $payment->refundTransaction;
                    $check($refund && $refund->user_id === $so->order->user_id && $refund->status === 'success' && Money::cents($refund->amount) === $amount
                        && ($refund->meta['reverses_transaction_id'] ?? null) === $tx?->id, $prefix.'buyer refund mismatch');
                    $check($so->status === 'refunded' && $so->payment_status === 'refunded' && $escrow?->status === 'refunded', $prefix.'refund state mismatch');
                } else {
                    $check($payment->status === 'paid' && in_array($so->payment_status, ['paid', 'disputed']), $prefix.'payment state mismatch');
                    $expectedEscrow = $so->status === 'disputed' ? 'disputed' : ($so->status === 'delivered' ? 'released' : 'locked');
                    $check($escrow?->status === $expectedEscrow, $prefix.'escrow state mismatch');
                }
                if ($escrow?->released_at) {
                    $check((bool) $so->delivery_verified_at, $prefix.'release without verified delivery');
                }
            }
            foreach ($shipments->pluck('order')->unique('id') as $order) {
                if ($order->storeOrders->contains(fn ($so) => (int) $so->financial_version !== 1)) {
                    continue;
                }
                $active = $order->storeOrders->whereNotIn('status', ['cancelled', 'refunded']);
                foreach (['items_total' => 'subtotal', 'shipping_total' => 'delivery_fee', 'discount_total' => 'discount_total', 'grand_total' => 'total'] as $parent => $child) {
                    $check(Money::cents($order->$parent) === $active->sum(fn ($so) => Money::cents($so->$child)), 'Order '.$order->id.': '.$parent.' mismatch');
                }
            }
            $wallets = SellerWallet::with(['entries' => fn ($q) => $q->orderBy('id'), 'withdrawals'])->get();
            foreach ($wallets as $wallet) {
                $prefix = 'Seller wallet '.$wallet->id.': ';
                $running = array_fill_keys(SellerWalletService::BALANCES, 0);
                foreach ($wallet->entries as $entry) {
                    foreach ($running as $field => $value) {
                        $running[$field] += Money::cents($entry->deltas[$field] ?? 0);
                        $check($running[$field] === Money::cents($entry->balances_after[$field] ?? 0), $prefix.'ledger balance mismatch at entry '.$entry->id.' / '.$field);
                    }
                }
                foreach ($running as $field => $value) {
                    $check($value === Money::cents($wallet->$field), $prefix.$field.' differs from ledger');
                }
                $escrows = $shipments->where('store_id', $wallet->store_id)->pluck('escrow')->filter();
                $sum = fn ($items) => $items->sum(fn ($e) => Money::cents($e->amount));
                $pending = $sum($escrows->filter(fn ($e) => $e->status === 'locked' || ($e->status === 'disputed' && $e->dispute_previous_status === 'locked')));
                $disputed = $sum($escrows->filter(fn ($e) => $e->status === 'disputed' && $e->dispute_previous_status === 'released'));
                $earned = $sum($escrows->filter(fn ($e) => $e->status === 'released' || ($e->status === 'disputed' && $e->dispute_previous_status === 'released')));
                $reserved = $sum($wallet->withdrawals->whereIn('status', ['pending', 'approved', 'processing']));
                $paidOut = $sum($wallet->withdrawals->where('status', 'completed'));
                $check($pending === Money::cents($wallet->pending_balance), $prefix.'pending earnings mismatch');
                $check($disputed === Money::cents($wallet->disputed_balance), $prefix.'disputed earnings mismatch');
                $check($earned === Money::cents($wallet->total_earnings), $prefix.'net earnings mismatch');
                $check($reserved === Money::cents($wallet->reserved_balance), $prefix.'withdrawal reserve mismatch');
                $held = Money::cents($wallet->available_balance) + $pending + $reserved + $disputed - Money::cents($wallet->debt_balance);
                $check($held === $pending + $earned - $paidOut, $prefix.'funds conservation mismatch');
            }

            return ['ok' => $issues === [], 'shipments_checked' => $shipments->count(), 'seller_wallets_checked' => $wallets->count(),
                'legacy_shipments_requiring_separate_review' => StoreOrder::where('financial_version', 0)->count(), 'issues' => $issues];
        });
    }
}

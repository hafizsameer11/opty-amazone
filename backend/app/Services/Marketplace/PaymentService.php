<?php

namespace App\Services\Marketplace;

use App\Models\MarketplacePayment;
use App\Models\StoreOrder;
use App\Models\User;
use App\Services\Escrow\EscrowService;
use Illuminate\Support\Facades\DB;

class PaymentService
{
    public function __construct(private OrderTotalsService $totals, private BuyerWalletService $wallets,
        private EscrowService $escrows, private DeliveryVerificationService $delivery) {}

    public function pay(StoreOrder $input, User $buyer, array $data): StoreOrder
    {
        abort_unless($data['payment_method'] === 'wallet', 503, 'Card order payment is not available. Fund your wallet with Stripe when configured.');

        return DB::transaction(function () use ($input, $buyer, $data) {
            $so = $this->totals->locked($input);
            $this->totals->authorize($so, $buyer, 'buyer');
            $this->wallets->locked($buyer);
            if ($payment = $so->payment()->first()) {
                abort_unless($payment->status === 'paid' && Money::cents($payment->amount) === Money::cents($data['expected_total']), 409, 'Payment was already processed or reversed.');

                return $so->load('escrow', 'payment');
            }
            abort_unless($so->status === 'awaiting_payment' && $so->payment_status === 'pending' && (int) $so->financial_version === 1,
                409, 'A seller shipping quote is required before payment. Legacy orders require review.');
            $amount = Money::cents($so->total);
            abort_unless($amount === Money::cents($so->subtotal) + Money::cents($so->delivery_fee) - Money::cents($so->discount_total)
                && $amount === Money::cents($data['expected_total']), 409, 'Order total changed. Review the updated delivery fee before paying.');
            $key = 'payment:'.$buyer->id.':'.$data['idempotency_key'];
            abort_if(MarketplacePayment::where('idempotency_key', $key)->exists(), 409, 'Payment key already used.');
            $transaction = $this->wallets->change($buyer, -$amount, 'order:'.$so->id.':payment', 'order_payment',
                ['payment_method' => 'wallet', 'order_id' => $so->order_id, 'store_order_id' => $so->id]);
            MarketplacePayment::create(['store_order_id' => $so->id, 'user_id' => $buyer->id, 'idempotency_key' => $key,
                'amount' => $so->total, 'method' => 'wallet', 'status' => 'paid', 'transaction_id' => $transaction->id]);
            $this->escrows->createEscrow($so);
            $so->update(['status' => 'paid', 'payment_status' => 'paid', 'paid_at' => now()]);
            $this->delivery->issue($so);
            $so->order->update(['payment_method' => 'wallet']);
            $this->totals->sync($so->order);
            // Referral candidates are non-financial until delivery and the configured
            // return-protection period complete. Capture only after verified payment.
            app(\App\Services\Referrals\ReferralService::class)->captureOrderCandidates($so);

            return $so->fresh(['escrow', 'payment']);
        }, 5);
    }
}

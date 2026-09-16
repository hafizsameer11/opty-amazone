<?php

namespace App\Services\Marketplace;

use App\Models\PointTransaction;
use App\Models\StoreOrder;
use App\Models\User;
use App\Services\Escrow\EscrowService;
use App\Services\Points\PointService;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DeliveryVerificationService
{
    public function __construct(private OrderTotalsService $totals, private EscrowService $escrows) {}

    public function issue(StoreOrder $so): void
    {
        abort_unless(DB::transactionLevel() > 0 && $so->payment_status === 'paid', 409);
        $code = StoreOrder::generateDeliveryCode();
        $expires = now()->addDays(config('marketplace.delivery_code_days'));
        if ($so->estimated_delivery_date?->gt($expires)) {
            $expires = $so->estimated_delivery_date->copy()->addDays(3);
        }
        $so->update(['delivery_code' => null, 'delivery_code_hash' => Hash::make($code),
            // Only buyer responses decrypt this retrieval copy; verification uses the hash.
            'delivery_code_encrypted' => Crypt::encryptString($code), 'delivery_code_expires_at' => $expires,
            'delivery_code_issued_at' => now(), 'delivery_code_attempts' => 0, 'delivery_code_locked_until' => null]);
    }

    public function buyerCode(StoreOrder $so): ?string
    {
        if ($so->payment_status !== 'paid' || ! in_array($so->status, ['paid', 'processing', 'out_for_delivery'])
            || ! $so->delivery_code_expires_at?->isFuture() || ! $so->delivery_code_encrypted) {
            return null;
        }

        return Crypt::decryptString($so->delivery_code_encrypted);
    }

    public function reissue(StoreOrder $input, User $buyer): StoreOrder
    {
        return DB::transaction(function () use ($input, $buyer) {
            $so = $this->totals->locked($input);
            $this->totals->authorize($so, $buyer, 'buyer');
            abort_unless($so->payment_status === 'paid' && in_array($so->status, ['paid', 'processing', 'out_for_delivery']), 409, 'Delivery code is unavailable at this stage.');
            abort_if($so->delivery_code_issued_at?->gt(now()->subMinute()) || $so->delivery_code_locked_until?->isFuture(), 429, 'Please wait before requesting a new delivery code.');
            $this->issue($so);

            return $so;
        }, 5);
    }

    public function advance(StoreOrder $input, User $actor, string $status): StoreOrder
    {
        return DB::transaction(function () use ($input, $actor, $status) {
            $so = $this->totals->locked($input);
            if (! $actor->isAdmin()) {
                $this->totals->authorize($so, $actor, 'seller');
            }
            abort_unless($so->payment_status === 'paid' && $so->escrow?->status === 'locked', 409, 'Confirmed payment and locked escrow are required.');
            if ($so->status === $status) {
                return $so;
            }
            abort_unless(in_array($status, ['processing', 'out_for_delivery']) && in_array($so->status, ['paid', 'processing']), 409, 'Invalid fulfillment transition.');
            $so->update(['status' => $status] + ($status === 'out_for_delivery' ? ['out_for_delivery_at' => now()] : []));

            return $so;
        }, 5);
    }

    public function verify(StoreOrder $input, User $actor, string $code): StoreOrder
    {
        $result = DB::transaction(function () use ($input, $actor, $code) {
            $so = $this->totals->locked($input);
            if (! $actor->isAdmin()) {
                $this->totals->authorize($so, $actor, 'seller');
            }
            if ($so->status === 'delivered' && $so->delivery_verified_at) {
                return $so;
            }
            abort_unless($so->status === 'out_for_delivery' && $so->payment_status === 'paid', 409, 'Paid order must be out for delivery.');
            if ($so->delivery_code_locked_until?->isFuture()) {
                return ['error' => 'Too many attempts. Please try again later.', 'status' => 429];
            }
            if (! $so->delivery_code_expires_at?->isFuture()) {
                return ['error' => 'Delivery code expired. Ask the buyer to request a new code.', 'status' => 422];
            }
            if (! $so->delivery_code_hash || ! Hash::check($code, $so->delivery_code_hash)) {
                $attempts = $so->delivery_code_locked_until ? 1 : $so->delivery_code_attempts + 1;
                $so->update(['delivery_code_attempts' => $attempts, 'delivery_code_locked_until' => $attempts >= config('marketplace.delivery_code_attempts')
                    ? now()->addMinutes(config('marketplace.delivery_code_lock_minutes')) : null]);

                return ['error' => 'Delivery code could not be verified.', 'status' => 422];
            }
            $so->update(['status' => 'delivered', 'delivered_at' => now(), 'delivery_verified_at' => now(), 'delivery_code_encrypted' => null]);
            app(BuyerWalletService::class)->locked($so->order->user);
            $this->escrows->releaseEscrow($so);
            $order = $so->order;
            if (! $order->rewards_awarded_at && ! $order->storeOrders()->whereNotIn('status', ['delivered', 'cancelled', 'refunded'])->exists()) {
                app(BuyerWalletService::class)->locked($order->user);
                if (! PointTransaction::where('reference_type', 'order')->where('reference_id', $order->id)->where('type', 'earn')->exists()) {
                    app(PointService::class)->earnFromPurchase($order);
                }
                $order->update(['rewards_awarded_at' => now()]);
                $points = Money::cents(PointTransaction::where('reference_type', 'order')->where('reference_id', $order->id)->where('type', 'earn')->sum('points'));
                $shipments = $order->storeOrders()->where('status', 'delivered')->orderBy('id')->get();
                $subtotal = $shipments->sum(fn ($shipment) => Money::cents($shipment->subtotal));
                foreach ($shipments as $shipment) {
                    $part = Money::cents($shipment->subtotal);
                    $share = $subtotal ? intdiv($points * $part, $subtotal) : 0;
                    $shipment->update(['reward_points' => Money::decimal($share)]);
                    $subtotal -= $part;
                    $points -= $share;
                }
            }
            $this->totals->sync($order);
            app(\App\Services\Referrals\ReferralService::class)->markDelivered($so);

            return $so->fresh(['escrow']);
        }, 5);
        // Commit invalid attempts before returning the error.
        if (is_array($result)) {
            abort($result['status'], $result['error']);
        }

        return $result;
    }
}

<?php

namespace App\Services\Marketplace;

use App\Models\Order;
use App\Models\StoreOrder;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class OrderTotalsService
{
    public function allocate(Order $order, mixed $discount, mixed $points): void
    {
        $shipments = $order->storeOrders()->orderBy('id')->get();
        $subtotal = $shipments->sum(fn ($so) => Money::cents($so->subtotal));
        $discountLeft = Money::cents(round($discount, 2));
        $pointsLeft = Money::cents(round($points, 2));
        foreach ($shipments as $so) {
            $part = Money::cents($so->subtotal);
            $share = $subtotal ? intdiv($discountLeft * $part, $subtotal) : 0;
            $pointShare = $subtotal ? intdiv($pointsLeft * $part, $subtotal) : 0;
            $so->update(['discount_total' => Money::decimal($share), 'redeemed_points' => Money::decimal($pointShare),
                'total' => Money::decimal($part - $share)]);
            $discountLeft -= $share;
            $pointsLeft -= $pointShare;
            $subtotal -= $part;
        }
    }

    /**
     * Coupons are already attached to their eligible StoreOrder. Points are
     * allocated afterward and must not overwrite that seller-specific amount.
     */
    public function allocateAdditionalPoints(Order $order, int $pointDiscountCents, float $pointsUsed): void
    {
        $shipments = $order->storeOrders()->orderBy('id')->get();
        $remainingBase = $shipments->sum(fn ($shipment) => max(0, Money::cents($shipment->subtotal) - Money::cents($shipment->coupon_discount ?? 0)));
        $discountLeft = $pointDiscountCents;
        $pointsLeft = Money::cents($pointsUsed);

        foreach ($shipments as $shipment) {
            $base = max(0, Money::cents($shipment->subtotal) - Money::cents($shipment->coupon_discount ?? 0));
            $cashShare = $remainingBase ? intdiv($discountLeft * $base, $remainingBase) : 0;
            $pointShare = $remainingBase ? intdiv($pointsLeft * $base, $remainingBase) : 0;
            $existingDiscount = Money::cents($shipment->discount_total);
            $shipment->update([
                'discount_total' => Money::decimal($existingDiscount + $cashShare),
                'redeemed_points' => Money::decimal($pointShare),
                'total' => Money::decimal(max(0, Money::cents($shipment->total) - $cashShare)),
            ]);
            $discountLeft -= $cashShare;
            $pointsLeft -= $pointShare;
            $remainingBase -= $base;
        }
    }

    // All order mutations lock the parent first, then its shipments by ID.
    public function locked(StoreOrder $input): StoreOrder
    {
        Order::whereKey($input->order_id)->lockForUpdate()->firstOrFail();

        return StoreOrder::where('order_id', $input->order_id)->orderBy('id')->lockForUpdate()->get()->firstWhere('id', $input->id);
    }

    public function authorize(StoreOrder $so, User $actor, string $role): void
    {
        abort_unless($actor->role === $role && ($role === 'buyer'
            ? $so->order->user_id === $actor->id : $so->store->user_id === $actor->id), 404, 'Order not found.');
    }

    public function sync(Order $order): Order
    {
        $all = $order->storeOrders()->get();
        $active = $all->whereNotIn('status', ['cancelled', 'refunded']);
        $sum = fn ($key) => $active->sum(fn ($so) => Money::cents($so->$key));
        $statuses = $active->pluck('payment_status');
        $payment = $active->isEmpty() ? ($all->contains('payment_status', 'refunded') ? 'refunded' : 'cancelled')
            : ($statuses->contains('disputed') ? 'disputed'
            : ($statuses->every(fn ($s) => $s === 'paid') ? 'paid'
            : ($statuses->contains('paid') ? 'partially_paid' : 'pending')));
        $order->update([
            'items_total' => Money::decimal($sum('subtotal')), 'shipping_total' => Money::decimal($sum('delivery_fee')),
            'discount_total' => Money::decimal($sum('discount_total')), 'platform_fee' => 0,
            'grand_total' => Money::decimal($sum('total')), 'payment_status' => $payment,
        ]);

        return $order->fresh();
    }

    public function quote(StoreOrder $input, User $seller, array $data): StoreOrder
    {
        return DB::transaction(function () use ($input, $seller, $data) {
            $so = $this->locked($input);
            $this->authorize($so, $seller, 'seller');
            abort_unless((int) $so->financial_version === 1, 409, 'Legacy financial records require reconciliation before quoting.');
            $fee = Money::cents($data['delivery_fee']);
            abort_unless($fee >= 0 && $fee <= 10000000, 422, 'Invalid delivery fee.');
            $quote = ['delivery_fee' => Money::decimal($fee), 'delivery_method' => trim($data['delivery_method']),
                'estimated_delivery_date' => $data['estimated_delivery_date'], 'delivery_notes' => trim($data['delivery_notes'] ?? '')];
            $fingerprint = hash('sha256', json_encode($quote));
            if ($so->quote_key) {
                abort_unless($so->quote_key === $data['idempotency_key'] && $so->quote_fingerprint === $fingerprint,
                    409, 'This order already has a shipping quote.');

                return $so;
            }
            abort_unless($so->status === 'pending' && $so->payment_status === 'pending', 409, 'Order is not awaiting seller review.');
            $subtotal = $so->items()->get()->sum(fn ($item) => Money::cents($item->line_total));
            abort_unless($subtotal === Money::cents($so->subtotal), 409, 'Order items and subtotal do not match.');
            $shippingDiscount = app(\App\Services\Coupon\CouponService::class)->shippingDiscountForQuote($so, $fee);
            $couponShipping = max(Money::cents($so->coupon_shipping_discount ?? 0), $shippingDiscount);
            $discountTotal = Money::cents($so->discount_total) + ($couponShipping - Money::cents($so->coupon_shipping_discount ?? 0));
            $so->update($quote + ['status' => 'awaiting_payment', 'financial_version' => 1,
                'subtotal' => Money::decimal($subtotal), 'coupon_shipping_discount' => Money::decimal($couponShipping),
                'discount_total' => Money::decimal($discountTotal), 'total' => Money::decimal($subtotal + $fee - $discountTotal),
                'quote_key' => $data['idempotency_key'], 'quote_fingerprint' => $fingerprint, 'accepted_at' => now()]);
            if ($shippingDiscount > 0 && is_array($so->coupon_snapshot)) {
                $so->update(['coupon_snapshot' => array_merge($so->coupon_snapshot, [
                    'shipping_discount' => Money::decimal($couponShipping),
                    'discount_amount' => Money::decimal(Money::cents($so->coupon_discount ?? 0)),
                ])]);
            }
            $this->sync($so->order);

            return $so->fresh();
        }, 5);
    }
}

<?php

namespace App\Services\Coupon;

use App\Models\Coupon;
use App\Models\CouponUsage;
use App\Models\Order;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CouponService
{
    /**
     * Validate coupon code.
     */
    public function validateCoupon(string $code, int $userId, float $orderTotal): array
    {
        $coupon = Coupon::where('code', $code)
            ->where('is_active', true)
            ->first();

        if (!$coupon) {
            return [
                'valid' => false,
                'message' => 'Invalid coupon code.',
            ];
        }

        if (!$coupon->isValid()) {
            return [
                'valid' => false,
                'message' => 'This coupon is no longer valid.',
            ];
        }

        if (!$coupon->canBeUsedBy($userId)) {
            return [
                'valid' => false,
                'message' => 'You have reached the maximum usage limit for this coupon.',
            ];
        }

        if ($coupon->min_order_amount && $orderTotal < $coupon->min_order_amount) {
            return [
                'valid' => false,
                'message' => "Minimum order amount of €{$coupon->min_order_amount} required.",
            ];
        }

        $discountAmount = $coupon->calculateDiscount($orderTotal);

        return [
            'valid' => true,
            'coupon' => $coupon,
            'discount_amount' => $discountAmount,
            'message' => 'Coupon applied successfully.',
        ];
    }

    /**
     * Apply coupon to order.
     */
    public function applyCoupon(Order $order, Coupon $coupon): CouponUsage
    {
        try {
            DB::beginTransaction();

            $orderTotal = (float) $order->items_total;
            $discountAmount = $coupon->calculateDiscount($orderTotal);

            // Create coupon usage record
            $usage = CouponUsage::create([
                'coupon_id' => $coupon->id,
                'user_id' => $order->user_id,
                'order_id' => $order->id,
                'discount_amount' => $discountAmount,
                'order_total' => $orderTotal,
            ]);

            // Update order discount
            $order->update([
                'discount_total' => $discountAmount,
                'grand_total' => $order->items_total + $order->shipping_total - $discountAmount,
                'meta' => array_merge($order->meta ?? [], [
                    'coupon_id' => $coupon->id,
                    'coupon_code' => $coupon->code,
                ]),
            ]);

            DB::commit();

            return $usage;
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to apply coupon: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Get coupon statistics for a store.
     */
    public function getStoreCouponStats(int $storeId): array
    {
        $coupons = Coupon::where('store_id', $storeId)->get();

        $totalCoupons = $coupons->count();
        $activeCoupons = $coupons->where('is_active', true)->count();
        $totalUsages = CouponUsage::whereIn('coupon_id', $coupons->pluck('id'))->count();
        $totalDiscountGiven = CouponUsage::whereIn('coupon_id', $coupons->pluck('id'))
            ->sum('discount_amount');

        return [
            'total_coupons' => $totalCoupons,
            'active_coupons' => $activeCoupons,
            'total_usages' => $totalUsages,
            'total_discount_given' => (float) $totalDiscountGiven,
        ];
    }
}

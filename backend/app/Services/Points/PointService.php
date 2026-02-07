<?php

namespace App\Services\Points;

use App\Models\PointTransaction;
use App\Models\PointRule;
use App\Models\User;
use App\Models\Wallet;
use App\Models\Order;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PointService
{
    /**
     * Get user's current points balance.
     */
    public function getBalance(User $user): float
    {
        $wallet = Wallet::firstOrCreate(
            ['user_id' => $user->id],
            [
                'shopping_balance' => 0,
                'reward_balance' => 0,
                'referral_balance' => 0,
                'loyality_points' => 0,
                'ad_credit' => 0,
            ]
        );

        return (float) $wallet->loyality_points;
    }

    /**
     * Earn points from purchase.
     */
    public function earnFromPurchase(Order $order): void
    {
        $rule = PointRule::getActiveRule('purchase');
        if (!$rule || !$rule->points_per_euro) {
            return;
        }

        $orderTotal = (float) $order->items_total;
        
        if ($rule->min_purchase_amount && $orderTotal < $rule->min_purchase_amount) {
            return;
        }

        $points = $orderTotal * $rule->points_per_euro;
        
        if ($rule->max_points_per_transaction) {
            $points = min($points, $rule->max_points_per_transaction);
        }

        $expiresAt = null;
        if ($rule->points_expiry_days) {
            $expiresAt = now()->addDays($rule->points_expiry_days);
        }

        $this->addPoints(
            $order->user,
            $points,
            'earn',
            "Points earned from order #{$order->order_no}",
            'order',
            $order->id,
            $expiresAt
        );
    }

    /**
     * Earn points from referral.
     */
    public function earnFromReferral(User $user, User $referredUser): void
    {
        $rule = PointRule::getActiveRule('referral');
        if (!$rule || !$rule->fixed_points) {
            return;
        }

        $expiresAt = null;
        if ($rule->points_expiry_days) {
            $expiresAt = now()->addDays($rule->points_expiry_days);
        }

        $this->addPoints(
            $user,
            $rule->fixed_points,
            'referral',
            "Referral bonus for referring {$referredUser->name}",
            'user',
            $referredUser->id,
            $expiresAt
        );
    }

    /**
     * Earn points from review.
     */
    public function earnFromReview(User $user, int $reviewId): void
    {
        $rule = PointRule::getActiveRule('review');
        if (!$rule || !$rule->fixed_points) {
            return;
        }

        $expiresAt = null;
        if ($rule->points_expiry_days) {
            $expiresAt = now()->addDays($rule->points_expiry_days);
        }

        $this->addPoints(
            $user,
            $rule->fixed_points,
            'review',
            'Points earned for product review',
            'review',
            $reviewId,
            $expiresAt
        );
    }

    /**
     * Earn signup bonus.
     */
    public function earnSignupBonus(User $user): void
    {
        $rule = PointRule::getActiveRule('signup');
        if (!$rule || !$rule->fixed_points) {
            return;
        }

        $expiresAt = null;
        if ($rule->points_expiry_days) {
            $expiresAt = now()->addDays($rule->points_expiry_days);
        }

        $this->addPoints(
            $user,
            $rule->fixed_points,
            'signup',
            'Welcome bonus points',
            null,
            null,
            $expiresAt
        );
    }

    /**
     * Redeem points for discount.
     */
    public function redeemPoints(User $user, float $points, Order $order = null): array
    {
        $rule = PointRule::getActiveRule('redemption');
        if (!$rule) {
            throw new \Exception('Point redemption rules not configured');
        }

        if ($points < $rule->min_redemption_points) {
            throw new \Exception("Minimum {$rule->min_redemption_points} points required for redemption");
        }

        $currentBalance = $this->getBalance($user);
        if ($currentBalance < $points) {
            throw new \Exception('Insufficient points balance');
        }

        // Calculate discount amount
        $discountAmount = $points / $rule->redemption_rate;

        // Check max redemption per order
        if ($rule->max_redemption_per_order && $discountAmount > $rule->max_redemption_per_order) {
            $discountAmount = $rule->max_redemption_per_order;
            $points = $discountAmount * $rule->redemption_rate;
        }

        DB::beginTransaction();
        try {
            // Deduct points
            $wallet = Wallet::where('user_id', $user->id)->firstOrFail();
            $wallet->decrement('loyality_points', $points);
            $newBalance = (float) $wallet->fresh()->loyality_points;

            // Create transaction record
            PointTransaction::create([
                'user_id' => $user->id,
                'type' => 'redeem',
                'points' => -$points,
                'balance_after' => $newBalance,
                'description' => $order ? "Points redeemed for order #{$order->order_no}" : 'Points redeemed',
                'reference_type' => $order ? 'order' : null,
                'reference_id' => $order?->id,
            ]);

            DB::commit();

            return [
                'points_used' => $points,
                'discount_amount' => $discountAmount,
                'new_balance' => $newBalance,
            ];
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Point redemption failed: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Add points to user.
     */
    private function addPoints(
        User $user,
        float $points,
        string $type,
        string $description,
        ?string $referenceType,
        ?int $referenceId,
        ?\DateTime $expiresAt
    ): void {
        DB::beginTransaction();
        try {
            $wallet = Wallet::firstOrCreate(
                ['user_id' => $user->id],
                [
                    'shopping_balance' => 0,
                    'reward_balance' => 0,
                    'referral_balance' => 0,
                    'loyality_points' => 0,
                    'ad_credit' => 0,
                ]
            );

            $wallet->increment('loyality_points', $points);
            $newBalance = (float) $wallet->fresh()->loyality_points;

            PointTransaction::create([
                'user_id' => $user->id,
                'type' => $type,
                'points' => $points,
                'balance_after' => $newBalance,
                'description' => $description,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'expires_at' => $expiresAt,
            ]);

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to add points: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Get point transactions for user.
     */
    public function getTransactions(User $user, int $limit = 50): array
    {
        return PointTransaction::where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get()
            ->toArray();
    }

    /**
     * Get available points (non-expired).
     */
    public function getAvailablePoints(User $user): float
    {
        $expiredPoints = PointTransaction::where('user_id', $user->id)
            ->where('type', 'earn')
            ->whereNotNull('expires_at')
            ->where('expires_at', '<', now())
            ->sum('points');

        $totalBalance = $this->getBalance($user);
        
        return max(0, $totalBalance - abs($expiredPoints));
    }
}

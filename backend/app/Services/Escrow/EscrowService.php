<?php

namespace App\Services\Escrow;

use App\Models\Escrow;
use App\Models\StoreOrder;
use App\Models\Wallet;
use App\Models\Transaction;
use App\Services\Points\PointService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class EscrowService
{
    public function __construct(
        private PointService $pointService
    ) {}

    /**
     * Create escrow when payment is received.
     */
    public function createEscrow(StoreOrder $storeOrder): Escrow
    {
        if ($storeOrder->status !== 'accepted') {
            throw new \Exception('Order must be accepted before creating escrow');
        }

        if ($storeOrder->escrow) {
            throw new \Exception('Escrow already exists for this order');
        }

        DB::beginTransaction();
        
        try {
            $escrow = Escrow::create([
                'order_id' => $storeOrder->order_id,
                'store_order_id' => $storeOrder->id,
                'amount' => $storeOrder->total,
                'shipping_fee' => $storeOrder->delivery_fee,
                'status' => 'locked',
                'locked_at' => now(),
            ]);

            // Update store order status to paid
            $storeOrder->update([
                'status' => 'paid',
                'paid_at' => now(),
            ]);

            // Update parent order payment status if all store orders are paid
            $order = $storeOrder->order;
            $allPaid = $order->storeOrders()->where('status', '!=', 'paid')->count() === 0;
            if ($allPaid) {
                $order->update(['payment_status' => 'paid']);
            }

            DB::commit();
            
            return $escrow;
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Escrow creation failed: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Release escrow when order is delivered.
     */
    public function releaseEscrow(StoreOrder $storeOrder): Escrow
    {
        $escrow = $storeOrder->escrow;
        
        if (!$escrow) {
            throw new \Exception('Escrow not found for this order');
        }

        if ($escrow->status === 'released') {
            throw new \Exception('Escrow already released');
        }

        DB::beginTransaction();
        
        try {
            // Update escrow status
            $escrow->update([
                'status' => 'released',
                'released_at' => now(),
            ]);

            // Get seller's wallet (store owner)
            $store = $storeOrder->store;
            $seller = $store->user;
            
            $wallet = Wallet::firstOrCreate(
                ['user_id' => $seller->id],
                [
                    'shopping_balance' => 0,
                    'reward_balance' => 0,
                    'referral_balance' => 0,
                    'loyality_points' => 0,
                    'ad_credit' => 0,
                ]
            );

            // Add funds to seller's shopping balance
            $wallet->increment('shopping_balance', $escrow->amount);

            // Create transaction record
            Transaction::create([
                'user_id' => $seller->id,
                'type' => 'order_payment',
                'amount' => $escrow->amount,
                'status' => 'success',
                'description' => "Payment received for order #{$storeOrder->id}",
                'meta' => [
                    'order_id' => $storeOrder->order_id,
                    'store_order_id' => $storeOrder->id,
                    'escrow_id' => $escrow->id,
                ],
            ]);

            // Award points to buyer for completed order
            $order = $storeOrder->order;
            if ($order && $order->user) {
                try {
                    $this->pointService->earnFromPurchase($order);
                } catch (\Exception $e) {
                    // Log error but don't fail the escrow release
                    Log::error('Failed to award points for order: ' . $e->getMessage());
                }
            }

            DB::commit();
            
            return $escrow->fresh();
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Escrow release failed: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Get locked escrow balance for buyer.
     */
    public function getLockedEscrowBalance($userId): float
    {
        return Escrow::whereHas('storeOrder.order', function ($query) use ($userId) {
            $query->where('user_id', $userId);
        })
        ->where('status', 'locked')
        ->sum('amount');
    }
}


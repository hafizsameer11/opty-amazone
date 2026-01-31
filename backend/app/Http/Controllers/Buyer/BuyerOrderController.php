<?php

namespace App\Http\Controllers\Buyer;

use App\Http\Controllers\Controller;
use App\Helpers\ResponseHelper;
use App\Services\Escrow\EscrowService;
use App\Mail\OrderPaidMail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;

class BuyerOrderController extends Controller
{
    protected $escrowService;

    public function __construct(EscrowService $escrowService)
    {
        $this->escrowService = $escrowService;
    }

    /**
     * Get all orders for buyer.
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        
        $orders = \App\Models\Order::where('user_id', $user->id)
            ->with(['storeOrders.store', 'storeOrders.items.product'])
            ->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 15));

        return ResponseHelper::success($orders, 'Orders retrieved successfully');
    }

    /**
     * Get order details.
     */
    public function show($id)
    {
        $user = Auth::user();
        
        $order = \App\Models\Order::where('user_id', $user->id)
            ->with(['storeOrders.store', 'storeOrders.items.product', 'storeOrders.escrow'])
            ->findOrFail($id);

        return ResponseHelper::success($order, 'Order retrieved successfully');
    }

    /**
     * Get all store orders for buyer.
     */
    public function storeOrders(Request $request)
    {
        $user = Auth::user();
        
        $storeOrders = \App\Models\StoreOrder::whereHas('order', function ($query) use ($user) {
            $query->where('user_id', $user->id);
        })
        ->with(['store', 'items.product', 'escrow', 'order'])
        ->orderBy('created_at', 'desc')
        ->paginate($request->get('per_page', 15));

        return ResponseHelper::success($storeOrders, 'Store orders retrieved successfully');
    }

    /**
     * Get store order details (includes OTP code).
     */
    public function showStoreOrder($id)
    {
        $user = Auth::user();
        
        $storeOrder = \App\Models\StoreOrder::whereHas('order', function ($query) use ($user) {
            $query->where('user_id', $user->id);
        })
        ->with(['store', 'items.product', 'escrow', 'order', 'deliveryAddress'])
        ->findOrFail($id);

        return ResponseHelper::success($storeOrder, 'Store order retrieved successfully');
    }

    /**
     * Pay for store order.
     */
    public function payStoreOrder(Request $request, $storeOrderId)
    {
        $request->validate([
            'payment_method' => 'required|in:card,wallet',
        ]);

        $user = Auth::user();
        
        $storeOrder = \App\Models\StoreOrder::whereHas('order', function ($query) use ($user) {
            $query->where('user_id', $user->id);
        })->findOrFail($storeOrderId);

        if ($storeOrder->status !== 'accepted') {
            return ResponseHelper::error('Order must be accepted before payment', null, 400);
        }

        if ($storeOrder->status === 'paid') {
            return ResponseHelper::error('Order already paid', null, 400);
        }

        try {
            // Handle payment based on method
            if ($request->payment_method === 'wallet') {
                $wallet = \App\Models\Wallet::firstOrCreate(
                    ['user_id' => $user->id],
                    [
                        'shopping_balance' => 0,
                        'reward_balance' => 0,
                        'referral_balance' => 0,
                        'loyality_points' => 0,
                        'ad_credit' => 0,
                    ]
                );

                if ($wallet->shopping_balance < $storeOrder->total) {
                    return ResponseHelper::error('Insufficient wallet balance', null, 400);
                }

                // Deduct from wallet
                $wallet->decrement('shopping_balance', $storeOrder->total);

                // Create transaction
                \App\Models\Transaction::create([
                    'user_id' => $user->id,
                    'type' => 'order_payment',
                    'amount' => -$storeOrder->total,
                    'status' => 'success',
                    'description' => "Payment for order #{$storeOrder->id}",
                    'meta' => [
                        'store_order_id' => $storeOrder->id,
                        'order_id' => $storeOrder->order_id,
                    ],
                ]);
            } else {
                // Card payment - would integrate with payment gateway
                // For now, just proceed with escrow creation
            }

            // Create escrow
            $escrow = $this->escrowService->createEscrow($storeOrder);

            // Send email notification
            Mail::to($storeOrder->store->user->email)->send(new OrderPaidMail($storeOrder));

            return ResponseHelper::success([
                'store_order' => $storeOrder->fresh(['escrow']),
                'escrow' => $escrow,
            ], 'Payment successful');
        } catch (\Exception $e) {
            return ResponseHelper::error($e->getMessage());
        }
    }

    /**
     * Cancel store order.
     */
    public function cancelStoreOrder($storeOrderId)
    {
        $user = Auth::user();
        
        $storeOrder = \App\Models\StoreOrder::whereHas('order', function ($query) use ($user) {
            $query->where('user_id', $user->id);
        })->findOrFail($storeOrderId);

        if (!in_array($storeOrder->status, ['pending', 'accepted'])) {
            return ResponseHelper::error('Order cannot be cancelled at this stage', null, 400);
        }

        $storeOrder->update(['status' => 'cancelled']);

        return ResponseHelper::success($storeOrder, 'Order cancelled successfully');
    }

    /**
     * Get payment info for order.
     */
    public function paymentInfo($orderId)
    {
        $user = Auth::user();
        
        $order = \App\Models\Order::where('user_id', $user->id)
            ->with('storeOrders')
            ->findOrFail($orderId);

        $unpaidStoreOrders = $order->storeOrders()->where('status', 'accepted')->get();

        return ResponseHelper::success([
            'order' => $order,
            'unpaid_store_orders' => $unpaidStoreOrders,
            'total_due' => $unpaidStoreOrders->sum('total'),
        ], 'Payment info retrieved');
    }
}


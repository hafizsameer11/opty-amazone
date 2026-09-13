<?php

namespace App\Http\Controllers\Buyer;

use App\Http\Controllers\Controller;
use App\Helpers\ResponseHelper;
use App\Services\Escrow\EscrowService;
use App\Services\Order\OrderService;
use App\Mail\OrderPaidMail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;

class BuyerOrderController extends Controller
{
    public function __construct(
        protected EscrowService $escrowService,
        protected OrderService $orderService
    ) {}

    /**
     * Get all orders for buyer.
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        
        $orders = \App\Models\Order::where('user_id', $user->id)
            ->with(['storeOrders.store', 'storeOrders.items.product', 'storeOrders.items.variant'])
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
            ->with(['storeOrders.store', 'storeOrders.items.product', 'storeOrders.items.variant', 'storeOrders.escrow'])
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
        ->with(['store', 'items.product', 'items.variant', 'escrow', 'order'])
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
        ->with(['store', 'items.product', 'items.variant', 'escrow', 'order', 'deliveryAddress'])
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
                // Atomic balance guard also protects concurrent ad reservations.
                if (!\App\Models\Wallet::whereKey($wallet->id)->where('shopping_balance', '>=', $storeOrder->total)
                    ->decrement('shopping_balance', $storeOrder->total)) {
                    return ResponseHelper::error('Insufficient wallet balance', null, 400);
                }

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

        try {
            $updated = $this->orderService->cancelStoreOrderByBuyer($storeOrder);

            return ResponseHelper::success($updated, 'Order cancelled successfully');
        } catch (\RuntimeException $e) {
            return ResponseHelper::error($e->getMessage(), null, 400);
        }
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

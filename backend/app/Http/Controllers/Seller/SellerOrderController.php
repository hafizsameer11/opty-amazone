<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;
use App\Helpers\ResponseHelper;
use App\Services\Order\OrderService;
use App\Mail\OrderAcceptedMail;
use App\Mail\OrderRejectedMail;
use App\Mail\OrderOutForDeliveryMail;
use App\Mail\OrderDeliveredMail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;

class SellerOrderController extends Controller
{
    protected $orderService;

    public function __construct(OrderService $orderService)
    {
        $this->orderService = $orderService;
    }

    /**
     * Get all store orders.
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $store = $user->store;

        if (!$store) {
            return ResponseHelper::error('Store not found', null, 404);
        }

        $query = \App\Models\StoreOrder::where('store_id', $store->id)
            ->with([
                'order' => function ($query) {
                    $query->with('user');
                },
                'items' => function ($query) {
                    $query->with('product');
                }
            ]);

        // Filter by status
        if ($request->has('status') && $request->status !== '') {
            $query->where('status', $request->status);
        }

        $orders = $query->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 15));

        return ResponseHelper::success($orders, 'Orders retrieved successfully');
    }

    /**
     * Get order details.
     */
    public function show($id)
    {
        $user = Auth::user();
        $store = $user->store;

        if (!$store) {
            return ResponseHelper::error('Store not found', null, 404);
        }

        $storeOrder = \App\Models\StoreOrder::where('store_id', $store->id)
            ->with([
                'order' => function ($query) {
                    $query->with('user');
                },
                'items' => function ($query) {
                    $query->with('product');
                },
                'deliveryAddress',
                'escrow'
            ])
            ->findOrFail($id);

        return ResponseHelper::success($storeOrder, 'Order retrieved successfully');
    }

    /**
     * Get pending orders.
     */
    public function pending(Request $request)
    {
        $user = Auth::user();
        $store = $user->store;

        if (!$store) {
            return ResponseHelper::error('Store not found', null, 404);
        }

        $orders = \App\Models\StoreOrder::where('store_id', $store->id)
            ->where('status', 'pending')
            ->with([
                'order' => function ($query) {
                    $query->with('user');
                },
                'items' => function ($query) {
                    $query->with('product');
                },
                'deliveryAddress'
            ])
            ->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 15));

        return ResponseHelper::success($orders, 'Pending orders retrieved successfully');
    }

    /**
     * Accept order.
     */
    public function accept(Request $request, $id)
    {
        $request->validate([
            'delivery_fee' => 'required|numeric|min:0',
            'estimated_delivery_date' => 'nullable|date',
            'delivery_method' => 'nullable|string|max:255',
            'delivery_notes' => 'nullable|string',
        ]);

        $user = Auth::user();
        $store = $user->store;

        if (!$store) {
            return ResponseHelper::error('Store not found', null, 404);
        }

        $storeOrder = \App\Models\StoreOrder::where('store_id', $store->id)
            ->where('status', 'pending')
            ->findOrFail($id);

        try {
            $storeOrder = $this->orderService->acceptStoreOrder($storeOrder, $request->all());

            // Send email notification
            Mail::to($storeOrder->order->user->email)->send(new OrderAcceptedMail($storeOrder));

            return ResponseHelper::success($storeOrder->load(['order.user', 'items.product']), 'Order accepted successfully');
        } catch (\Exception $e) {
            return ResponseHelper::error($e->getMessage());
        }
    }

    /**
     * Reject order.
     */
    public function reject(Request $request, $id)
    {
        $request->validate([
            'reason' => 'required|string|max:1000',
        ]);

        $user = Auth::user();
        $store = $user->store;

        if (!$store) {
            return ResponseHelper::error('Store not found', null, 404);
        }

        $storeOrder = \App\Models\StoreOrder::where('store_id', $store->id)
            ->where('status', 'pending')
            ->findOrFail($id);

        try {
            $storeOrder = $this->orderService->rejectStoreOrder($storeOrder, $request->reason);

            // Send email notification
            Mail::to($storeOrder->order->user->email)->send(new OrderRejectedMail($storeOrder));

            return ResponseHelper::success($storeOrder->load(['order.user', 'items.product']), 'Order rejected');
        } catch (\Exception $e) {
            return ResponseHelper::error($e->getMessage());
        }
    }

    /**
     * Mark order as out for delivery.
     */
    public function outForDelivery($id)
    {
        $user = Auth::user();
        $store = $user->store;

        if (!$store) {
            return ResponseHelper::error('Store not found', null, 404);
        }

        $storeOrder = \App\Models\StoreOrder::where('store_id', $store->id)
            ->where('status', 'paid')
            ->findOrFail($id);

        try {
            $storeOrder = $this->orderService->markOutForDelivery($storeOrder);

            // Send email notification
            Mail::to($storeOrder->order->user->email)->send(new OrderOutForDeliveryMail($storeOrder));

            return ResponseHelper::success($storeOrder->load(['order.user', 'items.product']), 'Order marked as out for delivery');
        } catch (\Exception $e) {
            return ResponseHelper::error($e->getMessage());
        }
    }

    /**
     * Mark order as delivered (requires OTP).
     */
    public function delivered(Request $request, $id)
    {
        $request->validate([
            'delivery_code' => 'required|string|size:6',
        ]);

        $user = Auth::user();
        $store = $user->store;

        if (!$store) {
            return ResponseHelper::error('Store not found', null, 404);
        }

        $storeOrder = \App\Models\StoreOrder::where('store_id', $store->id)
            ->where('status', 'out_for_delivery')
            ->findOrFail($id);

        try {
            $storeOrder = $this->orderService->markDelivered($storeOrder, $request->delivery_code);

            // Send email notification
            Mail::to($storeOrder->order->user->email)->send(new OrderDeliveredMail($storeOrder));

            return ResponseHelper::success($storeOrder->load(['order.user', 'items.product', 'escrow']), 'Order marked as delivered');
        } catch (\Exception $e) {
            return ResponseHelper::error($e->getMessage());
        }
    }
}


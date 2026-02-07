<?php

namespace App\Http\Controllers\Admin;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminOrderController extends Controller
{
    /**
     * Get all orders.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Order::with('user', 'storeOrders.store');

        if ($request->has('status')) {
            $query->where('payment_status', $request->status);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('order_no', 'like', "%{$search}%")
                  ->orWhereHas('user', function ($userQuery) use ($search) {
                      $userQuery->where('name', 'like', "%{$search}%")
                                ->orWhere('email', 'like', "%{$search}%");
                  });
            });
        }

        $orders = $query->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 15));

        return ResponseHelper::success($orders, 'Orders retrieved successfully');
    }

    /**
     * Get order details.
     */
    public function show($id): JsonResponse
    {
        $order = Order::with([
            'user',
            'storeOrders.store',
            'storeOrders.items',
            'storeOrders.deliveryAddress',
        ])->findOrFail($id);

        return ResponseHelper::success($order, 'Order retrieved successfully');
    }

    /**
     * Update order status.
     */
    public function updateStatus(Request $request, $id): JsonResponse
    {
        $request->validate([
            'status' => 'required|in:pending,paid,refunded,cancelled',
        ]);

        $order = Order::findOrFail($id);
        $order->update(['payment_status' => $request->status]);

        return ResponseHelper::success($order->fresh(), 'Order status updated successfully');
    }
}

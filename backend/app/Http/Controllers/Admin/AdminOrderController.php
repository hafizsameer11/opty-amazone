<?php

namespace App\Http\Controllers\Admin;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminOrderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Order::with('user', 'storeOrders.store');

        if ($request->filled('payment_status')) {
            $query->where('payment_status', $request->payment_status);
        }

        if ($request->filled('search')) {
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
            ->paginate($request->integer('per_page', 15));

        return ResponseHelper::success($orders, 'Orders retrieved successfully');
    }

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

    public function updateStatus(Request $request, $id): JsonResponse
    {
        $request->validate([
            'payment_status' => 'required|in:pending,paid,failed,refunded,cancelled',
        ]);

        $order = Order::findOrFail($id);
        $order->update(['payment_status' => $request->payment_status]);

        return ResponseHelper::success($order->fresh(['user', 'storeOrders.store']), 'Order payment status updated');
    }
}

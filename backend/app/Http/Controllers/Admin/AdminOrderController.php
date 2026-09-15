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
            'storeOrders.escrow', 'storeOrders.payment.transaction', 'storeOrders.payment.refundTransaction',
        ])->findOrFail($id);

        return ResponseHelper::success($order, 'Order retrieved successfully');
    }

    public function updateStatus(Request $request, $id): JsonResponse
    {
        abort(422, 'Payment status is derived from verified payments and refunds. Use a shipment action.');
    }
}

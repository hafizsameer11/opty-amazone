<?php

namespace App\Http\Controllers\Admin;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Store;
use App\Models\Product;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class AdminDashboardController extends Controller
{
    /**
     * Get dashboard statistics.
     */
    public function index(): JsonResponse
    {
        $totalUsers = User::where('role', 'buyer')->count();
        $totalSellers = User::where('role', 'seller')->count();
        $totalProducts = Product::count();
        $totalOrders = Order::count();
        
        $totalRevenue = Order::where('payment_status', 'paid')
            ->sum('grand_total');

        $recentOrders = Order::with(['user', 'storeOrders'])
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get()
            ->map(function ($order) {
                return [
                    'id' => $order->id,
                    'order_no' => $order->order_no,
                    'customer_name' => $order->user->name,
                    'total' => (float) $order->grand_total,
                    'status' => $order->payment_status,
                    'created_at' => $order->created_at->toISOString(),
                ];
            });

        return ResponseHelper::success([
            'total_users' => $totalUsers,
            'total_sellers' => $totalSellers,
            'total_products' => $totalProducts,
            'total_orders' => $totalOrders,
            'total_revenue' => (float) $totalRevenue,
            'recent_orders' => $recentOrders,
        ], 'Dashboard statistics retrieved successfully');
    }
}

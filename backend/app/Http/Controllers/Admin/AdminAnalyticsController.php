<?php

namespace App\Http\Controllers\Admin;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\User;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminAnalyticsController extends Controller
{
    /**
     * Get analytics data.
     */
    public function index(Request $request): JsonResponse
    {
        $period = $request->get('period', 'month'); // day, week, month, year

        // Revenue analytics
        $revenueData = $this->getRevenueData($period);
        
        // User growth
        $userGrowth = $this->getUserGrowth($period);
        
        // Product performance
        $topProducts = Product::with('store')
            ->orderBy('view_count', 'desc')
            ->limit(10)
            ->get();

        // Sales trends
        $salesTrends = $this->getSalesTrends($period);

        return ResponseHelper::success([
            'revenue' => $revenueData,
            'user_growth' => $userGrowth,
            'top_products' => $topProducts,
            'sales_trends' => $salesTrends,
        ], 'Analytics retrieved successfully');
    }

    private function getRevenueData(string $period): array
    {
        $query = Order::where('payment_status', 'paid');

        switch ($period) {
            case 'day':
                $query->select(DB::raw('DATE(created_at) as date'), DB::raw('SUM(grand_total) as revenue'))
                      ->groupBy('date')
                      ->orderBy('date', 'asc');
                break;
            case 'week':
                $query->select(DB::raw('WEEK(created_at) as week'), DB::raw('SUM(grand_total) as revenue'))
                      ->groupBy('week')
                      ->orderBy('week', 'asc');
                break;
            case 'month':
                $query->select(DB::raw('MONTH(created_at) as month'), DB::raw('YEAR(created_at) as year'), DB::raw('SUM(grand_total) as revenue'))
                      ->groupBy('month', 'year')
                      ->orderBy('year', 'asc')
                      ->orderBy('month', 'asc');
                break;
            case 'year':
                $query->select(DB::raw('YEAR(created_at) as year'), DB::raw('SUM(grand_total) as revenue'))
                      ->groupBy('year')
                      ->orderBy('year', 'asc');
                break;
        }

        return $query->get()->toArray();
    }

    private function getUserGrowth(string $period): array
    {
        $query = User::select(DB::raw('DATE(created_at) as date'), DB::raw('COUNT(*) as count'))
            ->groupBy('date')
            ->orderBy('date', 'asc');

        if ($period === 'month') {
            $query->where('created_at', '>=', now()->subMonths(12));
        } elseif ($period === 'year') {
            $query->where('created_at', '>=', now()->subYears(5));
        }

        return $query->get()->toArray();
    }

    private function getSalesTrends(string $period): array
    {
        $query = Order::where('payment_status', 'paid')
            ->select(DB::raw('DATE(created_at) as date'), DB::raw('COUNT(*) as count'))
            ->groupBy('date')
            ->orderBy('date', 'asc');

        if ($period === 'month') {
            $query->where('created_at', '>=', now()->subMonths(12));
        }

        return $query->get()->toArray();
    }
}

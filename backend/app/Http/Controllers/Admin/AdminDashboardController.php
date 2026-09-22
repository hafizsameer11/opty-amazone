<?php

namespace App\Http\Controllers\Admin;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Models\AdCampaign;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\PlatformLedgerEntry;
use App\Models\Product;
use App\Models\Store;
use App\Models\StoreOrder;
use App\Models\SupportTicket;
use App\Models\User;
use App\Models\WarehouseOrder;
use App\Models\WarehouseProduct;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class AdminDashboardController extends Controller
{
    /**
     * Return the complete, read-only platform overview used by the Admin dashboard.
     * Marketplace buyer payments, boost-ad spend and warehouse purchases remain
     * separate sources so the dashboard never merges unlike financial flows.
     */
    public function index(Request $request): JsonResponse
    {
        $months = min(12, max(6, $request->integer('months', 9)));
        $periodStart = now()->startOfMonth()->subMonths($months - 1);
        $currentMonth = now()->startOfMonth();
        $previousMonth = $currentMonth->copy()->subMonth();

        $buyers = User::where('role', 'buyer');
        $sellers = User::where('role', 'seller');
        $products = Product::query();
        $orders = Order::query();

        $orderRevenue = (float) Order::where('payment_status', 'paid')->sum('grand_total');
        $adRevenue = (float) PlatformLedgerEntry::where('type', 'boost_ad_spend')->sum('amount');
        $warehouseRevenue = (float) WarehouseOrder::where('payment_status', 'paid')
            ->where('status', '!=', 'cancelled')
            ->sum('total');

        $trend = $this->revenueTrend($periodStart, $months);
        $orderStatuses = StoreOrder::select('status', DB::raw('COUNT(*) as count'))
            ->groupBy('status')
            ->orderByDesc('count')
            ->get()
            ->map(fn (StoreOrder $storeOrder) => [
                'status' => $storeOrder->status,
                'count' => (int) $storeOrder->count,
            ])
            ->values();

        $totals = [
            'total_users' => (int) ((clone $buyers)->count() + (clone $sellers)->count()),
            'total_sellers' => (int) (clone $sellers)->count(),
            'total_buyers' => (int) (clone $buyers)->count(),
            'total_products' => (int) $products->count(),
            'total_orders' => (int) $orders->count(),
            'total_revenue' => round($orderRevenue + $adRevenue + $warehouseRevenue, 2),
            'order_revenue' => round($orderRevenue, 2),
            'ad_revenue' => round($adRevenue, 2),
            'warehouse_revenue' => round($warehouseRevenue, 2),
        ];

        return ResponseHelper::success([
            'range_months' => $months,
            'period_start' => $periodStart->toDateString(),
            'totals' => $totals,
            'changes' => [
                'users' => $this->percentageChange(
                    User::whereIn('role', ['buyer', 'seller'])->whereBetween('created_at', [$currentMonth, now()])->count(),
                    User::whereIn('role', ['buyer', 'seller'])->whereBetween('created_at', [$previousMonth, $currentMonth])->count(),
                ),
                'sellers' => $this->percentageChange(
                    User::where('role', 'seller')->whereBetween('created_at', [$currentMonth, now()])->count(),
                    User::where('role', 'seller')->whereBetween('created_at', [$previousMonth, $currentMonth])->count(),
                ),
                'buyers' => $this->percentageChange(
                    User::where('role', 'buyer')->whereBetween('created_at', [$currentMonth, now()])->count(),
                    User::where('role', 'buyer')->whereBetween('created_at', [$previousMonth, $currentMonth])->count(),
                ),
                'products' => $this->percentageChange(
                    Product::whereBetween('created_at', [$currentMonth, now()])->count(),
                    Product::whereBetween('created_at', [$previousMonth, $currentMonth])->count(),
                ),
                'orders' => $this->percentageChange(
                    Order::whereBetween('created_at', [$currentMonth, now()])->count(),
                    Order::whereBetween('created_at', [$previousMonth, $currentMonth])->count(),
                ),
                'revenue' => $this->percentageChange(
                    $this->revenueForPeriod($currentMonth, now()),
                    $this->revenueForPeriod($previousMonth, $currentMonth),
                ),
            ],
            'revenue_sources' => [
                ['key' => 'orders', 'value' => round($orderRevenue, 2)],
                ['key' => 'ads', 'value' => round($adRevenue, 2)],
                ['key' => 'warehouse', 'value' => round($warehouseRevenue, 2)],
            ],
            'revenue_trend' => $trend,
            'order_statuses' => $orderStatuses,
            'warehouse' => [
                'total_stock' => (int) WarehouseProduct::where('is_active', true)->where('is_draft', false)->sum('stock_quantity'),
                'low_stock' => (int) WarehouseProduct::where('is_active', true)->where('is_draft', false)
                    ->where('stock_quantity', '>', 0)
                    ->whereColumn('stock_quantity', '<=', 'low_stock_threshold')
                    ->count(),
                'orders' => (int) WarehouseOrder::count(),
                'trend' => collect($trend)->map(fn (array $point) => [
                    'month' => $point['month'],
                    'label' => $point['label'],
                    'orders' => $point['warehouse_orders'],
                    'revenue' => $point['warehouse_revenue'],
                ])->values(),
            ],
            'best_selling_products' => $this->bestSellingProducts($periodStart),
            'recent_activity' => $this->recentActivity(),
            'operations' => [
                'open_orders' => StoreOrder::whereIn('status', ['pending', 'accepted', 'paid', 'processing', 'out_for_delivery'])->count(),
                'pending_seller_approvals' => Store::where('onboarding_status', 'pending_review')->count(),
                'pending_product_reviews' => Product::where('is_approved', false)->whereNull('rejection_reason')->count(),
                'open_support_tickets' => SupportTicket::whereNotIn('status', ['resolved', 'closed'])->count(),
            ],
        ], 'Dashboard statistics retrieved successfully.');
    }

    /** @return array<int, array<string, int|float|string>> */
    private function revenueTrend(Carbon $periodStart, int $months): array
    {
        $marketplaceOrders = Order::where('created_at', '>=', $periodStart)
            ->get(['created_at', 'payment_status', 'grand_total'])
            ->groupBy(fn (Order $order) => $order->created_at->format('Y-m'));
        $adEntries = PlatformLedgerEntry::where('type', 'boost_ad_spend')
            ->where('created_at', '>=', $periodStart)
            ->get(['created_at', 'amount'])
            ->groupBy(fn (PlatformLedgerEntry $entry) => $entry->created_at->format('Y-m'));
        $warehouseOrders = WarehouseOrder::where('created_at', '>=', $periodStart)
            ->get(['created_at', 'payment_status', 'status', 'total'])
            ->groupBy(fn (WarehouseOrder $order) => $order->created_at->format('Y-m'));

        return collect(range(0, $months - 1))->map(function (int $offset) use ($periodStart, $marketplaceOrders, $adEntries, $warehouseOrders) {
            $month = $periodStart->copy()->addMonths($offset);
            $key = $month->format('Y-m');
            $orders = $marketplaceOrders->get($key, collect());
            $warehouse = $warehouseOrders->get($key, collect());

            return [
                'month' => $key,
                'label' => $month->format('M'),
                'order_revenue' => round((float) $orders->where('payment_status', 'paid')->sum('grand_total'), 2),
                'ad_revenue' => round((float) $adEntries->get($key, collect())->sum('amount'), 2),
                'warehouse_revenue' => round((float) $warehouse->where('payment_status', 'paid')->where('status', '!=', 'cancelled')->sum('total'), 2),
                'orders' => (int) $orders->count(),
                'paid_orders' => (int) $orders->where('payment_status', 'paid')->count(),
                'warehouse_orders' => (int) $warehouse->count(),
            ];
        })->all();
    }

    /** @return Collection<int, array<string, int|float|string|null>> */
    private function bestSellingProducts(Carbon $periodStart): Collection
    {
        return OrderItem::query()
            ->join('store_orders', 'store_orders.id', '=', 'order_items.store_order_id')
            ->join('orders', 'orders.id', '=', 'store_orders.order_id')
            ->leftJoin('stores', 'stores.id', '=', 'store_orders.store_id')
            ->where('orders.payment_status', 'paid')
            ->where('orders.created_at', '>=', $periodStart)
            ->selectRaw('order_items.product_id, order_items.product_name, order_items.product_sku, COALESCE(MAX(stores.name), \'—\') as store_name, SUM(order_items.quantity) as units_sold, SUM(order_items.line_total) as revenue, COUNT(DISTINCT store_orders.id) as order_count')
            ->groupBy('order_items.product_id', 'order_items.product_name', 'order_items.product_sku')
            ->orderByDesc('units_sold')
            ->limit(5)
            ->get()
            ->map(fn ($item) => [
                'product_id' => $item->product_id ? (int) $item->product_id : null,
                'name' => (string) $item->product_name,
                'sku' => (string) $item->product_sku,
                'store_name' => (string) $item->store_name,
                'units_sold' => (int) $item->units_sold,
                'revenue' => round((float) $item->revenue, 2),
                'order_count' => (int) $item->order_count,
            ])
            ->values();
    }

    /** @return Collection<int, array<string, string|int|float|null>> */
    private function recentActivity(): Collection
    {
        $activities = collect();

        Order::with('user:id,name')->latest()->take(4)->get()->each(function (Order $order) use ($activities) {
            $activities->push([
                'kind' => 'order', 'reference' => $order->order_no, 'actor' => $order->user?->name,
                'amount' => (float) $order->grand_total, 'status' => $order->payment_status,
                'occurred_at' => $order->created_at->toISOString(),
            ]);
        });
        WarehouseOrder::with('seller:id,name')->latest()->take(4)->get()->each(function (WarehouseOrder $order) use ($activities) {
            $activities->push([
                'kind' => 'warehouse', 'reference' => $order->order_number, 'actor' => $order->seller?->name,
                'amount' => (float) $order->total, 'status' => $order->status,
                'occurred_at' => $order->created_at->toISOString(),
            ]);
        });
        AdCampaign::latest()->take(4)->get()->each(function (AdCampaign $campaign) use ($activities) {
            $activities->push([
                'kind' => 'campaign', 'reference' => $campaign->name, 'actor' => null,
                'amount' => (float) $campaign->spent_cents / 100, 'status' => $campaign->status,
                'occurred_at' => ($campaign->updated_at ?? $campaign->created_at)->toISOString(),
            ]);
        });
        Store::latest()->take(4)->get()->each(function (Store $store) use ($activities) {
            $activities->push([
                'kind' => 'seller', 'reference' => $store->name, 'actor' => null,
                'amount' => null, 'status' => $store->onboarding_status,
                'occurred_at' => $store->created_at->toISOString(),
            ]);
        });
        SupportTicket::latest()->take(4)->get()->each(function (SupportTicket $ticket) use ($activities) {
            $activities->push([
                'kind' => 'support', 'reference' => $ticket->ticket_no, 'actor' => $ticket->subject,
                'amount' => null, 'status' => $ticket->status,
                'occurred_at' => $ticket->updated_at->toISOString(),
            ]);
        });

        return $activities
            ->sortByDesc('occurred_at')
            ->take(8)
            ->values();
    }

    private function revenueForPeriod(Carbon $start, Carbon $end): float
    {
        return (float) Order::where('payment_status', 'paid')->whereBetween('created_at', [$start, $end])->sum('grand_total')
            + (float) PlatformLedgerEntry::where('type', 'boost_ad_spend')->whereBetween('created_at', [$start, $end])->sum('amount')
            + (float) WarehouseOrder::where('payment_status', 'paid')->where('status', '!=', 'cancelled')->whereBetween('created_at', [$start, $end])->sum('total');
    }

    private function percentageChange(float|int $current, float|int $previous): float
    {
        if ($previous == 0) return $current > 0 ? 100.0 : 0.0;

        return round((($current - $previous) / $previous) * 100, 1);
    }
}

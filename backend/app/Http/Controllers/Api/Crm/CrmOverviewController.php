<?php

namespace App\Http\Controllers\Api\Crm;

use App\Helpers\ResponseHelper;
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
use Illuminate\Support\Facades\Schema;

/**
 * Aggregated, read-only platform overview for the CRM.
 *
 * The revenue decomposition is deliberately identical to
 * AdminDashboardController: marketplace buyer payments, boost-ad spend and
 * warehouse purchases are three separate financial flows that are summed only
 * at the very end, so the CRM's "Total Revenue" matches the Admin Panel's.
 */
class CrmOverviewController extends CrmController
{
    public function index(Request $request): JsonResponse
    {
        $months = min(
            (int) config('crm.max_range_months', 24),
            max(1, $request->integer('months', (int) config('crm.default_range_months', 12)))
        );

        $periodStart = now()->startOfMonth()->subMonths($months - 1);
        $currentMonth = now()->startOfMonth();
        $previousMonth = $currentMonth->copy()->subMonth();

        [$from, $to] = $this->validateWindow($request);

        $buyers = User::where('role', 'buyer');
        $sellers = User::where('role', 'seller');

        // --- The three revenue sources, matching AdminDashboardController ---
        $orderRevenue = (float) Order::where('payment_status', 'paid')->sum('grand_total');
        $adRevenue = (float) PlatformLedgerEntry::where('type', 'boost_ad_spend')->sum('amount');
        $warehouseRevenue = (float) WarehouseOrder::where('payment_status', 'paid')
            ->where('status', '!=', 'cancelled')
            ->sum('total');

        $trend = $this->revenueTrend($periodStart, $months);

        return ResponseHelper::success([
            'generated_at' => now()->toISOString(),
            'range' => [
                'months' => $months,
                'period_start' => $periodStart->toDateString(),
                'window_from' => $from,
                'window_to' => $to,
            ],

            'totals' => [
                'total_users' => (int) ((clone $buyers)->count() + (clone $sellers)->count()),
                'total_sellers' => (int) (clone $sellers)->count(),
                'total_buyers' => (int) (clone $buyers)->count(),
                'total_admins' => (int) User::where('role', 'admin')->count(),
                'total_stores' => (int) Store::count(),
                'total_products' => (int) Product::count(),
                'total_orders' => (int) Order::count(),
                'paid_orders' => (int) Order::where('payment_status', 'paid')->count(),
                'total_revenue' => round($orderRevenue + $adRevenue + $warehouseRevenue, 2),
                'order_revenue' => round($orderRevenue, 2),
                'ad_revenue' => round($adRevenue, 2),
                'warehouse_revenue' => round($warehouseRevenue, 2),
            ],

            'revenue' => [
                'total' => round($orderRevenue + $adRevenue + $warehouseRevenue, 2),
                'from_orders' => round($orderRevenue, 2),
                'from_ads' => round($adRevenue, 2),
                'from_warehouse' => round($warehouseRevenue, 2),
                'sources' => [
                    ['key' => 'orders', 'label' => 'Marketplace orders', 'value' => round($orderRevenue, 2)],
                    ['key' => 'ads', 'label' => 'Boost ad spend', 'value' => round($adRevenue, 2)],
                    ['key' => 'warehouse', 'label' => 'Warehouse purchases', 'value' => round($warehouseRevenue, 2)],
                ],
                'currency' => 'EUR',
                'in_window' => round($this->revenueForWindow($from, $to), 2),
            ],

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

            'revenue_trend' => $trend,

            'order_statuses' => $this->orderStatuses(),

            'warehouse' => $this->warehouseSummary(),

            'best_selling_products' => $this->bestSellingProducts($periodStart),

            'recent_activity' => $this->recentActivity(),

            'operations' => [
                'open_orders' => (int) StoreOrder::whereIn('status', ['pending', 'accepted', 'paid', 'processing', 'out_for_delivery'])->count(),
                'pending_seller_approvals' => (int) Store::where('onboarding_status', 'pending_review')->count(),
                'pending_product_reviews' => (int) Product::where('is_approved', false)->whereNull('rejection_reason')->count(),
                'open_support_tickets' => (int) SupportTicket::whereNotIn('status', ['resolved', 'closed'])->count(),
            ],

            'ads' => $this->adsSummary(),
        ], 'Vista Express overview retrieved successfully.');
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

            $orderRevenue = (float) $orders->where('payment_status', 'paid')->sum('grand_total');
            $adRevenue = (float) $adEntries->get($key, collect())->sum('amount');
            $warehouseRevenue = (float) $warehouse->where('payment_status', 'paid')->where('status', '!=', 'cancelled')->sum('total');

            return [
                'month' => $key,
                'label' => $month->format('M Y'),
                'order_revenue' => round($orderRevenue, 2),
                'ad_revenue' => round($adRevenue, 2),
                'warehouse_revenue' => round($warehouseRevenue, 2),
                'total_revenue' => round($orderRevenue + $adRevenue + $warehouseRevenue, 2),
                'orders' => (int) $orders->count(),
                'paid_orders' => (int) $orders->where('payment_status', 'paid')->count(),
                'warehouse_orders' => (int) $warehouse->count(),
            ];
        })->all();
    }

    /** @return array<int, array<string, string|int>> */
    private function orderStatuses(): array
    {
        return StoreOrder::select('status', DB::raw('COUNT(*) as count'))
            ->groupBy('status')
            ->orderByDesc('count')
            ->get()
            ->map(fn ($row) => [
                'status' => (string) $row->status,
                'count' => (int) $row->count,
            ])
            ->values()
            ->all();
    }

    /**
     * `is_draft` is added by a migration that may not be applied on every
     * environment, so the published-product filter is built defensively. This
     * matches the Schema::hasTable() guard style already used in App\Models\User.
     */
    private function warehouseSummary(): array
    {
        $hasDrafts = Schema::hasColumn('warehouse_products', 'is_draft');

        $published = WarehouseProduct::where('is_active', true);
        if ($hasDrafts) {
            $published->where('is_draft', false);
        }

        return [
            'total_products' => (int) WarehouseProduct::count(),
            'published_products' => (int) (clone $published)->count(),
            'draft_products' => $hasDrafts
                ? (int) WarehouseProduct::where('is_draft', true)->count()
                : null,
            'total_stock' => (int) (clone $published)->sum('stock_quantity'),
            'low_stock' => (int) (clone $published)
                ->where('stock_quantity', '>', 0)
                ->whereColumn('stock_quantity', '<=', 'low_stock_threshold')
                ->count(),
            'out_of_stock' => (int) (clone $published)->where('stock_quantity', '<=', 0)->count(),
            'orders' => (int) WarehouseOrder::count(),
            'revenue' => round((float) WarehouseOrder::where('payment_status', 'paid')
                ->where('status', '!=', 'cancelled')
                ->sum('total'), 2),
        ];
    }

    /**
     * Boost-ad performance. The ads subsystem stores integer cents; everything
     * is converted to EUR here so the CRM receives one consistent unit.
     *
     * @return array<string, float|int>
     */
    private function adsSummary(): array
    {
        $row = AdCampaign::query()
            ->selectRaw('COUNT(*) as campaigns')
            ->selectRaw('COALESCE(SUM(budget_cents), 0) as budget_cents')
            ->selectRaw('COALESCE(SUM(spent_cents), 0) as spent_cents')
            ->selectRaw('COALESCE(SUM(revenue_cents), 0) as revenue_cents')
            ->selectRaw('COALESCE(SUM(impressions), 0) as impressions')
            ->selectRaw('COALESCE(SUM(clicks), 0) as clicks')
            ->selectRaw('COALESCE(SUM(conversions), 0) as conversions')
            ->first();

        $budget = (float) $row->budget_cents / 100;
        $spent = (float) $row->spent_cents / 100;
        $revenue = (float) $row->revenue_cents / 100;

        return [
            'campaigns' => (int) $row->campaigns,
            'active_campaigns' => (int) AdCampaign::where('status', 'active')->count(),
            'budget' => round($budget, 2),
            'spent' => round($spent, 2),
            'remaining' => round($budget - $spent, 2),
            'attributed_revenue' => round($revenue, 2),
            'impressions' => (int) $row->impressions,
            'clicks' => (int) $row->clicks,
            'ctr' => $row->impressions > 0 ? round((float) $row->clicks / (float) $row->impressions * 100, 2) : 0.0,
            'conversions' => (int) $row->conversions,
            'roas' => $spent > 0 ? round($revenue / $spent, 2) : 0.0,
            'currency' => 'EUR',
        ];
    }

    /** @return Collection<int, array<string, mixed>> */
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
            ->limit((int) config('crm.best_selling_limit', 10))
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

    /** @return Collection<int, array<string, mixed>> */
    private function recentActivity(): Collection
    {
        $limit = (int) config('crm.recent_activity_limit', 20);
        $take = (int) ceil($limit / 5) + 1;
        $activities = collect();

        Order::with('user:id,name')->latest()->take($take)->get()->each(function (Order $order) use ($activities) {
            $activities->push([
                'kind' => 'order', 'reference' => $order->order_no, 'actor' => $order->user?->name,
                'amount' => (float) $order->grand_total, 'currency' => 'EUR',
                'status' => $order->payment_status, 'occurred_at' => $order->created_at->toISOString(),
            ]);
        });

        WarehouseOrder::with('seller:id,name')->latest()->take($take)->get()->each(function (WarehouseOrder $order) use ($activities) {
            $activities->push([
                'kind' => 'warehouse', 'reference' => $order->order_number, 'actor' => $order->seller?->name,
                'amount' => (float) $order->total, 'currency' => 'EUR',
                'status' => $order->status, 'occurred_at' => $order->created_at->toISOString(),
            ]);
        });

        AdCampaign::latest()->take($take)->get()->each(function (AdCampaign $campaign) use ($activities) {
            $activities->push([
                'kind' => 'campaign', 'reference' => $campaign->name, 'actor' => null,
                // stored in cents
                'amount' => round((float) $campaign->spent_cents / 100, 2), 'currency' => 'EUR',
                'status' => $campaign->status,
                'occurred_at' => ($campaign->updated_at ?? $campaign->created_at)->toISOString(),
            ]);
        });

        Store::latest()->take($take)->get()->each(function (Store $store) use ($activities) {
            $activities->push([
                'kind' => 'seller', 'reference' => $store->name, 'actor' => null,
                'amount' => null, 'currency' => 'EUR',
                'status' => $store->onboarding_status, 'occurred_at' => $store->created_at->toISOString(),
            ]);
        });

        SupportTicket::latest()->take($take)->get()->each(function (SupportTicket $ticket) use ($activities) {
            $activities->push([
                'kind' => 'support', 'reference' => $ticket->ticket_no, 'actor' => $ticket->subject,
                'amount' => null, 'currency' => 'EUR',
                'status' => $ticket->status, 'occurred_at' => $ticket->updated_at->toISOString(),
            ]);
        });

        return $activities->sortByDesc('occurred_at')->take($limit)->values();
    }

    private function revenueForWindow(?string $from, ?string $to): float
    {
        $orders = Order::where('payment_status', 'paid');
        $ads = PlatformLedgerEntry::where('type', 'boost_ad_spend');
        $warehouse = WarehouseOrder::where('payment_status', 'paid')->where('status', '!=', 'cancelled');

        if ($from) {
            $orders->where('created_at', '>=', $from);
            $ads->where('created_at', '>=', $from);
            $warehouse->where('created_at', '>=', $from);
        }

        if ($to) {
            $orders->where('created_at', '<=', $to);
            $ads->where('created_at', '<=', $to);
            $warehouse->where('created_at', '<=', $to);
        }

        return (float) $orders->sum('grand_total')
            + (float) $ads->sum('amount')
            + (float) $warehouse->sum('total');
    }

    private function revenueForPeriod(Carbon $start, Carbon $end): float
    {
        return (float) Order::where('payment_status', 'paid')->whereBetween('created_at', [$start, $end])->sum('grand_total')
            + (float) PlatformLedgerEntry::where('type', 'boost_ad_spend')->whereBetween('created_at', [$start, $end])->sum('amount')
            + (float) WarehouseOrder::where('payment_status', 'paid')->where('status', '!=', 'cancelled')->whereBetween('created_at', [$start, $end])->sum('total');
    }

    private function percentageChange(float|int $current, float|int $previous): float
    {
        if ($previous == 0) {
            return $current > 0 ? 100.0 : 0.0;
        }

        return round((($current - $previous) / $previous) * 100, 1);
    }
}

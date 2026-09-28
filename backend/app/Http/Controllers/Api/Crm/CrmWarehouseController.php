<?php

namespace App\Http\Controllers\Api\Crm;

use App\Helpers\ResponseHelper;
use App\Models\WarehouseCategory;
use App\Models\WarehouseOrder;
use App\Models\WarehouseProduct;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

/**
 * Read-only warehouse view: stock, low-stock alerts, purchases and revenue.
 *
 * The warehouse is a separate supply channel from the marketplace, so its
 * revenue is never folded into seller revenue.
 */
class CrmWarehouseController extends CrmController
{
    public function overview(Request $request): JsonResponse
    {
        $hasDrafts = Schema::hasColumn('warehouse_products', 'is_draft');

        $published = WarehouseProduct::where('is_active', true);
        if ($hasDrafts) {
            $published->where('is_draft', false);
        }

        $lowStock = (clone $published)
            ->where('stock_quantity', '>', 0)
            ->whereColumn('stock_quantity', '<=', 'low_stock_threshold')
            ->orderBy('stock_quantity')
            ->limit(20)
            ->get(['id', 'name', 'sku', 'stock_quantity', 'low_stock_threshold'])
            ->map(fn (WarehouseProduct $product) => [
                'id' => (int) $product->id,
                'name' => (string) $product->name,
                'sku' => (string) $product->sku,
                'stock_quantity' => (int) $product->stock_quantity,
                'low_stock_threshold' => (int) $product->low_stock_threshold,
            ])->values();

        return ResponseHelper::success([
            'stats' => [
                'total_products' => (int) WarehouseProduct::count(),
                'published_products' => (int) (clone $published)->count(),
                'draft_products' => $hasDrafts ? (int) WarehouseProduct::where('is_draft', true)->count() : null,
                'total_stock' => (int) (clone $published)->sum('stock_quantity'),
                'low_stock_products' => (int) (clone $published)
                    ->where('stock_quantity', '>', 0)
                    ->whereColumn('stock_quantity', '<=', 'low_stock_threshold')
                    ->count(),
                'out_of_stock_products' => (int) (clone $published)->where('stock_quantity', '<=', 0)->count(),
                'orders' => (int) WarehouseOrder::count(),
                'revenue' => round((float) WarehouseOrder::where('payment_status', 'paid')
                    ->where('status', '!=', 'cancelled')
                    ->sum('total'), 2),
                'currency' => 'EUR',
            ],
            'low_stock' => $lowStock,
            'stock_by_category' => $this->stockByCategory(),
            'orders_trend' => $this->ordersTrend(),
            'top_sellers' => $this->topSellers(),
        ], 'Warehouse summary retrieved successfully.');
    }

    public function products(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'search' => 'nullable|string|max:120',
            'category_id' => 'nullable|integer',
            'availability' => 'nullable|in:all,in_stock,low_stock,out_of_stock',
        ]);

        $paging = $this->validatePagination($request);
        $hasDrafts = Schema::hasColumn('warehouse_products', 'is_draft');

        $query = WarehouseProduct::query()
            ->with('category:id,name')
            ->when($filters['search'] ?? null, function ($q, $search) {
                $q->where(function ($inner) use ($search) {
                    $inner->where('name', 'like', "%{$search}%")
                        ->orWhere('sku', 'like', "%{$search}%");
                });
            })
            ->when($filters['category_id'] ?? null, fn ($q, $id) => $q->where('warehouse_category_id', $id));

        match ($filters['availability'] ?? 'all') {
            'in_stock' => $query->where('stock_quantity', '>', 0),
            'out_of_stock' => $query->where('stock_quantity', '<=', 0),
            'low_stock' => $query->where('stock_quantity', '>', 0)
                ->whereColumn('stock_quantity', '<=', 'low_stock_threshold'),
            default => null,
        };

        if (($filters['availability'] ?? null) !== 'all' || ! $request->boolean('include_drafts')) {
            $query->where('is_active', true);
            if ($hasDrafts) {
                $query->where('is_draft', false);
            }
        }

        $paginator = $query->orderByDesc('created_at')
            ->paginate($paging['per_page'], ['*'], 'page', $paging['page']);

        $rows = collect($paginator->items())->map(fn (WarehouseProduct $product) => [
            'id' => (int) $product->id,
            'name' => (string) $product->name,
            'sku' => (string) $product->sku,
            'category' => $product->category?->name,
            'price' => round((float) $product->price, 2),
            'shipping_fee' => round((float) $product->shipping_fee, 2),
            'stock_quantity' => (int) $product->stock_quantity,
            'low_stock_threshold' => (int) $product->low_stock_threshold,
            'availability' => $product->stock_quantity <= 0
                ? 'out_of_stock'
                : ($product->stock_quantity <= $product->low_stock_threshold ? 'low_stock' : 'in_stock'),
            'is_active' => (bool) $product->is_active,
            'created_at' => $product->created_at?->toISOString(),
        ])->values();

        return $this->paginated(
            $paginator->setCollection($rows),
            [],
            [
                'categories' => WarehouseCategory::query()
                    ->where('is_active', true)
                    ->orderBy('name')
                    ->get(['id', 'name', 'type'])
                    ->map(fn (WarehouseCategory $category) => [
                        'id' => (int) $category->id,
                        'name' => (string) $category->name,
                        'type' => (string) $category->type,
                    ])->values()->all(),
                'availabilities' => ['all', 'in_stock', 'low_stock', 'out_of_stock'],
            ]
        );
    }

    public function orders(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'search' => 'nullable|string|max:120',
            'status' => 'nullable|string|max:40',
            'payment_status' => 'nullable|string|max:40',
        ]);

        $window = $this->validateWindow($request);
        $paging = $this->validatePagination($request);

        $query = WarehouseOrder::query()
            ->with('seller:id,name,email')
            ->withCount('items')
            ->when($filters['search'] ?? null, function ($q, $search) {
                $q->where('order_number', 'like', "%{$search}%");
            })
            ->when($filters['status'] ?? null, fn ($q, $status) => $q->where('status', $status))
            ->when($filters['payment_status'] ?? null, fn ($q, $status) => $q->where('payment_status', $status));

        $this->applyWindow($query, $window['from'], $window['to']);

        $paginator = $query->orderByDesc('created_at')
            ->paginate($paging['per_page'], ['*'], 'page', $paging['page']);

        $rows = collect($paginator->items())->map(fn (WarehouseOrder $order) => [
            'id' => (int) $order->id,
            'order_number' => (string) $order->order_number,
            'seller' => $order->seller ? [
                'id' => (int) $order->seller->id,
                'name' => (string) $order->seller->name,
                'email' => (string) $order->seller->email,
            ] : null,
            'status' => (string) $order->status,
            'payment_status' => (string) $order->payment_status,
            'subtotal' => round((float) $order->subtotal, 2),
            'shipping_fee' => round((float) $order->shipping_fee, 2),
            'total' => round((float) $order->total, 2),
            'currency' => 'EUR',
            'items_count' => (int) $order->items_count,
            'tracking_number' => $order->tracking_number,
            'shipping_carrier' => $order->shipping_carrier,
            'created_at' => $order->created_at?->toISOString(),
            'delivered_at' => $order->delivered_at?->toISOString(),
        ])->values();

        return $this->paginated(
            $paginator->setCollection($rows),
            [],
            [
                'statuses' => ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
                'payment_statuses' => ['paid', 'refunded'],
            ]
        );
    }

    /** @return array<string, int> */
    private function stockByCategory(): array
    {
        if (! Schema::hasColumn('warehouse_products', 'warehouse_category_id')) {
            return [];
        }

        return WarehouseProduct::query()
            ->where('is_active', true)
            ->join('warehouse_categories', 'warehouse_categories.id', '=', 'warehouse_products.warehouse_category_id')
            ->groupBy('warehouse_categories.name')
            ->selectRaw('warehouse_categories.name as name, COALESCE(SUM(warehouse_products.stock_quantity), 0) as stock')
            ->pluck('stock', 'name')
            ->map(fn ($stock) => (int) $stock)
            ->all();
    }

    /** @return array<int, array<string, mixed>> */
    private function ordersTrend(int $months = 6): array
    {
        $start = now()->startOfMonth()->subMonths($months - 1);

        $orders = WarehouseOrder::where('created_at', '>=', $start)
            ->get(['created_at', 'payment_status', 'status', 'total'])
            ->groupBy(fn (WarehouseOrder $order) => $order->created_at->format('Y-m'));

        return collect(range(0, $months - 1))->map(function (int $offset) use ($start, $orders) {
            $month = $start->copy()->addMonths($offset);
            $bucket = $orders->get($month->format('Y-m'), collect());

            return [
                'month' => $month->format('Y-m'),
                'label' => $month->format('M Y'),
                'orders' => (int) $bucket->count(),
                'revenue' => round((float) $bucket->where('payment_status', 'paid')
                    ->where('status', '!=', 'cancelled')
                    ->sum('total'), 2),
            ];
        })->all();
    }

    /** @return array<int, array<string, mixed>> */
    private function topSellers(int $limit = 10): array
    {
        if (! Schema::hasTable('warehouse_orders')) {
            return [];
        }

        return WarehouseOrder::query()
            ->join('users', 'users.id', '=', 'warehouse_orders.seller_id')
            ->where('warehouse_orders.payment_status', 'paid')
            ->groupBy('users.id', 'users.name')
            ->selectRaw('users.id as id, users.name as name, COUNT(*) as orders, COALESCE(SUM(warehouse_orders.total), 0) as spend')
            ->orderByDesc('spend')
            ->limit($limit)
            ->get()
            ->map(fn ($row) => [
                'seller_id' => (int) $row->id,
                'name' => (string) $row->name,
                'orders' => (int) $row->orders,
                'spend' => round((float) $row->spend, 2),
            ])->values()->all();
    }
}

<?php

namespace App\Http\Controllers\Api\Crm;

use App\Helpers\ResponseHelper;
use App\Models\OrderItem;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Read-only product catalogue for the CRM.
 *
 * Sales figures are aggregated from `order_items`, which is fully snapshotted,
 * so historical line items survive product edits and deletions.
 */
class CrmProductsController extends CrmController
{
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'search' => 'nullable|string|max:120',
            'store_id' => 'nullable|integer',
            'category_id' => 'nullable|integer',
            'type' => 'nullable|string|max:40',
            'status' => 'nullable|in:all,live,pending,inactive,muted,boosted,out_of_stock',
        ]);

        $window = $this->validateWindow($request);
        $paging = $this->validatePagination($request);

        $query = Product::query()
            ->with(['store:id,name', 'category:id,name,slug'])
            ->select('products.*')
            ->selectSub(
                OrderItem::selectRaw('COALESCE(SUM(quantity), 0)')
                    ->whereColumn('order_items.product_id', 'products.id'),
                'units_sold'
            )
            ->selectSub(
                OrderItem::selectRaw('COALESCE(SUM(line_total), 0)')
                    ->whereColumn('order_items.product_id', 'products.id'),
                'revenue'
            )
            ->when($filters['search'] ?? null, function ($q, $search) {
                $q->where(function ($inner) use ($search) {
                    $inner->where('name', 'like', "%{$search}%")
                        ->orWhere('sku', 'like', "%{$search}%");
                });
            })
            ->when($filters['store_id'] ?? null, fn ($q, $id) => $q->where('store_id', $id))
            ->when($filters['category_id'] ?? null, fn ($q, $id) => $q->where('category_id', $id))
            ->when($filters['type'] ?? null, fn ($q, $type) => $q->where('product_type', $type));

        $this->applyStatusFilter($query, $filters['status'] ?? null);
        $this->applyWindow($query, $window['from'], $window['to']);

        $paginator = $query->orderByDesc('created_at')
            ->paginate($paging['per_page'], ['*'], 'page', $paging['page']);

        $rows = collect($paginator->items())->map(fn (Product $product) => $this->row($product))->values();

        return $this->paginated(
            $paginator->setCollection($rows),
            ['summary' => $this->summary()],
            [
                'types' => Product::query()->distinct()->orderBy('product_type')->pluck('product_type')->filter()->values()->all(),
                'statuses' => ['all', 'live', 'pending', 'inactive', 'muted', 'boosted', 'out_of_stock'],
            ]
        );
    }

    public function show(Request $request, int $product): JsonResponse
    {
        $model = Product::with(['store:id,name', 'category:id,name', 'subCategory:id,name', 'variants'])
            ->find($product);

        if (! $model) {
            return ResponseHelper::notFound('Product not found.');
        }

        return ResponseHelper::success([
            'product' => $this->row($model, true),
            'variants' => $model->variants->map(fn ($variant) => [
                'id' => (int) $variant->id,
                'color_name' => $variant->color_name,
                'color_code' => $variant->color_code,
                'price' => round((float) $variant->price, 2),
                'stock_quantity' => (int) $variant->stock_quantity,
                'stock_status' => (string) $variant->stock_status,
                'is_default' => (bool) $variant->is_default,
            ])->values(),
            'sales' => [
                'units_sold' => (int) OrderItem::where('product_id', $model->id)->sum('quantity'),
                'revenue' => round((float) OrderItem::where('product_id', $model->id)->sum('line_total'), 2),
                'line_items' => (int) OrderItem::where('product_id', $model->id)->count(),
            ],
        ]);
    }

    private function applyStatusFilter($query, ?string $status): void
    {
        match ($status) {
            'live' => $query->where('is_active', true)->where('is_approved', true),
            'pending' => $query->where('is_approved', false)->whereNull('rejection_reason'),
            'inactive' => $query->where('is_active', false),
            'muted' => $query->where('is_muted', true),
            'boosted' => $query->where('is_boosted', true),
            'out_of_stock' => $query->where('stock_quantity', '<=', 0),
            default => null,
        };
    }

    /** @return array<string, mixed> */
    private function row(Product $product, bool $detailed = false): array
    {
        $row = [
            'id' => (int) $product->id,
            'name' => (string) $product->name,
            'sku' => (string) $product->sku,
            'product_type' => (string) $product->product_type,
            'price' => round((float) $product->price, 2),
            'compare_at_price' => $product->compare_at_price === null ? null : round((float) $product->compare_at_price, 2),
            'stock_quantity' => (int) $product->stock_quantity,
            'stock_status' => (string) $product->stock_status,
            'is_active' => (bool) $product->is_active,
            'is_approved' => (bool) $product->is_approved,
            'is_muted' => (bool) $product->is_muted,
            'is_boosted' => (bool) $product->is_boosted,
            'is_featured' => (bool) $product->is_featured,
            'store' => $product->store ? [
                'id' => (int) $product->store->id,
                'name' => (string) $product->store->name,
            ] : null,
            'category' => $product->category?->name,
            'views' => (int) $product->view_count,
            'rating' => $product->rating === null ? null : round((float) $product->rating, 2),
            'review_count' => (int) $product->review_count,
            'units_sold' => (int) $product->units_sold,
            'revenue' => round((float) $product->revenue, 2),
            'currency' => 'EUR',
            'created_at' => $product->created_at?->toISOString(),
        ];

        if (! $detailed) {
            return $row;
        }

        return array_merge($row, [
            'slug' => (string) $product->slug,
            'short_description' => $product->short_description,
            'description' => $product->description,
            'images' => $product->images,
            'frame_shape' => $product->frame_shape,
            'frame_material' => $product->frame_material,
            'frame_color' => $product->frame_color,
            'gender' => (string) $product->gender,
            'lens_type' => $product->lens_type,
            'sub_category' => $product->subCategory?->name,
            'rejection_reason' => $product->rejection_reason,
            'boost_budget' => $product->boost_budget === null ? null : round((float) $product->boost_budget, 2),
            'boost_start_at' => $product->boost_start_at?->toISOString(),
            'boost_end_at' => $product->boost_end_at?->toISOString(),
        ]);
    }

    /** @return array<string, int|float> */
    private function summary(): array
    {
        $base = Product::query();

        return [
            'total' => (int) (clone $base)->count(),
            'live' => (int) (clone $base)->where('is_active', true)->where('is_approved', true)->count(),
            'pending_review' => (int) (clone $base)->where('is_approved', false)->whereNull('rejection_reason')->count(),
            'inactive' => (int) (clone $base)->where('is_active', false)->count(),
            'muted' => (int) (clone $base)->where('is_muted', true)->count(),
            'boosted' => (int) (clone $base)->where('is_boosted', true)->count(),
            'out_of_stock' => (int) (clone $base)->where('stock_quantity', '<=', 0)->count(),
            'catalogue_value' => round((float) (clone $base)->sum('price'), 2),
        ];
    }
}

<?php

namespace App\Http\Controllers\Admin;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Models\{WarehouseCategory, WarehouseOrder, WarehouseProduct};
use App\Services\Warehouse\WarehouseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class AdminWarehouseController extends Controller
{
    public function __construct(private WarehouseService $warehouse) {}

    public function dashboard(): JsonResponse
    {
        $products = WarehouseProduct::with('category')->get();
        $orders = WarehouseOrder::query();
        return ResponseHelper::success([
            'stats' => [
                'total_products' => $products->count(), 'total_stock' => (int) $products->sum('stock_quantity'),
                'warehouse_orders' => (int) $orders->count(), 'revenue' => (float) (clone $orders)->where('payment_status', 'paid')->sum('total'),
            ],
            'low_stock' => $products->filter(fn (WarehouseProduct $product) => $product->availability === 'low_stock')->values(),
            'best_selling' => \App\Models\WarehouseOrderItem::selectRaw('warehouse_product_id, product_name, sku, SUM(quantity) as units, COUNT(DISTINCT warehouse_order_id) as orders')
                ->groupBy('warehouse_product_id', 'product_name', 'sku')->orderByDesc('units')->limit(5)->get(),
            'stock_by_category' => $products->groupBy(fn (WarehouseProduct $product) => $product->category?->name ?? 'Uncategorised')
                ->map(fn ($group) => (int) $group->sum('stock_quantity')),
        ], 'Warehouse dashboard retrieved successfully.');
    }

    public function products(Request $request): JsonResponse
    {
        $query = WarehouseProduct::with('category')->latest();
        if ($request->filled('search')) $query->where(fn ($q) => $q->where('name', 'like', '%'.$request->search.'%')->orWhere('sku', 'like', '%'.$request->search.'%'));
        if ($request->filled('category_id')) $query->where('warehouse_category_id', $request->integer('category_id'));
        if ($request->filled('type')) $query->whereHas('category', fn ($q) => $q->where('type', $request->type));
        if ($request->get('availability') === 'in_stock') $query->where('stock_quantity', '>', 0)->whereColumn('stock_quantity', '>', 'low_stock_threshold');
        if ($request->get('availability') === 'low_stock') $query->where('stock_quantity', '>', 0)->whereColumn('stock_quantity', '<=', 'low_stock_threshold');
        if ($request->get('availability') === 'out_of_stock') $query->where('stock_quantity', 0);
        if ($request->boolean('archived')) $query->onlyTrashed();
        return ResponseHelper::success($query->paginate(min(100, max(1, $request->integer('per_page', 20)))));
    }

    public function product(int $id): JsonResponse { return ResponseHelper::success(WarehouseProduct::with('category')->withTrashed()->findOrFail($id)); }

    public function storeProduct(Request $request): JsonResponse
    {
        $product = WarehouseProduct::create($this->productData($request));
        return ResponseHelper::success($product->load('category'), 'Warehouse product created successfully.', 201);
    }

    public function updateProduct(Request $request, int $id): JsonResponse
    {
        $product = WarehouseProduct::findOrFail($id);
        $data = $this->productData($request, $product, false);
        if ($request->hasFile('image')) {
            if ($product->image_path) Storage::disk('public')->delete($product->image_path);
        }
        $product->update($data);
        return ResponseHelper::success($product->fresh()->load('category'), 'Warehouse product updated successfully.');
    }

    public function deleteProduct(int $id): JsonResponse
    {
        WarehouseProduct::findOrFail($id)->delete();
        return ResponseHelper::success(null, 'Warehouse product archived successfully.');
    }

    public function categories(): JsonResponse { return ResponseHelper::success(WarehouseCategory::withCount('products')->orderBy('sort_order')->get()); }

    public function storeCategory(Request $request): JsonResponse
    {
        $data = $request->validate(['name' => 'required|string|max:100', 'type' => 'required|in:eyeglasses,contact_lenses,contact_lens_solutions', 'description' => 'nullable|string|max:1000', 'is_active' => 'nullable|boolean', 'sort_order' => 'nullable|integer|min:0']);
        $data['slug'] = $this->uniqueSlug($data['name']);
        return ResponseHelper::success(WarehouseCategory::create($data), 'Warehouse category created successfully.', 201);
    }

    public function updateCategory(Request $request, int $id): JsonResponse
    {
        $category = WarehouseCategory::findOrFail($id);
        $data = $request->validate(['name' => 'sometimes|required|string|max:100', 'type' => 'sometimes|required|in:eyeglasses,contact_lenses,contact_lens_solutions', 'description' => 'nullable|string|max:1000', 'is_active' => 'nullable|boolean', 'sort_order' => 'nullable|integer|min:0']);
        if (isset($data['name'])) $data['slug'] = $this->uniqueSlug($data['name'], $category->id);
        $category->update($data);
        return ResponseHelper::success($category->fresh(), 'Warehouse category updated successfully.');
    }

    public function deleteCategory(int $id): JsonResponse
    {
        $category = WarehouseCategory::findOrFail($id);
        if ($category->products()->exists()) return ResponseHelper::error('Move or archive the category products before deleting this category.', null, 422);
        $category->delete();
        return ResponseHelper::success(null, 'Warehouse category archived successfully.');
    }

    public function orders(Request $request): JsonResponse
    {
        $query = WarehouseOrder::with(['seller:id,name,email', 'store:id,name', 'items'])->latest();
        if ($request->filled('status')) $query->where('status', $request->status);
        if ($request->filled('search')) $query->where(fn ($q) => $q->where('order_number', 'like', '%'.$request->search.'%')->orWhereHas('seller', fn ($seller) => $seller->where('name', 'like', '%'.$request->search.'%')));
        return ResponseHelper::success($query->paginate(min(100, max(1, $request->integer('per_page', 20)))));
    }

    public function order(int $id): JsonResponse { return ResponseHelper::success(WarehouseOrder::with(['seller:id,name,email,phone', 'store:id,name', 'items.product', 'walletEntry'])->findOrFail($id)); }

    public function updateOrder(Request $request, int $id): JsonResponse
    {
        $data = $request->validate(['status' => 'nullable|in:pending,confirmed,processing,shipped,delivered,cancelled', 'tracking_number' => 'nullable|string|max:100', 'shipping_carrier' => 'nullable|string|max:100', 'shipping_notes' => 'nullable|string|max:2000']);
        return ResponseHelper::success($this->warehouse->updateOrder(WarehouseOrder::findOrFail($id), $data), 'Warehouse order updated successfully.');
    }

    private function productData(Request $request, ?WarehouseProduct $product = null, bool $creating = true): array
    {
        // The Admin UI posts multipart data to support an optional image. JSON
        // detail fields must be decoded before Laravel validates their shape.
        if (is_string($request->input('details'))) {
            $decoded = json_decode((string) $request->input('details'), true);
            $request->merge(['details' => is_array($decoded) ? $decoded : []]);
        }
        $required = $creating ? 'required' : 'sometimes';
        $data = $request->validate([
            'warehouse_category_id' => [$required, 'integer', 'exists:warehouse_categories,id'], 'name' => [$required, 'string', 'max:255'],
            'sku' => [$required, 'string', 'max:100', 'unique:warehouse_products,sku'.($product ? ','.$product->id : '')], 'description' => 'nullable|string|max:5000',
            'image' => 'nullable|image|max:5120', 'price' => [$required, 'numeric', 'min:0'], 'shipping_fee' => 'nullable|numeric|min:0',
            'stock_quantity' => [$required, 'integer', 'min:0'], 'low_stock_threshold' => 'nullable|integer|min:0',
            'color' => 'nullable|string|max:100', 'temple_size' => 'nullable|string|max:50', 'lens_size' => 'nullable|string|max:50', 'bridge_size' => 'nullable|string|max:50',
            'details' => 'nullable|array', 'is_active' => 'nullable|boolean',
        ]);
        if ($request->hasFile('image')) $data['image_path'] = $request->file('image')->store('warehouse/products', 'public');
        unset($data['image']);
        return $data;
    }

    private function uniqueSlug(string $name, ?int $ignore = null): string
    {
        $base = Str::slug($name) ?: 'warehouse-category'; $slug = $base; $n = 2;
        while (WarehouseCategory::withTrashed()->where('slug', $slug)->when($ignore, fn ($q) => $q->whereKeyNot($ignore))->exists()) $slug = $base.'-'.$n++;
        return $slug;
    }
}

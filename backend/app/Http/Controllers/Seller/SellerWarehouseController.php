<?php

namespace App\Http\Controllers\Seller;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Models\{WarehouseCategory, WarehouseOrder, WarehouseProduct};
use App\Services\Warehouse\WarehouseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SellerWarehouseController extends Controller
{
    public function __construct(private WarehouseService $warehouse) {}

    public function products(Request $request): JsonResponse
    {
        $query = WarehouseProduct::with('category')
            ->where('is_active', true)
            ->where('is_draft', false)
            ->where('stock_quantity', '>', 0)
            ->whereHas('category', fn ($category) => $category->where('is_active', true))
            ->latest();
        if ($request->filled('search')) $query->where(fn ($q) => $q->where('name', 'like', '%'.$request->search.'%')->orWhere('sku', 'like', '%'.$request->search.'%'));
        if ($request->filled('category_id')) $query->where('warehouse_category_id', $request->integer('category_id'));
        if ($request->filled('type')) $query->whereHas('category', fn ($q) => $q->where('type', $request->type));
        return ResponseHelper::success(['products' => $query->paginate(min(60, max(1, $request->integer('per_page', 24)))), 'categories' => WarehouseCategory::where('is_active', true)->orderBy('sort_order')->get(), 'cart_count' => $this->warehouse->cart($request->user())->items()->sum('quantity')]);
    }

    public function product(int $id): JsonResponse { return ResponseHelper::success(WarehouseProduct::with('category')->where('is_active', true)->where('is_draft', false)->whereHas('category', fn ($category) => $category->where('is_active', true))->findOrFail($id)); }
    public function cart(Request $request): JsonResponse { return ResponseHelper::success($this->warehouse->cartPayload($request->user())); }

    public function addCartItem(Request $request): JsonResponse
    {
        $data = $request->validate(['warehouse_product_id' => 'required|integer|exists:warehouse_products,id', 'quantity' => 'required|integer|min:1']);
        return ResponseHelper::success($this->warehouse->addToCart($request->user(), $data['warehouse_product_id'], $data['quantity']), 'Product added to warehouse cart.');
    }

    public function updateCartItem(Request $request, int $id): JsonResponse
    {
        return ResponseHelper::success($this->warehouse->updateCartItem($request->user(), $id, $request->validate(['quantity' => 'required|integer|min:1'])['quantity']));
    }

    public function removeCartItem(Request $request, int $id): JsonResponse { return ResponseHelper::success($this->warehouse->removeCartItem($request->user(), $id)); }

    public function checkout(Request $request): JsonResponse
    {
        $data = $request->validate(['idempotency_key' => 'required|string|max:120', 'shipping_address' => 'nullable|array']);
        return ResponseHelper::success($this->warehouse->checkout($request->user(), $data['idempotency_key'], $data['shipping_address'] ?? null), 'Warehouse order paid from Seller Wallet.', 201);
    }

    public function orders(Request $request): JsonResponse
    {
        $query = WarehouseOrder::with(['items', 'store:id,name'])->where('seller_id', $request->user()->id)->latest();
        if ($request->filled('status')) $query->where('status', $request->status);
        return ResponseHelper::success($query->paginate(min(100, max(1, $request->integer('per_page', 20)))));
    }

    public function order(Request $request, int $id): JsonResponse
    {
        return ResponseHelper::success(WarehouseOrder::with(['items.product', 'store:id,name', 'walletEntry'])->where('seller_id', $request->user()->id)->findOrFail($id));
    }
}

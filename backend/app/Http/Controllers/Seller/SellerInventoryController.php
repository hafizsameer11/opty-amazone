<?php

namespace App\Http\Controllers\Seller;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SellerInventoryController extends Controller
{
    public function lowStock(Request $request): JsonResponse
    {
        $store = $request->user()->store;
        if (!$store) {
            return ResponseHelper::error('Store not found', null, 404);
        }

        $threshold = (int) ($store->low_stock_threshold ?? 5);
        if ($threshold < 0) {
            $threshold = 5;
        }

        $products = Product::query()
            ->where('store_id', $store->id)
            ->where('is_active', true)
            ->where('stock_quantity', '<=', $threshold)
            ->orderBy('stock_quantity')
            ->limit(50)
            ->get(['id', 'name', 'sku', 'stock_quantity', 'stock_status', 'product_type']);

        return ResponseHelper::success([
            'threshold' => $threshold,
            'count' => $products->count(),
            'products' => $products,
        ]);
    }
}

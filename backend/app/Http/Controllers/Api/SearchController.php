<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Helpers\ResponseHelper;
use App\Models\Product;
use App\Models\Store;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    /**
     * Search products and stores.
     */
    public function search(Request $request)
    {
        $request->validate([
            'q' => 'required|string|min:2',
        ]);

        $query = $request->q;

        // Search products
        $products = Product::with(['store', 'category'])
            ->visibleToBuyers()
            ->where(function ($q) use ($query) {
                $q->where('name', 'like', "%{$query}%")
                  ->orWhere('description', 'like', "%{$query}%")
                  ->orWhere('sku', 'like', "%{$query}%");
            })
            ->limit(20)
            ->get();

        // Search stores
        $stores = Store::where('is_active', true)
            ->where('status', 'active')
            ->where(function ($q) use ($query) {
                $q->where('name', 'like', "%{$query}%")
                  ->orWhere('description', 'like', "%{$query}%");
            })
            ->limit(10)
            ->get();

        return ResponseHelper::success([
            'products' => $products->map(fn ($p) => app(\App\Services\Campaigns\DiscountPricingService::class)->product($p, request()->user('sanctum')?->id)),
            'stores' => $stores,
            'query' => $query,
        ], 'Search results retrieved successfully');
    }
}

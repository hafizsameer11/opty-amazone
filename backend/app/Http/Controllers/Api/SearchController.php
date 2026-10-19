<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Helpers\ResponseHelper;
use App\Http\Resources\PublicStoreResource;
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
            ->where(function ($stores) use ($query) {
                // Anonymous sellers can be found by their public VX code, but
                // their real name and description must never become searchable.
                $stores->where(function ($visible) use ($query) {
                    $visible->where('seller_visibility', Store::SELLER_VISIBILITY_VISIBLE)
                        ->where(function ($fields) use ($query) {
                            $fields->where('name', 'like', "%{$query}%")
                                ->orWhere('description', 'like', "%{$query}%");
                        });
                })->orWhere(function ($anonymous) use ($query) {
                    $anonymous->where('seller_visibility', Store::SELLER_VISIBILITY_ANONYMOUS)
                        ->where('public_seller_code', 'like', "%{$query}%");
                });
            })
            ->limit(10)
            ->get();

        return ResponseHelper::success([
            'products' => $products->map(fn ($p) => app(\App\Services\Campaigns\DiscountPricingService::class)->product($p, request()->user('sanctum')?->id)),
            'stores' => PublicStoreResource::collection($stores)->resolve($request),
            'query' => $query,
        ], 'Search results retrieved successfully');
    }
}

<?php

namespace App\Http\Controllers\Admin;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminSellerController extends Controller
{
    /**
     * Get all sellers/stores.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Store::with('user', 'categories', 'statistics');

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhereHas('user', function ($userQuery) use ($search) {
                      $userQuery->where('name', 'like', "%{$search}%")
                                ->orWhere('email', 'like', "%{$search}%");
                  });
            });
        }

        $stores = $query->orderBy('created_at', 'desc')
            ->paginate($request->get('per_page', 15));

        return ResponseHelper::success($stores, 'Sellers retrieved successfully');
    }

    /**
     * Get seller/store details.
     */
    public function show($id): JsonResponse
    {
        $store = Store::with([
            'user',
            'categories',
            'statistics',
            'socialLinks',
            'followers',
            'reviews',
        ])->findOrFail($id);

        // Get store products count
        $store->products_count = \App\Models\Product::where('store_id', $store->id)->count();
        
        // Get store orders count
        $store->orders_count = \App\Models\StoreOrder::where('store_id', $store->id)->count();

        return ResponseHelper::success($store, 'Seller retrieved successfully');
    }

    /**
     * Approve store.
     */
    public function approve($id): JsonResponse
    {
        $store = Store::findOrFail($id);
        $store->update([
            'onboarding_status' => 'approved',
            'status' => 'active',
        ]);

        return ResponseHelper::success($store, 'Store approved successfully');
    }

    /**
     * Reject store.
     */
    public function reject(Request $request, $id): JsonResponse
    {
        $store = Store::findOrFail($id);
        $store->update([
            'onboarding_status' => 'rejected',
            'status' => 'rejected',
            'meta' => array_merge($store->meta ?? [], ['rejection_reason' => $request->reason]),
        ]);

        return ResponseHelper::success($store, 'Store rejected successfully');
    }
}

<?php

namespace App\Http\Controllers\Seller;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Http\Resources\ProductReviewResource;
use App\Http\Resources\StoreReviewResource;
use App\Models\ProductReview;
use App\Models\StoreReview;
use Illuminate\Http\Request;

class SellerReviewController extends Controller
{
    public function index(Request $request)
    {
        $data = $request->validate([
            'type' => ['sometimes', 'in:store,product'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $store = $request->user()->store;
        if (!$store) {
            return ResponseHelper::success([
                'reviews' => [],
                'pagination' => ['current_page' => 1, 'last_page' => 1, 'per_page' => 20, 'total' => 0],
            ]);
        }

        $perPage = (int) ($data['per_page'] ?? 20);
        $type = $data['type'] ?? 'store';

        if ($type === 'product') {
            $reviews = ProductReview::query()
                ->with(['user', 'product'])
                ->where('is_verified_purchase', true)
                ->whereHas('product', fn ($query) => $query->where('store_id', $store->id))
                ->latest()
                ->paginate($perPage);
            $resource = ProductReviewResource::collection($reviews->items())->resolve($request);
        } else {
            $reviews = StoreReview::query()
                ->with(['user', 'store'])
                ->where('store_id', $store->id)
                ->where('is_verified_purchase', true)
                ->latest()
                ->paginate($perPage);
            $resource = StoreReviewResource::collection($reviews->items())->resolve($request);
        }

        return ResponseHelper::success([
            'reviews' => $resource,
            'pagination' => [
                'current_page' => $reviews->currentPage(),
                'last_page' => $reviews->lastPage(),
                'per_page' => $reviews->perPage(),
                'total' => $reviews->total(),
            ],
        ]);
    }
}

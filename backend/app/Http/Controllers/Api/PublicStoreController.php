<?php

namespace App\Http\Controllers\Api;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Http\Resources\StoreResource;
use App\Http\Resources\StoreReviewResource;
use App\Models\Store;
use App\Services\Store\StoreReviewService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PublicStoreController extends Controller
{
    public function __construct(
        private StoreReviewService $reviewService
    ) {}

    /**
     * List all stores (public).
     */
    public function index(Request $request): JsonResponse
    {
        $query = Store::where('status', 'active')
            ->where('is_active', true);

        if ($request->has('search')) {
            $query->where('name', 'like', '%' . $request->input('search') . '%');
        }

        $stores = $query->paginate($request->input('per_page', 15));

        return ResponseHelper::success([
            'stores' => StoreResource::collection($stores->items()),
            'pagination' => [
                'current_page' => $stores->currentPage(),
                'last_page' => $stores->lastPage(),
                'per_page' => $stores->perPage(),
                'total' => $stores->total(),
            ],
        ]);
    }

    /**
     * Get store details (public).
     */
    public function show(int $id): JsonResponse
    {
        $store = Store::where('status', 'active')
            ->where('is_active', true)
            ->findOrFail($id);

        return ResponseHelper::success([
            'store' => new StoreResource($store),
        ]);
    }

    /**
     * Get store reviews (public).
     */
    public function getStoreReviews(int $id, Request $request): JsonResponse
    {
        $reviews = $this->reviewService->getStoreReviews($id, $request->all());

        return ResponseHelper::success([
            'reviews' => StoreReviewResource::collection($reviews->items()),
            'pagination' => [
                'current_page' => $reviews->currentPage(),
                'last_page' => $reviews->lastPage(),
                'per_page' => $reviews->perPage(),
                'total' => $reviews->total(),
            ],
        ]);
    }
}

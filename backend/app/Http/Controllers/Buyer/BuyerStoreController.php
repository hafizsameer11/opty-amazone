<?php

namespace App\Http\Controllers\Buyer;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Http\Requests\Buyer\Store\CreateReviewRequest;
use App\Http\Requests\Buyer\Store\UpdateReviewRequest;
use App\Http\Resources\StoreFollowerResource;
use App\Http\Resources\StoreResource;
use App\Http\Resources\StoreReviewResource;
use App\Models\Store;
use App\Services\Store\StoreFollowerService;
use App\Services\Store\StoreReviewService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BuyerStoreController extends Controller
{
    public function __construct(
        private StoreFollowerService $followerService,
        private StoreReviewService $reviewService
    ) {}

    /**
     * Get store details (public).
     */
    public function getStore(int $id): JsonResponse
    {
        $store = Store::findOrFail($id);

        return ResponseHelper::success([
            'store' => new StoreResource($store),
        ]);
    }

    /**
     * Follow a store.
     */
    public function followStore(int $id, Request $request): JsonResponse
    {
        try {
            $follower = $this->followerService->followStore($request->user(), $id);

            return ResponseHelper::success([
                'follower' => new StoreFollowerResource($follower),
            ], 'Store followed successfully');
        } catch (\Exception $e) {
            return ResponseHelper::error($e->getMessage());
        }
    }

    /**
     * Unfollow a store.
     */
    public function unfollowStore(int $id, Request $request): JsonResponse
    {
        try {
            $this->followerService->unfollowStore($request->user(), $id);

            return ResponseHelper::success(null, 'Store unfollowed successfully');
        } catch (\Exception $e) {
            return ResponseHelper::error($e->getMessage());
        }
    }

    /**
     * Get stores followed by buyer.
     */
    public function getFollowedStores(Request $request): JsonResponse
    {
        $stores = $this->followerService->getFollowedStores($request->user());

        return ResponseHelper::success([
            'stores' => StoreResource::collection($stores),
        ]);
    }

    /**
     * Get store reviews.
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

    /**
     * Create a store review.
     */
    public function createReview(int $id, CreateReviewRequest $request): JsonResponse
    {
        try {
            $review = $this->reviewService->createReview($request->user(), $id, $request->validated());

            return ResponseHelper::success([
                'review' => new StoreReviewResource($review->load('user')),
            ], 'Review created successfully', 201);
        } catch (\Exception $e) {
            return ResponseHelper::error($e->getMessage());
        }
    }
}

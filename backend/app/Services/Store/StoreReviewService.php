<?php

namespace App\Services\Store;

use App\Models\Store;
use App\Models\StoreReview;
use App\Models\User;
use App\Services\Buyer\ReviewService as BuyerReviewService;
use App\Services\Notifications\MarketplaceNotificationService;
use Illuminate\Support\Facades\Log;

class StoreReviewService
{
    public function __construct(private BuyerReviewService $buyerReviewService) {}

    /**
     * Create a store review.
     */
    public function createReview(User $buyer, int $storeId, array $data): StoreReview
    {
        try {
            return $this->buyerReviewService->createStore(
                $buyer,
                Store::findOrFail($storeId),
                $data
            );
        } catch (\Exception $e) {
            Log::error('Review creation failed: ' . $e->getMessage(), [
                'buyer_id' => $buyer->id,
                'store_id' => $storeId,
            ]);

            throw $e;
        }
    }

    /**
     * Update a review.
     */
    public function updateReview(User $buyer, int $reviewId, array $data): StoreReview
    {
        try {
            $review = StoreReview::where('user_id', $buyer->id)
                ->findOrFail($reviewId);

            $review->fill($data);
            $review->save();

            return $review->fresh();
        } catch (\Exception $e) {
            Log::error('Review update failed: ' . $e->getMessage(), [
                'buyer_id' => $buyer->id,
                'review_id' => $reviewId,
            ]);

            throw $e;
        }
    }

    /**
     * Delete a review.
     */
    public function deleteReview(User $buyer, int $reviewId): bool
    {
        try {
            $review = StoreReview::where('user_id', $buyer->id)
                ->findOrFail($reviewId);

            return $review->delete();
        } catch (\Exception $e) {
            Log::error('Review deletion failed: ' . $e->getMessage(), [
                'buyer_id' => $buyer->id,
                'review_id' => $reviewId,
            ]);

            throw $e;
        }
    }

    /**
     * Get reviews for a store.
     */
    public function getStoreReviews(int $storeId, array $filters = []): \Illuminate\Contracts\Pagination\LengthAwarePaginator
    {
        $query = StoreReview::where('store_id', $storeId)
            ->with('user');

        if (isset($filters['rating'])) {
            $query->where('rating', $filters['rating']);
        }

        if (isset($filters['verified']) && $filters['verified']) {
            $query->where('is_verified_purchase', true);
        }

        return $query->orderBy('created_at', 'desc')
            ->paginate($filters['per_page'] ?? 15);
    }

    /**
     * Seller replies to a review.
     */
    public function replyToReview(User $seller, int $reviewId, string $reply): StoreReview
    {
        try {
            $store = $seller->store;

            if (!$store) {
                throw new \Exception('Store not found');
            }

            $review = StoreReview::where('store_id', $store->id)
                ->findOrFail($reviewId);

            $review->seller_reply = $reply;
            $review->seller_replied_at = now();
            $review->save();
            app(MarketplaceNotificationService::class)->send($review->user, 'review.reply', 'Seller replied to your review',
                "The store replied to your review for {$store->name}.", "/stores/{$store->id}", ['review_id' => $review->id, 'store_id' => $store->id]);

            return $review->fresh();
        } catch (\Exception $e) {
            Log::error('Review reply failed: ' . $e->getMessage(), [
                'seller_id' => $seller->id,
                'review_id' => $reviewId,
            ]);

            throw $e;
        }
    }
}

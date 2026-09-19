<?php

namespace App\Services\Buyer;

use App\Models\{OrderItem, Product, ProductReview, Store, StoreOrder, StoreReview, StoreStatistic, User};
use App\Services\Notifications\MarketplaceNotificationService;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class ReviewService
{
    /** Return delivered purchases that can still be used for a product review. */
    public function productEligibility(User $buyer, int $productId): array
    {
        $alreadyReviewed = ProductReview::query()
            ->where('user_id', $buyer->id)
            ->where('product_id', $productId)
            ->exists();

        $options = $this->eligibleProductItems($buyer, $productId)
            ->get()
            ->map(fn (OrderItem $item) => [
                'order_item_id' => $item->id,
                'store_order_id' => $item->store_order_id,
                'order_id' => $item->storeOrder?->order_id,
                'order_no' => $item->storeOrder?->order?->order_no,
                'quantity' => $item->quantity,
                'purchased_at' => $item->storeOrder?->delivered_at?->toISOString(),
            ])
            ->values()
            ->all();

        return [
            'eligible' => !$alreadyReviewed && count($options) > 0,
            'already_reviewed' => $alreadyReviewed,
            'options' => $options,
        ];
    }

    public function storeEligibility(User $buyer, int $storeId): array
    {
        $alreadyReviewed = StoreReview::query()
            ->where('user_id', $buyer->id)
            ->where('store_id', $storeId)
            ->exists();

        $options = $this->eligibleStoreOrders($buyer, $storeId)
            ->get()
            ->map(fn (StoreOrder $storeOrder) => [
                'store_order_id' => $storeOrder->id,
                'order_id' => $storeOrder->order_id,
                'order_no' => $storeOrder->order?->order_no,
                'purchased_at' => $storeOrder->delivered_at?->toISOString(),
            ])
            ->values()
            ->all();

        return [
            'eligible' => !$alreadyReviewed && count($options) > 0,
            'already_reviewed' => $alreadyReviewed,
            'options' => $options,
        ];
    }

    public function productVerified(User $buyer, int $productId): bool
    {
        return $this->eligibleProductItems($buyer, $productId)->exists();
    }

    public function storeVerified(User $buyer, int $storeId): bool
    {
        return $this->eligibleStoreOrders($buyer, $storeId)->exists();
    }

    public function createProduct(User $buyer, Product $product, array $data): ProductReview
    {
        $this->assertBuyer($buyer);

        if (ProductReview::query()->where('product_id', $product->id)->where('user_id', $buyer->id)->exists()) {
            $this->reject('You have already reviewed this product.');
        }

        $purchase = $this->eligibleProductItems($buyer, $product->id)
            ->when(!empty($data['order_item_id']), fn ($query) => $query->whereKey((int) $data['order_item_id']))
            ->first();

        if (!$purchase) {
            $this->reject('A delivered purchase of this product is required before reviewing it.');
        }

        $imagePath = $this->storeReviewImage($data['image'] ?? null, $product->id, $buyer->id);

        try {
            $review = ProductReview::create([
                'product_id' => $product->id,
                'user_id' => $buyer->id,
                'order_item_id' => $purchase->id,
                'rating' => $data['rating'],
                'comment' => $data['comment'] ?? null,
                'image' => $imagePath,
                'is_verified_purchase' => true,
            ]);
        } catch (\Throwable $e) {
            if ($imagePath) {
                Storage::disk('public')->delete($imagePath);
            }
            throw $e;
        }

        $this->refreshProductRating($product->id);
        $product->loadMissing('store.user');
        app(MarketplaceNotificationService::class)->send($product->store?->user, 'review.new', 'New product review',
            "A buyer left a review for {$product->name}.", "/products/{$product->id}/edit", ['review_id' => $review->id, 'product_id' => $product->id]);

        return $review->load('user');
    }

    public function createStore(User $buyer, Store $store, array $data): StoreReview
    {
        $this->assertBuyer($buyer);

        if (StoreReview::query()->where('store_id', $store->id)->where('user_id', $buyer->id)->exists()) {
            $this->reject('You have already reviewed this store.');
        }

        $purchase = $this->eligibleStoreOrders($buyer, $store->id)
            ->when(!empty($data['store_order_id']), fn ($query) => $query->whereKey((int) $data['store_order_id']))
            ->first();

        if (!$purchase) {
            $this->reject('A delivered purchase from this store is required before reviewing it.');
        }

        $review = StoreReview::create([
            'store_id' => $store->id,
            'user_id' => $buyer->id,
            'store_order_id' => $purchase->id,
            'rating' => $data['rating'],
            'comment' => $data['comment'] ?? null,
            'is_verified_purchase' => true,
        ]);

        $this->refreshStoreRating($store->id);
        $store->loadMissing('user');
        app(MarketplaceNotificationService::class)->send($store->user, 'review.new', 'New store review',
            "A buyer left a review for {$store->name}.", "/store", ['review_id' => $review->id, 'store_id' => $store->id]);

        return $review->load('user');
    }

    public function updateProduct(User $buyer, int $id, array $data): ProductReview
    {
        $review = ProductReview::where('user_id', $buyer->id)->findOrFail($id);
        $purchase = $this->eligibleProductItems($buyer, $review->product_id)->first();
        if (!$purchase) {
            $this->reject('A delivered purchase is required to keep this review verified.');
        }

        $oldImage = $review->image;
        $newImage = $review->image;
        if (($data['image'] ?? null) instanceof UploadedFile) {
            $newImage = $this->storeReviewImage($data['image'], $review->product_id, $buyer->id);
        } elseif (!empty($data['remove_image'])) {
            $newImage = null;
        }

        $review->fill([
            'rating' => $data['rating'] ?? $review->rating,
            'comment' => array_key_exists('comment', $data) ? $data['comment'] : $review->comment,
            'image' => $newImage,
        ]);
        $review->is_verified_purchase = true;
        $review->order_item_id ??= $purchase->id;
        try {
            $review->save();
        } catch (\Throwable $e) {
            if ($newImage && $newImage !== $oldImage) {
                Storage::disk('public')->delete($newImage);
            }
            throw $e;
        }
        if ($oldImage && $oldImage !== $newImage) {
            Storage::disk('public')->delete($oldImage);
        }
        $this->refreshProductRating($review->product_id);

        return $review->fresh('user');
    }

    public function updateStore(User $buyer, int $id, array $data): StoreReview
    {
        $review = StoreReview::where('user_id', $buyer->id)->findOrFail($id);
        $purchase = $this->eligibleStoreOrders($buyer, $review->store_id)->first();
        if (!$purchase) {
            $this->reject('A delivered purchase is required to keep this review verified.');
        }

        $review->fill(['rating' => $data['rating'] ?? $review->rating, 'comment' => $data['comment'] ?? null]);
        $review->is_verified_purchase = true;
        $review->store_order_id ??= $purchase->id;
        $review->save();
        $this->refreshStoreRating($review->store_id);

        return $review->fresh('user');
    }

    public function deleteProduct(User $buyer, int $id): void
    {
        $review = ProductReview::where('user_id', $buyer->id)->findOrFail($id);
        $productId = $review->product_id;
        if ($review->image) {
            Storage::disk('public')->delete($review->image);
        }
        $review->delete();
        $this->refreshProductRating($productId);
    }

    public function deleteStore(User $buyer, int $id): void
    {
        $review = StoreReview::where('user_id', $buyer->id)->findOrFail($id);
        $storeId = $review->store_id;
        $review->delete();
        $this->refreshStoreRating($storeId);
    }

    public function history(User $buyer, int $perPage = 20, ?string $type = null): LengthAwarePaginator
    {
        $products = $type === 'store' ? collect() : ProductReview::with(['product.store', 'orderItem.storeOrder'])
            ->where('user_id', $buyer->id)
            ->get()
            ->map(fn ($review) => [
                'type' => 'product', 'id' => $review->id, 'rating' => $review->rating,
                'comment' => $review->comment, 'is_verified_purchase' => (bool) $review->is_verified_purchase,
                'order_item_id' => $review->order_item_id, 'image' => $review->image, 'image_url' => $review->image_url,
                'created_at' => $review->created_at?->toISOString(),
                'product' => $review->product,
            ]);
        $stores = $type === 'product' ? collect() : StoreReview::with(['store', 'storeOrder'])
            ->where('user_id', $buyer->id)
            ->get()
            ->map(fn ($review) => [
                'type' => 'store', 'id' => $review->id, 'rating' => $review->rating,
                'comment' => $review->comment, 'is_verified_purchase' => (bool) $review->is_verified_purchase,
                'store_order_id' => $review->store_order_id, 'created_at' => $review->created_at?->toISOString(),
                'store' => $review->store,
            ]);

        $all = $products->concat($stores)->sortByDesc('created_at')->values();
        $page = request()->integer('page', 1);
        $items = $all->forPage($page, $perPage)->values();

        return new \Illuminate\Pagination\LengthAwarePaginator($items, $all->count(), $perPage, $page, ['path' => request()->url()]);
    }

    private function eligibleProductItems(User $buyer, int $productId)
    {
        return OrderItem::query()
            ->where('product_id', $productId)
            ->whereHas('storeOrder', function ($query) use ($buyer) {
                $query->where('status', 'delivered')
                    ->where('payment_status', 'paid')
                    ->whereNotNull('delivery_verified_at')
                    ->whereHas('order', fn ($order) => $order->where('user_id', $buyer->id));
            })
            ->with(['storeOrder.order:id,order_no,user_id', 'storeOrder.store:id,name']);
    }

    private function eligibleStoreOrders(User $buyer, int $storeId)
    {
        return StoreOrder::query()
            ->where('store_id', $storeId)
            ->where('status', 'delivered')
            ->where('payment_status', 'paid')
            ->whereNotNull('delivery_verified_at')
            ->whereHas('order', fn ($order) => $order->where('user_id', $buyer->id))
            ->with(['order:id,order_no,user_id', 'store:id,name']);
    }

    private function assertBuyer(User $buyer): void
    {
        if (!$buyer->isBuyer()) {
            $this->reject('Only buyers can submit reviews.');
        }
    }

    private function reject(string $message): void
    {
        throw ValidationException::withMessages(['review' => [$message]]);
    }

    private function storeReviewImage(mixed $image, int $productId, int $buyerId): ?string
    {
        if (!$image instanceof UploadedFile) {
            return null;
        }

        return $image->store("reviews/products/{$productId}/buyer-{$buyerId}", 'public');
    }

    private function refreshProductRating(int $id): void
    {
        $query = ProductReview::where('product_id', $id)->where('is_verified_purchase', true);
        Product::whereKey($id)->update([
            'rating' => round((float) ($query->avg('rating') ?? 0), 2),
            'review_count' => $query->count(),
        ]);
    }

    private function refreshStoreRating(int $id): void
    {
        $query = StoreReview::where('store_id', $id)->where('is_verified_purchase', true);
        StoreStatistic::updateOrCreate(['store_id' => $id], [
            'average_rating' => round((float) ($query->avg('rating') ?? 0), 2),
            'total_reviews' => $query->count(),
        ]);
    }
}

<?php

namespace App\Services\Buyer;

use App\Models\{Order, Product, ProductReview, Store, StoreReview, StoreStatistic, User};
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class ReviewService
{
    public function productVerified(User $buyer, int $productId): bool
    {
        return DB::table('store_orders')->join('orders', 'orders.id', '=', 'store_orders.order_id')->join('order_items', 'order_items.store_order_id', '=', 'store_orders.id')->where('orders.user_id', $buyer->id)->where('order_items.product_id', $productId)->whereIn('store_orders.status', ['delivered'])->exists();
    }

    public function storeVerified(User $buyer, int $storeId): bool
    {
        return DB::table('store_orders')->join('orders', 'orders.id', '=', 'store_orders.order_id')->where('orders.user_id', $buyer->id)->where('store_orders.store_id', $storeId)->whereIn('store_orders.status', ['delivered'])->exists();
    }

    public function createProduct(User $buyer, Product $product, array $data): ProductReview
    {
        $review = ProductReview::create(['product_id' => $product->id, 'user_id' => $buyer->id, 'rating' => $data['rating'], 'comment' => $data['comment'] ?? null, 'is_verified_purchase' => $this->productVerified($buyer, $product->id)]);
        $this->refreshProductRating($product->id);
        return $review->load('user');
    }

    public function createStore(User $buyer, Store $store, array $data): StoreReview
    {
        $review = StoreReview::create(['store_id' => $store->id, 'user_id' => $buyer->id, 'rating' => $data['rating'], 'comment' => $data['comment'] ?? null, 'is_verified_purchase' => $this->storeVerified($buyer, $store->id)]);
        $this->refreshStoreRating($store->id);
        return $review->load('user');
    }

    public function updateProduct(User $buyer, int $id, array $data): ProductReview
    {
        $review = ProductReview::where('user_id', $buyer->id)->findOrFail($id);
        $review->fill(['rating' => $data['rating'] ?? $review->rating, 'comment' => $data['comment'] ?? null]);
        $review->is_verified_purchase = $this->productVerified($buyer, $review->product_id);
        $review->save(); $this->refreshProductRating($review->product_id);
        return $review->fresh('user');
    }

    public function updateStore(User $buyer, int $id, array $data): StoreReview
    {
        $review = StoreReview::where('user_id', $buyer->id)->findOrFail($id);
        $review->fill(['rating' => $data['rating'] ?? $review->rating, 'comment' => $data['comment'] ?? null]);
        $review->is_verified_purchase = $this->storeVerified($buyer, $review->store_id);
        $review->save(); $this->refreshStoreRating($review->store_id);
        return $review->fresh('user');
    }

    public function deleteProduct(User $buyer, int $id): void { $r = ProductReview::where('user_id', $buyer->id)->findOrFail($id); $pid = $r->product_id; $r->delete(); $this->refreshProductRating($pid); }
    public function deleteStore(User $buyer, int $id): void { $r = StoreReview::where('user_id', $buyer->id)->findOrFail($id); $sid = $r->store_id; $r->delete(); $this->refreshStoreRating($sid); }

    public function history(User $buyer, int $perPage = 20): LengthAwarePaginator
    {
        $products = ProductReview::with(['product.store'])->where('user_id', $buyer->id)->get()->map(fn ($r) => ['type' => 'product', 'id' => $r->id, 'rating' => $r->rating, 'comment' => $r->comment, 'is_verified_purchase' => (bool) $r->is_verified_purchase, 'created_at' => $r->created_at?->toISOString(), 'product' => $r->product]);
        $stores = StoreReview::with(['store'])->where('user_id', $buyer->id)->get()->map(fn ($r) => ['type' => 'store', 'id' => $r->id, 'rating' => $r->rating, 'comment' => $r->comment, 'is_verified_purchase' => (bool) $r->is_verified_purchase, 'created_at' => $r->created_at?->toISOString(), 'store' => $r->store]);
        $all = $products->concat($stores)->sortByDesc('created_at')->values(); $page = request()->integer('page', 1); $items = $all->forPage($page, $perPage)->values();
        return new \Illuminate\Pagination\LengthAwarePaginator($items, $all->count(), $perPage, $page, ['path' => request()->url()]);
    }

    private function refreshProductRating(int $id): void { $q = ProductReview::where('product_id', $id); Product::whereKey($id)->update(['rating' => round((float) ($q->avg('rating') ?? 0), 2), 'review_count' => $q->count()]); }
    private function refreshStoreRating(int $id): void { $q = StoreReview::where('store_id', $id); StoreStatistic::updateOrCreate(['store_id' => $id], ['average_rating' => round((float) ($q->avg('rating') ?? 0), 2), 'total_reviews' => $q->count()]); }
}

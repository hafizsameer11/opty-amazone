<?php

namespace App\Services\Buyer;

use App\Models\Product;
use App\Models\User;
use App\Models\WishlistItem;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class WishlistService
{
    public function list(User $buyer, int $perPage = 20): LengthAwarePaginator
    {
        return WishlistItem::with(['product.store', 'product.category'])
            ->where('user_id', $buyer->id)
            ->whereHas('product')
            ->latest()
            ->paginate($perPage);
    }

    public function save(User $buyer, int $productId): WishlistItem
    {
        $product = Product::visibleToBuyers()->findOrFail($productId);
        return WishlistItem::firstOrCreate(['user_id' => $buyer->id, 'product_id' => $product->id]);
    }

    public function remove(User $buyer, int $productId): void
    {
        WishlistItem::where('user_id', $buyer->id)->where('product_id', $productId)->delete();
    }

    public function contains(User $buyer, int $productId): bool
    {
        return WishlistItem::where('user_id', $buyer->id)->where('product_id', $productId)->exists();
    }
}

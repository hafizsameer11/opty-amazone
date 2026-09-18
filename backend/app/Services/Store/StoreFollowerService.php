<?php

namespace App\Services\Store;

use App\Models\Store;
use App\Models\StoreFollower;
use App\Models\User;
use Illuminate\Support\Facades\Log;

class StoreFollowerService
{
    /**
     * Buyer follows a store.
     */
    public function followStore(User $buyer, int $storeId): StoreFollower
    {
        try {
            if (!$buyer->isBuyer()) {
                throw new \Exception('Only buyers can follow stores');
            }

            $store = Store::findOrFail($storeId);

            // firstOrCreate keeps repeated follow clicks idempotent and also
            // avoids creating duplicate relationships for the unique pair.
            return StoreFollower::firstOrCreate([
                'store_id' => $storeId,
                'user_id' => $buyer->id,
            ]);
        } catch (\Exception $e) {
            Log::error('Follow store failed: ' . $e->getMessage(), [
                'buyer_id' => $buyer->id,
                'store_id' => $storeId,
            ]);

            throw $e;
        }
    }

    /**
     * Buyer unfollows a store.
     */
    public function unfollowStore(User $buyer, int $storeId): bool
    {
        try {
            if (!$buyer->isBuyer()) {
                throw new \Exception('Only buyers can unfollow stores');
            }

            // Unfollow is intentionally idempotent. This keeps repeated clicks,
            // stale tabs, and already-removed follows from becoming API errors.
            return (bool) StoreFollower::where('store_id', $storeId)
                ->where('user_id', $buyer->id)
                ->delete();
        } catch (\Exception $e) {
            Log::error('Unfollow store failed: ' . $e->getMessage(), [
                'buyer_id' => $buyer->id,
                'store_id' => $storeId,
            ]);

            throw $e;
        }
    }

    /**
     * Get store followers (seller view).
     */
    public function getStoreFollowers(User $seller): \Illuminate\Database\Eloquent\Collection
    {
        $store = $seller->store;

        if (!$store) {
            return collect();
        }

        return $store->followers()->with('user')->get();
    }

    /**
     * Get stores followed by buyer.
     */
    public function getFollowedStores(User $buyer): \Illuminate\Database\Eloquent\Collection
    {
        if (!$buyer->isBuyer()) {
            return collect();
        }

        // Query stores directly through the follower subquery. This avoids
        // returning partially hydrated relation values and naturally excludes
        // soft-deleted stores through the Store model's global scope.
        return Store::query()
            ->whereIn('id', StoreFollower::query()
                ->select('store_id')
                ->where('user_id', $buyer->id))
            ->orderBy('name')
            ->get();
    }

    /**
     * Check if buyer is following a store.
     */
    public function isFollowing(User $buyer, int $storeId): bool
    {
        return StoreFollower::where('store_id', $storeId)
            ->where('user_id', $buyer->id)
            ->exists();
    }
}

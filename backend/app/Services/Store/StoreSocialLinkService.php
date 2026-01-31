<?php

namespace App\Services\Store;

use App\Models\StoreSocialLink;
use App\Models\User;
use Illuminate\Support\Facades\Log;

class StoreSocialLinkService
{
    public function __construct(
        private StoreService $storeService
    ) {}

    /**
     * Get all social links for the store.
     */
    public function getSocialLinks(User $user): \Illuminate\Database\Eloquent\Collection
    {
        try {
            $store = $this->storeService->getStore($user);
            return $store->socialLinks;
        } catch (\Exception $e) {
            return collect();
        }
    }

    /**
     * Create a social link.
     */
    public function createSocialLink(User $user, array $data): StoreSocialLink
    {
        try {
            $store = $this->storeService->getStore($user);

            $data['store_id'] = $store->id;
            return StoreSocialLink::create($data);
        } catch (\Exception $e) {
            Log::error('Social link creation failed: ' . $e->getMessage(), [
                'user_id' => $user->id,
            ]);

            throw $e;
        }
    }

    /**
     * Update a social link.
     */
    public function updateSocialLink(User $user, int $linkId, array $data): StoreSocialLink
    {
        try {
            $store = $this->storeService->getStore($user);

            $link = StoreSocialLink::where('store_id', $store->id)
                ->findOrFail($linkId);

            $link->fill($data);
            $link->save();

            return $link->fresh();
        } catch (\Exception $e) {
            Log::error('Social link update failed: ' . $e->getMessage(), [
                'user_id' => $user->id,
                'link_id' => $linkId,
            ]);

            throw $e;
        }
    }

    /**
     * Delete a social link.
     */
    public function deleteSocialLink(User $user, int $linkId): bool
    {
        try {
            $store = $this->storeService->getStore($user);

            $link = StoreSocialLink::where('store_id', $store->id)
                ->findOrFail($linkId);

            return $link->delete();
        } catch (\Exception $e) {
            Log::error('Social link deletion failed: ' . $e->getMessage(), [
                'user_id' => $user->id,
                'link_id' => $linkId,
            ]);

            throw $e;
        }
    }

    /**
     * Toggle social link active status.
     */
    public function toggleSocialLink(User $user, int $linkId): StoreSocialLink
    {
        try {
            $store = $this->storeService->getStore($user);

            $link = StoreSocialLink::where('store_id', $store->id)
                ->findOrFail($linkId);

            $link->is_active = !$link->is_active;
            $link->save();

            return $link->fresh();
        } catch (\Exception $e) {
            Log::error('Social link toggle failed: ' . $e->getMessage(), [
                'user_id' => $user->id,
                'link_id' => $linkId,
            ]);

            throw $e;
        }
    }
}

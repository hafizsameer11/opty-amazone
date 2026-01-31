<?php

namespace App\Services\Store;

use App\Models\Store;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class StoreService
{
    /**
     * Get the seller's store. Creates one if it doesn't exist.
     */
    public function getStore(User $user): Store
    {
        $store = $user->store;

        if (!$store) {
            return $this->createDefaultStore($user);
        }

        return $store;
    }

    /**
     * Create a default store for the seller.
     */
    public function createDefaultStore(User $user): Store
    {
        try {
            $storeName = $user->name . "'s Store";
            $slug = Str::slug($storeName);
            
            // Ensure slug is unique
            $originalSlug = $slug;
            $counter = 1;
            while (Store::where('slug', $slug)->exists()) {
                $slug = $originalSlug . '-' . $counter;
                $counter++;
            }

            $store = Store::create([
                'user_id' => $user->id,
                'name' => $storeName,
                'slug' => $slug,
                'email' => $user->email,
                'phone' => $user->phone,
                'theme_color' => '#0066CC',
                'phone_visibility' => 'request',
                'status' => 'pending',
                'is_active' => true,
                'onboarding_status' => 'pending',
                'onboarding_level' => 1,
                'onboarding_percent' => 0,
            ]);

            // Create default statistics record
            $store->statistics()->create([
                'total_views' => 0,
                'total_clicks' => 0,
                'total_orders' => 0,
                'total_revenue' => 0,
                'total_products' => 0,
                'total_followers' => 0,
                'total_reviews' => 0,
                'average_rating' => 0,
            ]);

            return $store;
        } catch (\Exception $e) {
            Log::error('Default store creation failed: ' . $e->getMessage(), [
                'user_id' => $user->id,
            ]);

            throw $e;
        }
    }

    /**
     * Update the store profile.
     */
    public function updateStore(User $user, array $data): Store
    {
        try {
            $store = $this->getStore($user);

            // Generate slug if name is being updated
            if (isset($data['name']) && $data['name'] !== $store->name) {
                $slug = Str::slug($data['name']);
                // Ensure slug is unique
                $originalSlug = $slug;
                $counter = 1;
                while (Store::where('slug', $slug)->where('id', '!=', $store->id)->exists()) {
                    $slug = $originalSlug . '-' . $counter;
                    $counter++;
                }
                $data['slug'] = $slug;
            }

            $store->fill($data);
            $store->save();

            return $store->fresh();
        } catch (\Exception $e) {
            Log::error('Store update failed: ' . $e->getMessage(), [
                'user_id' => $user->id,
            ]);

            throw $e;
        }
    }

    /**
     * Upload profile image.
     */
    public function uploadProfileImage(User $user, UploadedFile $file): Store
    {
        try {
            $store = $this->getStore($user);

            // Delete old image if exists
            if ($store->profile_image) {
                Storage::delete($store->profile_image);
            }

            // Store new image
            $path = $file->store("stores/{$store->id}/profile", 'public');
            $store->profile_image = $path;
            $store->save();

            return $store->fresh();
        } catch (\Exception $e) {
            Log::error('Profile image upload failed: ' . $e->getMessage(), [
                'user_id' => $user->id,
            ]);

            throw $e;
        }
    }

    /**
     * Upload banner image.
     */
    public function uploadBannerImage(User $user, UploadedFile $file): Store
    {
        try {
            $store = $this->getStore($user);

            // Delete old image if exists
            if ($store->banner_image) {
                Storage::delete($store->banner_image);
            }

            // Store new image
            $path = $file->store("stores/{$store->id}/banner", 'public');
            $store->banner_image = $path;
            $store->save();

            return $store->fresh();
        } catch (\Exception $e) {
            Log::error('Banner image upload failed: ' . $e->getMessage(), [
                'user_id' => $user->id,
            ]);

            throw $e;
        }
    }

    /**
     * Delete profile image.
     */
    public function deleteProfileImage(User $user): Store
    {
        try {
            $store = $this->getStore($user);

            if ($store->profile_image) {
                Storage::delete($store->profile_image);
                $store->profile_image = null;
                $store->save();
            }

            return $store->fresh();
        } catch (\Exception $e) {
            Log::error('Profile image deletion failed: ' . $e->getMessage(), [
                'user_id' => $user->id,
            ]);

            throw $e;
        }
    }

    /**
     * Delete banner image.
     */
    public function deleteBannerImage(User $user): Store
    {
        try {
            $store = $this->getStore($user);

            if ($store->banner_image) {
                Storage::delete($store->banner_image);
                $store->banner_image = null;
                $store->save();
            }

            return $store->fresh();
        } catch (\Exception $e) {
            Log::error('Banner image deletion failed: ' . $e->getMessage(), [
                'user_id' => $user->id,
            ]);

            throw $e;
        }
    }

    /**
     * Update theme color.
     */
    public function updateTheme(User $user, string $color): Store
    {
        try {
            $store = $this->getStore($user);

            $store->theme_color = $color;
            $store->save();

            return $store->fresh();
        } catch (\Exception $e) {
            Log::error('Theme update failed: ' . $e->getMessage(), [
                'user_id' => $user->id,
            ]);

            throw $e;
        }
    }

    /**
     * Update phone visibility.
     */
    public function updatePhoneVisibility(User $user, string $visibility): Store
    {
        try {
            $store = $this->getStore($user);

            $store->phone_visibility = $visibility;
            $store->save();

            return $store->fresh();
        } catch (\Exception $e) {
            Log::error('Phone visibility update failed: ' . $e->getMessage(), [
                'user_id' => $user->id,
            ]);

            throw $e;
        }
    }

    /**
     * Get store statistics.
     */
    public function getStoreStatistics(User $user): \App\Models\StoreStatistic
    {
        $store = $this->getStore($user);

        // Create statistics if they don't exist
        if (!$store->statistics) {
            return $store->statistics()->create([
                'total_views' => 0,
                'total_clicks' => 0,
                'total_orders' => 0,
                'total_revenue' => 0,
                'total_products' => 0,
                'total_followers' => 0,
                'total_reviews' => 0,
                'average_rating' => 0,
            ]);
        }

        return $store->statistics;
    }

    /**
     * Get store overview with all related data.
     */
    public function getStoreOverview(User $user): ?Store
    {
        $store = $user->store;

        if (!$store) {
            return null;
        }

        return $store->load([
            'socialLinks',
            'followers',
            'reviews',
            'storeUsers.user',
            'statistics',
        ]);
    }
}

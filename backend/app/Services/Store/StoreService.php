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

    /**
     * Get dashboard statistics for the seller.
     */
    public function getDashboardStatistics(User $user): array
    {
        $store = $this->getStore($user);

        // Get real-time counts
        $totalProducts = \App\Models\Product::where('store_id', $store->id)->count();
        $totalOrders = \App\Models\StoreOrder::where('store_id', $store->id)->count();
        $pendingOrders = \App\Models\StoreOrder::where('store_id', $store->id)
            ->where('status', 'pending')
            ->count();
        $paidOrders = \App\Models\StoreOrder::where('store_id', $store->id)
            ->where('status', 'paid')
            ->count();
        $totalFollowers = $store->followers()->count();
        
        // Calculate total revenue from delivered orders
        $totalRevenue = \App\Models\StoreOrder::where('store_id', $store->id)
            ->where('status', 'delivered')
            ->sum('total');

        // Get recent orders (last 5)
        $recentOrders = \App\Models\StoreOrder::where('store_id', $store->id)
            ->with(['order.user', 'items'])
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get();

        // Calculate revenue for current month and last month for comparison
        $currentMonthRevenue = \App\Models\StoreOrder::where('store_id', $store->id)
            ->where('status', 'delivered')
            ->whereMonth('delivered_at', now()->month)
            ->whereYear('delivered_at', now()->year)
            ->sum('total');

        $lastMonthRevenue = \App\Models\StoreOrder::where('store_id', $store->id)
            ->where('status', 'delivered')
            ->whereMonth('delivered_at', now()->subMonth()->month)
            ->whereYear('delivered_at', now()->subMonth()->year)
            ->sum('total');

        // Calculate percentage changes
        $revenueChange = $lastMonthRevenue > 0 
            ? round((($currentMonthRevenue - $lastMonthRevenue) / $lastMonthRevenue) * 100, 1)
            : ($currentMonthRevenue > 0 ? 100 : 0);

        // Get current month and last month counts for products
        $currentMonthProducts = \App\Models\Product::where('store_id', $store->id)
            ->whereMonth('created_at', now()->month)
            ->whereYear('created_at', now()->year)
            ->count();

        $lastMonthProducts = \App\Models\Product::where('store_id', $store->id)
            ->whereMonth('created_at', now()->subMonth()->month)
            ->whereYear('created_at', now()->subMonth()->year)
            ->count();

        $productsChange = $lastMonthProducts > 0
            ? round((($currentMonthProducts - $lastMonthProducts) / $lastMonthProducts) * 100, 1)
            : ($currentMonthProducts > 0 ? 100 : 0);

        // Get current month and last month counts for orders
        $currentMonthOrders = \App\Models\StoreOrder::where('store_id', $store->id)
            ->whereMonth('created_at', now()->month)
            ->whereYear('created_at', now()->year)
            ->count();

        $lastMonthOrders = \App\Models\StoreOrder::where('store_id', $store->id)
            ->whereMonth('created_at', now()->subMonth()->month)
            ->whereYear('created_at', now()->subMonth()->year)
            ->count();

        $ordersChange = $lastMonthOrders > 0
            ? round((($currentMonthOrders - $lastMonthOrders) / $lastMonthOrders) * 100, 1)
            : ($currentMonthOrders > 0 ? 100 : 0);

        // Get current month and last month counts for followers
        $currentMonthFollowers = $store->followers()
            ->whereMonth('created_at', now()->month)
            ->whereYear('created_at', now()->year)
            ->count();

        $lastMonthFollowers = $store->followers()
            ->whereMonth('created_at', now()->subMonth()->month)
            ->whereYear('created_at', now()->subMonth()->year)
            ->count();

        $followersChange = $lastMonthFollowers > 0
            ? round((($currentMonthFollowers - $lastMonthFollowers) / $lastMonthFollowers) * 100, 1)
            : ($currentMonthFollowers > 0 ? 100 : 0);

        return [
            'total_products' => $totalProducts,
            'total_orders' => $totalOrders,
            'pending_orders' => $pendingOrders,
            'paid_orders' => $paidOrders,
            'total_followers' => $totalFollowers,
            'total_revenue' => (float) $totalRevenue,
            'recent_orders' => $recentOrders->map(function ($order) {
                return [
                    'id' => $order->id,
                    'order_no' => $order->order->order_no,
                    'customer_name' => $order->order->user->name,
                    'status' => $order->status,
                    'total' => (float) $order->total,
                    'created_at' => $order->created_at->toISOString(),
                    'items_count' => $order->items->count(),
                ];
            }),
            'statistics' => [
                'products' => [
                    'current' => $currentMonthProducts,
                    'last' => $lastMonthProducts,
                    'change' => $productsChange,
                ],
                'orders' => [
                    'current' => $currentMonthOrders,
                    'last' => $lastMonthOrders,
                    'change' => $ordersChange,
                ],
                'followers' => [
                    'current' => $currentMonthFollowers,
                    'last' => $lastMonthFollowers,
                    'change' => $followersChange,
                ],
                'revenue' => [
                    'current' => (float) $currentMonthRevenue,
                    'last' => (float) $lastMonthRevenue,
                    'change' => $revenueChange,
                ],
            ],
        ];
    }
}

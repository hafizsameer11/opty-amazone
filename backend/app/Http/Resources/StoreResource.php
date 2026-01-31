<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StoreResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        // Count active products for this store
        $productsCount = \App\Models\Product::where('store_id', $this->id)
            ->where('is_active', true)
            ->count();
        
        // Count followers for this store
        $followersCount = $this->followers()->count();
        
        // Calculate average rating from reviews
        $rating = $this->reviews()->avg('rating');
        
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'email' => $this->email,
            'phone' => $this->phone,
            'profile_image' => $this->profile_image,
            'profile_image_url' => $this->profile_image_url,
            'banner_image' => $this->banner_image,
            'banner_image_url' => $this->banner_image_url,
            'theme_color' => $this->theme_color,
            'phone_visibility' => $this->phone_visibility,
            'status' => $this->status,
            'is_active' => $this->is_active,
            'onboarding_status' => $this->onboarding_status,
            'onboarding_level' => $this->onboarding_level,
            'onboarding_percent' => $this->onboarding_percent,
            'meta' => $this->meta,
            'products_count' => $productsCount,
            'followers_count' => $followersCount,
            'rating' => $rating ? round((float) $rating, 2) : null,
            'created_at' => $this->created_at->toISOString(),
            'updated_at' => $this->updated_at->toISOString(),
        ];
    }
}

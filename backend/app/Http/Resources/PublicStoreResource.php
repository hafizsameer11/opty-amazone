<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Store representation intended for buyer/public responses.
 *
 * Seller-only fields remain in StoreResource. In particular, a store phone
 * number is only exposed when the seller explicitly makes it public.
 */
class PublicStoreResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $productsCount = \App\Models\Product::where('store_id', $this->id)
            ->where('is_active', true)
            ->count();

        $followersCount = $this->followers()->count();
        $verifiedReviews = $this->reviews()->where('is_verified_purchase', true);
        $reviewsCount = (clone $verifiedReviews)->count();
        $rating = $verifiedReviews->avg('rating');
        $links = $this->relationLoaded('socialLinks')
            ? $this->socialLinks->where('is_active', true)
            : $this->socialLinks()->where('is_active', true)->get();

        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'description' => $this->description,
            'email' => $this->email,
            'phone' => $this->phone_visibility === 'public' ? $this->phone : null,
            'profile_image' => $this->profile_image,
            'profile_image_url' => $this->profile_image_url,
            'banner_image' => $this->banner_image,
            'banner_image_url' => $this->banner_image_url,
            'theme_color' => $this->theme_color,
            'social_links' => StoreSocialLinkResource::collection($links)->resolve($request),
            'status' => $this->status,
            'is_active' => $this->is_active,
            'products_count' => $productsCount,
            'followers_count' => $followersCount,
            'reviews_count' => $reviewsCount,
            'rating' => $rating ? round((float) $rating, 2) : null,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}

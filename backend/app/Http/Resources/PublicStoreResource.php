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
        $anonymous = $this->isAnonymousSeller();
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
            // Preserve the internal id for product and order processing, but
            // never serialise the seller's business identity to buyers while
            // anonymous mode is selected.
            'name' => $this->publicSellerName(),
            'display_name' => $this->publicSellerName(),
            'seller_code' => $anonymous ? $this->public_seller_code : null,
            'is_anonymous' => $anonymous,
            'slug' => $anonymous ? null : $this->slug,
            'description' => $anonymous ? null : $this->description,
            'email' => $anonymous ? null : $this->email,
            'phone' => ! $anonymous && $this->phone_visibility === 'public' ? $this->phone : null,
            // Preserve the public visual storefront so its card keeps the
            // same layout. The buyer-facing label above those assets remains
            // the stable VX code while anonymous mode is enabled.
            'profile_image' => $this->profile_image,
            'profile_image_url' => $this->profile_image_url,
            'banner_image' => $this->banner_image,
            'banner_image_url' => $this->banner_image_url,
            'theme_color' => $this->theme_color,
            'social_links' => $anonymous ? [] : StoreSocialLinkResource::collection($links)->resolve($request),
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

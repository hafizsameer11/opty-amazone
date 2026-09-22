import apiClient from '@/lib/api-client';

export type SellerReviewType = 'store' | 'product';

export interface SellerReview {
  id: number;
  product_id?: number;
  store_id?: number;
  rating: number;
  comment?: string | null;
  image_url?: string | null;
  is_verified_purchase: boolean;
  created_at?: string | null;
  user?: { id: number; name: string; profile_image_url?: string | null } | null;
  product?: { id: number; name: string; slug?: string | null } | null;
  store?: { id: number; name: string; slug?: string | null } | null;
}

export interface SellerReviewResponse {
  reviews: SellerReview[];
  pagination: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export const reviewService = {
  async getReviews(type: SellerReviewType, perPage = 100): Promise<SellerReviewResponse> {
    const response = await apiClient.get('/seller/profile/reviews', {
      params: { type, per_page: perPage },
    });
    return response.data.data;
  },
};

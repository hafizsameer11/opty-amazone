import apiClient from '@/lib/api-client';

export interface ReviewEligibilityOption {
  order_item_id?: number;
  store_order_id?: number;
  order_id: number;
  order_no?: string | null;
  quantity?: number;
  purchased_at?: string | null;
}

export interface ReviewEligibility {
  eligible: boolean;
  already_reviewed: boolean;
  options: ReviewEligibilityOption[];
}

export interface BuyerReview {
  id: number;
  product_id?: number;
  store_id?: number;
  order_item_id?: number | null;
  store_order_id?: number | null;
  image?: string | null;
  image_url?: string | null;
  user?: { id: number; name: string; profile_image_url?: string | null } | null;
  rating: number;
  comment?: string | null;
  is_verified_purchase: boolean;
  seller_reply?: string | null;
  seller_replied_at?: string | null;
  created_at: string;
  updated_at?: string;
}

export const reviewService = {
  async getProductEligibility(productId: number): Promise<ReviewEligibility> {
    const response = await apiClient.get(`/buyer/reviews/product/${productId}/eligibility`);
    return response.data.data;
  },

  async getStoreEligibility(storeId: number): Promise<ReviewEligibility> {
    const response = await apiClient.get(`/buyer/reviews/store/${storeId}/eligibility`);
    return response.data.data;
  },

  async createProductReview(productId: number, data: { rating: number; comment?: string; order_item_id?: number; image?: File | null }) {
    const payload = new FormData();
    payload.append('rating', String(data.rating));
    if (data.comment) payload.append('comment', data.comment);
    if (data.order_item_id) payload.append('order_item_id', String(data.order_item_id));
    if (data.image) payload.append('image', data.image);
    const response = await apiClient.post(`/buyer/product/${productId}/reviews`, payload);
    return response.data.data.review as BuyerReview;
  },

  async createStoreReview(storeId: number, data: { rating: number; comment?: string; store_order_id?: number }) {
    const response = await apiClient.post(`/buyer/stores/${storeId}/reviews`, data);
    return response.data.data.review as BuyerReview;
  },

  async getProductReviews(productId: number, perPage = 10): Promise<{ reviews: BuyerReview[]; pagination: { total: number } }> {
    const response = await apiClient.get(`/products/${productId}/reviews`, { params: { per_page: perPage } });
    return response.data.data;
  },
};

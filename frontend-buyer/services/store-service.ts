import apiClient from '@/lib/api-client';
import type { Store, StoreReview, CreateReviewData } from '@/types/store';

export interface PublicStore {
  id: number;
  name: string;
  slug: string;
  description?: string;
  profile_image?: string;
  profile_image_url?: string;
  banner_image?: string;
  banner_image_url?: string;
  rating?: number;
  followers_count?: number;
  products_count?: number;
  is_active: boolean;
  status: string;
}

export interface StoreListResponse {
  stores: PublicStore[];
  pagination: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export class StoreService {
  /**
   * Get all stores (public endpoint)
   */
  static async getAllStores(params?: { search?: string; per_page?: number; page?: number }): Promise<StoreListResponse> {
    const response = await apiClient.get('/stores', { params });
    return response.data.data;
  }

  /**
   * Get public store details (public endpoint)
   */
  static async getPublicStore(id: number): Promise<{ store: PublicStore }> {
    const response = await apiClient.get(`/stores/${id}`);
    return response.data.data;
  }

  /**
   * Get public store reviews (public endpoint)
   */
  static async getPublicStoreReviews(id: number, params?: { per_page?: number; page?: number }): Promise<{ reviews: StoreReview[]; pagination: any }> {
    const response = await apiClient.get(`/stores/${id}/reviews`, { params });
    return response.data.data;
  }

  /**
   * Get store details (authenticated endpoint)
   */
  static async getStore(id: number): Promise<{ success: boolean; data: { store: Store } }> {
    const response = await apiClient.get(`/buyer/stores/${id}`);
    return response.data;
  }

  /**
   * Follow a store
   */
  static async followStore(id: number): Promise<{ success: boolean; data: { follower: any }; message: string }> {
    const response = await apiClient.post(`/buyer/stores/${id}/follow`);
    return response.data;
  }

  /**
   * Unfollow a store
   */
  static async unfollowStore(id: number): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post(`/buyer/stores/${id}/unfollow`);
    return response.data;
  }

  /**
   * Get followed stores
   */
  static async getFollowedStores(): Promise<{ success: boolean; data: { stores: Store[] } }> {
    const response = await apiClient.get('/buyer/stores/followed');
    return response.data;
  }

  /**
   * Get store reviews
   */
  static async getStoreReviews(id: number, filters?: any): Promise<{ success: boolean; data: { reviews: StoreReview[]; pagination: any } }> {
    const response = await apiClient.get(`/buyer/stores/${id}/reviews`, { params: filters });
    return response.data;
  }

  /**
   * Create store review
   */
  static async createReview(id: number, data: CreateReviewData): Promise<{ success: boolean; data: { review: StoreReview }; message: string }> {
    const response = await apiClient.post(`/buyer/stores/${id}/reviews`, data);
    return response.data;
  }
}

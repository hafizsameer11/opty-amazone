import apiClient from '@/lib/api-client';
import type { Store, StoreReview, CreateReviewData } from '@/types/store';

export class StoreService {
  /**
   * Get store details
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

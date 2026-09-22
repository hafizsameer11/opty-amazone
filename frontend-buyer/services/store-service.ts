import apiClient from '@/lib/api-client';
import type { Store, StoreReview, CreateReviewData } from '@/types/store';

export interface StoreSocialLinkPublic {
  id: number;
  platform: string;
  url: string;
  is_active?: boolean;
}

export interface PublicStore {
  id: number;
  name: string;
  slug: string;
  description?: string;
  phone?: string | null;
  profile_image?: string;
  profile_image_url?: string;
  banner_image?: string;
  banner_image_url?: string;
  rating?: number;
  reviews_count?: number;
  followers_count?: number;
  products_count?: number;
  social_links?: StoreSocialLinkPublic[];
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
    const payload = response.data?.data ?? response.data;
    const rawStores = payload?.stores;
    const stores = Array.isArray(rawStores)
      ? rawStores
      : Array.isArray(rawStores?.data)
        ? rawStores.data
        : [];
    return {
      stores,
      pagination: payload?.pagination ?? {
        current_page: 1,
        last_page: 1,
        per_page: params?.per_page ?? 15,
        total: stores.length,
      },
    };
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
   * Whether the logged-in buyer follows this store (false for guests or non-buyers).
   */
  static async getFollowStatus(storeId: number): Promise<boolean> {
    const response = await apiClient.get(`/buyer/stores/${storeId}/follow-status`);
    return Boolean(response.data?.data?.is_following);
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
  static async getFollowedStores(): Promise<{ success: boolean; data: { stores: PublicStore[] } }> {
    const response = await apiClient.get('/buyer/stores/followed');
    const root = response.data ?? {};
    const payload = root.data ?? root;
    const candidate = Array.isArray(payload) ? payload : payload?.stores ?? payload?.data?.stores;
    const stores = Array.isArray(candidate)
      ? candidate
      : Array.isArray(candidate?.data)
        ? candidate.data
        : [];
    return { success: response.data?.success ?? true, data: { stores } };
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

  /**
   * Report a store (fraud / abuse)
   */
  static async reportStore(
    storeId: number,
    data: { reason: string; details?: string; evidence?: File[] }
  ): Promise<{ success: boolean; message: string }> {
    const form = new FormData();
    form.append('reason', data.reason);
    if (data.details) form.append('details', data.details);
    (data.evidence || []).forEach((file) => form.append('evidence[]', file));
    const response = await apiClient.post(`/buyer/stores/${storeId}/report`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }
}

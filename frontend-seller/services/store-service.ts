import apiClient from '@/lib/api-client';
import type {
  Store,
  StoreSocialLink,
  StoreUser,
  StoreStatistic,
  UpdateStoreData,
  CreateSocialLinkData,
  InviteUserData,
} from '@/types/store';

export class StoreService {
  /**
   * Get store overview
   */
  static async getStore(): Promise<{ success: boolean; data: { store: Store } }> {
    const response = await apiClient.get('/seller/store');
    return response.data;
  }

  /**
   * Update store profile
   */
  static async updateStore(data: UpdateStoreData): Promise<{ success: boolean; data: { store: Store }; message: string }> {
    const response = await apiClient.put('/seller/store', data);
    return response.data;
  }

  /**
   * Upload profile image
   */
  static async uploadProfileImage(file: File): Promise<{ success: boolean; data: { store: Store }; message: string }> {
    const formData = new FormData();
    formData.append('image', file);
    const response = await apiClient.post('/seller/store/profile-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  /**
   * Upload banner image
   */
  static async uploadBannerImage(file: File): Promise<{ success: boolean; data: { store: Store }; message: string }> {
    const formData = new FormData();
    formData.append('image', file);
    const response = await apiClient.post('/seller/store/banner-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  /**
   * Delete profile image
   */
  static async deleteProfileImage(): Promise<{ success: boolean; data: { store: Store }; message: string }> {
    const response = await apiClient.delete('/seller/store/profile-image');
    return response.data;
  }

  /**
   * Delete banner image
   */
  static async deleteBannerImage(): Promise<{ success: boolean; data: { store: Store }; message: string }> {
    const response = await apiClient.delete('/seller/store/banner-image');
    return response.data;
  }

  /**
   * Update theme color
   */
  static async updateTheme(themeColor: string): Promise<{ success: boolean; data: { store: Store }; message: string }> {
    const response = await apiClient.put('/seller/store/theme', { theme_color: themeColor });
    return response.data;
  }

  /**
   * Get store statistics
   */
  static async getStatistics(): Promise<{ success: boolean; data: { statistics: StoreStatistic } }> {
    const response = await apiClient.get('/seller/store/statistics');
    return response.data;
  }

  /**
   * Get store overview with all related data
   */
  static async getOverview(): Promise<{ success: boolean; data: { store: Store } }> {
    const response = await apiClient.get('/seller/store/overview');
    return response.data;
  }

  /**
   * Get phone visibility setting
   */
  static async getPhoneVisibility(): Promise<{ success: boolean; data: { phone_visibility: string } }> {
    const response = await apiClient.get('/seller/store/settings/phone-visibility');
    return response.data;
  }

  /**
   * Update phone visibility
   */
  static async updatePhoneVisibility(visibility: 'public' | 'request' | 'hidden'): Promise<{ success: boolean; data: { store: Store }; message: string }> {
    const response = await apiClient.put('/seller/store/settings/phone-visibility', { phone_visibility: visibility });
    return response.data;
  }

  /**
   * Get all settings
   */
  static async getSettings(): Promise<{ success: boolean; data: { settings: any } }> {
    const response = await apiClient.get('/seller/store/settings');
    return response.data;
  }

  /**
   * Update settings
   */
  static async updateSettings(data: { is_active?: boolean; phone_visibility?: string }): Promise<{ success: boolean; data: { store: Store }; message: string }> {
    const response = await apiClient.put('/seller/store/settings', data);
    return response.data;
  }

  /**
   * Get all social links
   */
  static async getSocialLinks(): Promise<{ success: boolean; data: { social_links: StoreSocialLink[] } }> {
    const response = await apiClient.get('/seller/store/social-links');
    return response.data;
  }

  /**
   * Create social link
   */
  static async createSocialLink(data: CreateSocialLinkData): Promise<{ success: boolean; data: { social_link: StoreSocialLink }; message: string }> {
    const response = await apiClient.post('/seller/store/social-links', data);
    return response.data;
  }

  /**
   * Update social link
   */
  static async updateSocialLink(id: number, data: Partial<CreateSocialLinkData>): Promise<{ success: boolean; data: { social_link: StoreSocialLink }; message: string }> {
    const response = await apiClient.put(`/seller/store/social-links/${id}`, data);
    return response.data;
  }

  /**
   * Delete social link
   */
  static async deleteSocialLink(id: number): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete(`/seller/store/social-links/${id}`);
    return response.data;
  }

  /**
   * Toggle social link
   */
  static async toggleSocialLink(id: number): Promise<{ success: boolean; data: { social_link: StoreSocialLink }; message: string }> {
    const response = await apiClient.post(`/seller/store/social-links/${id}/toggle`);
    return response.data;
  }

  /**
   * Get store users
   */
  static async getStoreUsers(): Promise<{ success: boolean; data: { users: StoreUser[] } }> {
    const response = await apiClient.get('/seller/store/users');
    return response.data;
  }

  /**
   * Invite user
   */
  static async inviteUser(data: InviteUserData): Promise<{ success: boolean; data: { user: StoreUser }; message: string }> {
    const response = await apiClient.post('/seller/store/users', data);
    return response.data;
  }

  /**
   * Update store user
   */
  static async updateStoreUser(id: number, data: { role?: string; permissions?: string[]; is_active?: boolean }): Promise<{ success: boolean; data: { user: StoreUser }; message: string }> {
    const response = await apiClient.put(`/seller/store/users/${id}`, data);
    return response.data;
  }

  /**
   * Remove store user
   */
  static async removeStoreUser(id: number): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.delete(`/seller/store/users/${id}`);
    return response.data;
  }

  /**
   * Get dashboard statistics
   */
  static async getDashboard(): Promise<{
    success: boolean;
    data: {
      total_products: number;
      total_orders: number;
      pending_orders: number;
      paid_orders: number;
      total_followers: number;
      total_revenue: number;
      recent_orders: Array<{
        id: number;
        order_no: string;
        customer_name: string;
        status: string;
        total: number;
        created_at: string;
        items_count: number;
      }>;
      statistics: {
        products: { current: number; last: number; change: number };
        orders: { current: number; last: number; change: number };
        followers: { current: number; last: number; change: number };
        revenue: { current: number; last: number; change: number };
      };
    };
  }> {
    const response = await apiClient.get('/seller/store/dashboard');
    return response.data;
  }
}

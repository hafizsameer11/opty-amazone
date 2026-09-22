import apiClient from '@/lib/api-client';

export interface SellerUnreadCounts {
  messages: number;
  orders: number;
  notifications: number;
}

export interface MarketplaceNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  url?: string | null;
  context?: Record<string, unknown>;
  read_at?: string | null;
  created_at?: string | null;
}

export const notificationService = {
  async getUnreadCounts(): Promise<SellerUnreadCounts> {
    const res = await apiClient.get('/seller/notifications/unread');
    const data = (res.data.data || {}) as Partial<SellerUnreadCounts>;
    return {
      messages: Number(data.messages || 0),
      orders: Number(data.orders || 0),
      notifications: Number(data.notifications || 0),
    };
  },
  async list(params?: { page?: number; per_page?: number }): Promise<{ notifications: MarketplaceNotification[]; pagination: { current_page: number; last_page: number; per_page: number; total: number }; unread_count: number }> {
    const res = await apiClient.get('/seller/notifications', { params });
    return res.data.data;
  },
  async markRead(id: string): Promise<void> {
    await apiClient.post(`/seller/notifications/${encodeURIComponent(id)}/read`);
  },
  async markAllRead(): Promise<void> {
    await apiClient.post('/seller/notifications/read-all');
  },
};

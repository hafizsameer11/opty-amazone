import apiClient from '@/lib/api-client';

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

interface NotificationPage {
  notifications: MarketplaceNotification[];
  pagination: { current_page: number; last_page: number; per_page: number; total: number };
  unread_count: number;
}

export const notificationService = {
  async list(params?: { page?: number; per_page?: number }): Promise<NotificationPage> {
    const response = await apiClient.get('/buyer/notifications', { params });
    return response.data.data;
  },
  async getUnreadCount(): Promise<number> {
    const response = await apiClient.get('/buyer/notifications/unread');
    return Number(response.data.data?.unread_count || 0);
  },
  async markRead(id: string): Promise<void> {
    await apiClient.post(`/buyer/notifications/${encodeURIComponent(id)}/read`);
  },
  async markAllRead(): Promise<void> {
    await apiClient.post('/buyer/notifications/read-all');
  },
};

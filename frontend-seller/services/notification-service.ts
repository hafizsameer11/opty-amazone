import apiClient from '@/lib/api-client';

export interface SellerUnreadCounts {
  messages: number;
  orders: number;
}

export const notificationService = {
  async getUnreadCounts(): Promise<SellerUnreadCounts> {
    const res = await apiClient.get('/seller/notifications/unread');
    return res.data.data as SellerUnreadCounts;
  },
};

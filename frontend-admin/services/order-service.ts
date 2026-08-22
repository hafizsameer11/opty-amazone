import apiClient from '@/lib/api-client';

export interface Order {
  id: number;
  order_no: string;
  user: { id: number; name: string; email: string };
  grand_total: number;
  payment_status: string;
  created_at: string;
}

export const orderService = {
  async getAll(params?: Record<string, unknown>) {
    const res = await apiClient.get('/admin/orders', { params });
    return res.data.data;
  },

  async getOne(id: number) {
    const res = await apiClient.get(`/admin/orders/${id}`);
    return res.data.data;
  },

  /** Updates checkout/payment state on the parent order */
  async updatePaymentStatus(id: number, payment_status: string) {
    const res = await apiClient.put(`/admin/orders/${id}/status`, { payment_status });
    return res.data.data;
  },

  /** Updates per-store fulfillment (seller pipeline) */
  async updateStoreOrderStatus(storeOrderId: number, status: string) {
    const res = await apiClient.put(`/admin/store-orders/${storeOrderId}/status`, { status });
    return res.data.data;
  },
};

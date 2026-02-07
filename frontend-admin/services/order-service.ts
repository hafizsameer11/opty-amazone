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
  async getAll(params?: any) {
    const res = await apiClient.get('/admin/orders', { params });
    return res.data.data;
  },

  async getOne(id: number) {
    const res = await apiClient.get(`/admin/orders/${id}`);
    return res.data.data;
  },

  async updateStatus(id: number, status: string) {
    const res = await apiClient.put(`/admin/orders/${id}/status`, { status });
    return res.data.data;
  },
};

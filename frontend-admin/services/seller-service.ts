import apiClient from '@/lib/api-client';

export interface Seller {
  id: number;
  name: string;
  user: {
    id: number;
    name: string;
    email: string;
  };
  products_count?: number;
  orders_count?: number;
}

export const sellerService = {
  async getAll(params?: any) {
    const res = await apiClient.get('/admin/sellers', { params });
    return res.data.data;
  },

  async getOne(id: number) {
    const res = await apiClient.get(`/admin/sellers/${id}`);
    return res.data.data;
  },

  async approve(id: number) {
    const res = await apiClient.post(`/admin/sellers/${id}/approve`);
    return res.data.data;
  },

  async reject(id: number, reason: string) {
    const res = await apiClient.post(`/admin/sellers/${id}/reject`, { reason });
    return res.data.data;
  },
};

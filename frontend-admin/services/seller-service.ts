import apiClient from '@/lib/api-client';

export interface Seller {
  id: number;
  name: string;
  status?: string;
  onboarding_status?: string;
  is_active?: boolean;
  user: {
    id: number;
    name: string;
    email: string;
  };
  products_count?: number;
  orders_count?: number;
}

export const sellerService = {
  async getAll(params?: Record<string, unknown>) {
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

  async suspend(id: number) {
    const res = await apiClient.post(`/admin/sellers/${id}/suspend`);
    return res.data.data;
  },

  async warn(id: number, reason: string) {
    const res = await apiClient.post(`/admin/sellers/${id}/warn`, { reason });
    return res.data.data;
  },

  async block(id: number) {
    const res = await apiClient.post(`/admin/sellers/${id}/block`);
    return res.data.data;
  },

  async activate(id: number) {
    const res = await apiClient.post(`/admin/sellers/${id}/activate`);
    return res.data.data;
  },
};

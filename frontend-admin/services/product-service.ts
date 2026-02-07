import apiClient from '@/lib/api-client';

export interface Product {
  id: number;
  name: string;
  sku: string;
  store: { id: number; name: string };
  category: { id: number; name: string };
  is_active: boolean;
  is_approved: boolean;
  price: number;
}

export const productService = {
  async getAll(params?: any) {
    const res = await apiClient.get('/admin/products', { params });
    return res.data.data;
  },

  async getOne(id: number) {
    const res = await apiClient.get(`/admin/products/${id}`);
    return res.data.data;
  },

  async approve(id: number) {
    const res = await apiClient.post(`/admin/products/${id}/approve`);
    return res.data.data;
  },

  async reject(id: number, reason: string) {
    const res = await apiClient.post(`/admin/products/${id}/reject`, { reason });
    return res.data.data;
  },

  async delete(id: number) {
    await apiClient.delete(`/admin/products/${id}`);
  },
};

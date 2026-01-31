import apiClient from '@/lib/api-client';

export interface Promotion {
  id: number;
  product_id: number;
  budget: number;
  spent: number;
  duration_days: number;
  start_date: string;
  end_date: string;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  views: number;
  clicks: number;
  product: {
    id: number;
    name: string;
  };
}

export const promotionService = {
  async getAll(params?: { per_page?: number; page?: number }) {
    const res = await apiClient.get('/seller/promotions', { params });
    return res.data.data;
  },

  async create(data: {
    product_id: number;
    budget: number;
    duration_days: number;
    target_audience?: any;
  }) {
    const res = await apiClient.post('/seller/promotions', data);
    return res.data.data;
  },

  async update(id: number, data: Partial<Promotion>) {
    const res = await apiClient.put(`/seller/promotions/${id}`, data);
    return res.data.data;
  },

  async delete(id: number) {
    await apiClient.delete(`/seller/promotions/${id}`);
  },

  async pause(id: number) {
    const res = await apiClient.post(`/seller/promotions/${id}/pause`);
    return res.data.data;
  },

  async resume(id: number) {
    const res = await apiClient.post(`/seller/promotions/${id}/resume`);
    return res.data.data;
  },
};


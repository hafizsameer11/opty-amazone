import apiClient from '@/lib/api-client';

export interface Coupon {
  id: number;
  code: string;
  store: { id: number; name: string };
  discount_type: string;
  discount_value: number;
  is_active: boolean;
  usages_count: number;
}

export const couponService = {
  async getAll(params?: any) {
    const res = await apiClient.get('/admin/coupons', { params });
    return res.data.data;
  },

  async toggleStatus(id: number) {
    const res = await apiClient.post(`/admin/coupons/${id}/toggle-status`);
    return res.data.data;
  },

  async destroy(id: number) {
    const res = await apiClient.delete(`/admin/coupons/${id}`);
    return res.data;
  },
};

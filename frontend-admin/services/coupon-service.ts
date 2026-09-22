import apiClient from '@/lib/api-client';

export interface Coupon {
  id: number;
  code: string;
  store: { id: number; name: string };
  discount_type: string;
  discount_value: number;
  is_active: boolean;
  status?: string;
  resolved_status?: string;
  scope?: 'store' | 'products' | 'categories' | 'variants';
  admin_disabled_at?: string | null;
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

  async getOne(id: number) {
    const res = await apiClient.get(`/admin/coupons/${id}`);
    return res.data.data as Coupon;
  },

  async usageHistory(id: number) {
    const res = await apiClient.get(`/admin/coupons/${id}/usage-history`);
    return res.data.data;
  },

  async auditHistory(id: number) {
    const res = await apiClient.get(`/admin/coupons/${id}/audit-history`);
    return res.data.data;
  },

  async disable(id: number) {
    const res = await apiClient.post(`/admin/coupons/${id}/disable`);
    return res.data.data;
  },

  async enable(id: number) {
    const res = await apiClient.post(`/admin/coupons/${id}/enable`);
    return res.data.data;
  },

  async destroy(id: number) {
    const res = await apiClient.delete(`/admin/coupons/${id}`);
    return res.data;
  },
};

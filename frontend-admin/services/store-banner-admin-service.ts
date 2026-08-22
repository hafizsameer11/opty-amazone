import apiClient from '@/lib/api-client';

export interface AdminStoreBanner {
  id: number;
  store_id: number;
  image: string;
  image_url?: string | null;
  title?: string | null;
  link?: string | null;
  position: string;
  sort_order: number;
  is_active: boolean;
  is_home_boosted: boolean;
  is_approved: boolean;
  rejection_reason?: string | null;
  store?: { id: number; name: string; slug: string; is_active?: boolean; status?: string };
  created_at?: string;
}

export const storeBannerAdminService = {
  async getAll(params?: Record<string, unknown>) {
    const res = await apiClient.get('/admin/store-banners', { params });
    return res.data.data;
  },

  async getOne(id: number) {
    const res = await apiClient.get(`/admin/store-banners/${id}`);
    return res.data.data;
  },

  async approve(id: number) {
    const res = await apiClient.post(`/admin/store-banners/${id}/approve`);
    return res.data.data;
  },

  async reject(id: number, reason: string) {
    const res = await apiClient.post(`/admin/store-banners/${id}/reject`, { reason });
    return res.data.data;
  },

  async toggleActive(id: number) {
    const res = await apiClient.post(`/admin/store-banners/${id}/toggle-active`);
    return res.data.data;
  },

  async delete(id: number) {
    await apiClient.delete(`/admin/store-banners/${id}`);
  },
};

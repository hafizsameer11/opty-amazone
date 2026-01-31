import apiClient from '@/lib/api-client';

export interface Banner {
  id: number;
  image: string;
  title?: string;
  link?: string;
  position: 'top' | 'middle' | 'bottom' | 'sidebar';
  sort_order: number;
  is_active: boolean;
}

export const bannerService = {
  async getAll() {
    const res = await apiClient.get('/seller/banners');
    return res.data.data;
  },

  async create(formData: FormData) {
    const res = await apiClient.post('/seller/banners', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data;
  },

  async update(id: number, data: Partial<Banner> | FormData) {
    const headers: any = {};
    if (data instanceof FormData) {
      headers['Content-Type'] = 'multipart/form-data';
    }
    const res = await apiClient.put(`/seller/banners/${id}`, data, { headers });
    return res.data.data;
  },

  async delete(id: number) {
    await apiClient.delete(`/seller/banners/${id}`);
  },

  async toggle(id: number) {
    const res = await apiClient.post(`/seller/banners/${id}/toggle`);
    return res.data.data;
  },

  async reorder(bannerIds: number[]) {
    const res = await apiClient.post('/seller/banners/reorder', { banner_ids: bannerIds });
    return res.data.data;
  },
};


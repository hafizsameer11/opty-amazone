import apiClient from '@/lib/api-client';

export interface Announcement {
  id: number;
  title: string;
  message: string;
  start_date?: string;
  end_date?: string;
  is_active: boolean;
}

export const announcementService = {
  async getAll(params?: { per_page?: number; page?: number }) {
    const res = await apiClient.get('/seller/announcements', { params });
    return res.data.data;
  },

  async create(data: {
    title: string;
    message: string;
    start_date?: string;
    end_date?: string;
    is_active?: boolean;
  }) {
    const res = await apiClient.post('/seller/announcements', data);
    return res.data.data;
  },

  async update(id: number, data: Partial<Announcement>) {
    const res = await apiClient.put(`/seller/announcements/${id}`, data);
    return res.data.data;
  },

  async delete(id: number) {
    await apiClient.delete(`/seller/announcements/${id}`);
  },

  async toggle(id: number) {
    const res = await apiClient.post(`/seller/announcements/${id}/toggle`);
    return res.data.data;
  },
};


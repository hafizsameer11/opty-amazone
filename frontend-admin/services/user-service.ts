import apiClient from '@/lib/api-client';

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: 'buyer' | 'seller' | 'admin';
  email_verified_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateUserData {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role: 'buyer' | 'seller' | 'admin';
}

export const userService = {
  async getAll(params?: any) {
    const res = await apiClient.get('/admin/users', { params });
    return res.data.data;
  },

  async getOne(id: number): Promise<User> {
    const res = await apiClient.get(`/admin/users/${id}`);
    return res.data.data;
  },

  async create(data: CreateUserData): Promise<User> {
    const res = await apiClient.post('/admin/users', data);
    return res.data.data;
  },

  async update(id: number, data: Partial<CreateUserData>): Promise<User> {
    const res = await apiClient.put(`/admin/users/${id}`, data);
    return res.data.data;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/admin/users/${id}`);
  },

  async toggleStatus(id: number): Promise<User> {
    const res = await apiClient.post(`/admin/users/${id}/toggle-status`);
    return res.data.data;
  },
};

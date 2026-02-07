import apiClient from '@/lib/api-client';

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  sort_order: number;
  is_active: boolean;
  subcategories?: Category[];
}

export interface CreateCategoryData {
  name: string;
  slug: string;
  description?: string;
  image?: string;
  sort_order?: number;
  is_active?: boolean;
}

export const categoryService = {
  async getAll() {
    const res = await apiClient.get('/admin/categories');
    return res.data.data;
  },

  async getOne(id: number): Promise<Category> {
    const res = await apiClient.get(`/admin/categories/${id}`);
    return res.data.data;
  },

  async create(data: CreateCategoryData): Promise<Category> {
    const res = await apiClient.post('/admin/categories', data);
    return res.data.data;
  },

  async update(id: number, data: Partial<CreateCategoryData>): Promise<Category> {
    const res = await apiClient.put(`/admin/categories/${id}`, data);
    return res.data.data;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/admin/categories/${id}`);
  },
};

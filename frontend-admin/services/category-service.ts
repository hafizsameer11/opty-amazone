import apiClient from '@/lib/api-client';

export interface Category {
  id: number;
  name: string;
  name_it?: string | null;
  slug: string;
  description?: string;
  image?: string;
  parent_id?: number | null;
  sort_order: number;
  is_active: boolean;
  children?: Category[];
  subcategories?: Category[];
}

/** Allowed fields when updating (English name/slug are locked server-side). */
export interface UpdateCategoryPayload {
  name_it?: string | null;
  description?: string;
  image?: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface CreateCategoryData {
  name: string;
  slug: string;
  name_it?: string;
  description?: string;
  image?: string;
  parent_id?: number | null;
  sort_order?: number;
  is_active?: boolean;
}

export const categoryService = {
  async getAll(params?: { search?: string }) {
    const res = await apiClient.get('/admin/categories', { params });
    return res.data.data as Category[];
  },

  async getOne(id: number): Promise<Category> {
    const res = await apiClient.get(`/admin/categories/${id}`);
    return res.data.data;
  },

  async create(data: CreateCategoryData): Promise<Category> {
    const res = await apiClient.post('/admin/categories', data);
    return res.data.data;
  },

  async update(id: number, data: UpdateCategoryPayload): Promise<Category> {
    const res = await apiClient.put(`/admin/categories/${id}`, data);
    return res.data.data;
  },

  async delete(_id: number): Promise<void> {
    await apiClient.delete(`/admin/categories/${_id}`);
  },
};

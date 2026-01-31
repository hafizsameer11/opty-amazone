import apiClient from '@/lib/api-client';

export interface Product {
  id: number;
  store_id: number;
  category_id?: number;
  sub_category_id?: number;
  name: string;
  slug: string;
  sku: string;
  description?: string;
  short_description?: string;
  product_type: 'frame' | 'sunglasses' | 'contact_lens' | 'eye_hygiene' | 'accessory';
  price: number;
  compare_at_price?: number;
  cost_price?: number;
  stock_quantity: number;
  stock_status: 'in_stock' | 'out_of_stock' | 'backorder';
  images?: string[];
  frame_shape?: string;
  frame_material?: string;
  frame_color?: string;
  gender?: 'men' | 'women' | 'unisex' | 'kids';
  lens_type?: string;
  lens_index_options?: string[];
  treatment_options?: string[];
  rating: number;
  review_count: number;
  view_count: number;
  is_featured: boolean;
  is_active: boolean;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  category?: {
    id: number;
    name: string;
    slug: string;
  };
  sub_category?: {
    id: number;
    name: string;
    slug: string;
  };
  created_at: string;
  updated_at: string;
}

export interface CreateProductData {
  name: string;
  category_id?: number;
  sub_category_id?: number;
  sku: string;
  description?: string;
  short_description?: string;
  product_type: 'frame' | 'sunglasses' | 'contact_lens' | 'eye_hygiene' | 'accessory';
  price: number;
  compare_at_price?: number;
  cost_price?: number;
  stock_quantity: number;
  stock_status: 'in_stock' | 'out_of_stock' | 'backorder';
  images?: string[];
  frame_shape?: string;
  frame_material?: string;
  frame_color?: string;
  gender?: 'men' | 'women' | 'unisex' | 'kids';
  lens_type?: string;
  lens_index_options?: string[];
  treatment_options?: string[];
  is_featured?: boolean;
  is_active?: boolean;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  children?: Category[];
}

export const productService = {
  async getAll(params?: {
    search?: string;
    is_active?: boolean;
    product_type?: string;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
    per_page?: number;
    page?: number;
  }) {
    const res = await apiClient.get('/seller/products', { params });
    return res.data.data;
  },

  async getOne(id: number): Promise<Product> {
    const res = await apiClient.get(`/seller/products/${id}`);
    return res.data.data;
  },

  async create(data: CreateProductData): Promise<Product> {
    const res = await apiClient.post('/seller/products', data);
    return res.data.data;
  },

  async update(id: number, data: Partial<CreateProductData>): Promise<Product> {
    const res = await apiClient.put(`/seller/products/${id}`, data);
    return res.data.data;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/seller/products/${id}`);
  },

  async toggleStatus(id: number): Promise<Product> {
    const res = await apiClient.post(`/seller/products/${id}/toggle-status`);
    return res.data.data;
  },

  async getCategories(): Promise<Category[]> {
    const res = await apiClient.get('/seller/products/categories');
    return res.data.data;
  },
};


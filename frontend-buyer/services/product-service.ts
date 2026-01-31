import apiClient from '@/lib/api-client';

export interface Product {
  id: number;
  name: string;
  slug: string;
  sku: string;
  description: string;
  short_description: string;
  product_type: 'frame' | 'sunglasses' | 'contact_lens' | 'eye_hygiene' | 'accessory';
  price: number;
  compare_at_price?: number;
  stock_quantity: number;
  stock_status: 'in_stock' | 'out_of_stock' | 'backorder';
  images: string[];
  frame_shape?: string;
  frame_material?: string;
  frame_color?: string;
  gender: 'men' | 'women' | 'unisex' | 'kids';
  rating: number;
  review_count: number;
  view_count: number;
  store: {
    id: number;
    name: string;
    slug: string;
  };
  category?: {
    id: number;
    name: string;
    slug: string;
  };
}

export interface ProductListParams {
  store_id?: number;
  category_id?: number;
  sub_category_id?: number;
  product_type?: string;
  min_price?: number;
  max_price?: number;
  frame_shape?: string;
  frame_material?: string;
  gender?: string;
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  per_page?: number;
  page?: number;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  parent_id?: number;
}

export const productService = {
  async getAll(params?: ProductListParams) {
    const res = await apiClient.get('/buyer/product/get-all', { params });
    return res.data.data;
  },

  async getDetails(id: number): Promise<Product> {
    const res = await apiClient.get(`/buyer/product/product-details/${id}`);
    return res.data.data;
  },

  async getByCategory(categorySlug: string, params?: ProductListParams) {
    const res = await apiClient.get(`/buyer/product/categories/${categorySlug}/products`, { params });
    return res.data.data;
  },

  async search(query: string) {
    const res = await apiClient.get('/search', { params: { q: query } });
    return res.data.data;
  },

  async getCategories(parentOnly = false) {
    const res = await apiClient.get('/categories', { params: { parent_only: parentOnly } });
    return res.data.data;
  },

  async getByStore(storeId: number, params?: ProductListParams) {
    const res = await apiClient.get('/buyer/product/get-all', { 
      params: { ...params, store_id: storeId } 
    });
    return res.data.data;
  },
};


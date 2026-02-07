import apiClient from '@/lib/api-client';

export interface ProductVariant {
  id: number;
  product_id: number;
  color_name: string;
  color_code?: string;
  images: string[];
  price?: number;
  stock_quantity: number;
  stock_status: 'in_stock' | 'out_of_stock' | 'backorder';
  is_default: boolean;
  sort_order: number;
}

export interface FrameSize {
  id: number;
  product_id: number;
  lens_width: number;
  bridge_width: number;
  temple_length: number;
  frame_width?: number;
  frame_height?: number;
  size_label?: string;
  stock_quantity: number;
  stock_status: 'in_stock' | 'out_of_stock' | 'backorder';
}

export interface LensType {
  id: number;
  name: string;
  slug: string;
  description?: string;
  index: number;
  thickness_factor?: number;
  price_adjustment: number;
  is_active: boolean;
}

export interface LensCoating {
  id: number;
  name: string;
  slug: string;
  type: string;
  description?: string;
  price_adjustment: number;
  is_active: boolean;
}

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
  variants?: ProductVariant[];
  frame_sizes?: FrameSize[];
  lens_types?: LensType[];
  lens_coatings?: LensCoating[];
  // Contact lens fields
  base_curve_options?: string[];
  diameter_options?: string[];
  powers_range?: string;
  replacement_frequency?: string;
  contact_lens_brand?: string;
  contact_lens_color?: string;
  contact_lens_material?: string;
  contact_lens_type?: string;
  has_uv_filter?: boolean;
  can_sleep_with?: boolean;
  water_content?: string;
  is_medical_device?: boolean;
  // Eye hygiene fields
  size_volume?: string;
  pack_type?: string;
  expiry_date?: string;
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
  children?: Category[];
  subcategories?: Category[];
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


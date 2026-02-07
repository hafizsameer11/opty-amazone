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
  sale_start_date?: string;
  sale_end_date?: string;
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
  total_sold?: number;
  total_revenue?: number;
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
  sale_start_date?: string;
  sale_end_date?: string;
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
  // Contact Lens Specific Fields
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
  // Eye Hygiene Specific Fields
  size_volume?: string;
  pack_type?: string;
  expiry_date?: string;
  // Additional Fields
  model_3d_url?: string;
  try_on_image?: string;
  color_images?: string[];
  mm_calibers?: any;
}

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

export interface CreateVariantData {
  color_name: string;
  color_code?: string;
  images?: string[];
  price?: number;
  stock_quantity: number;
  stock_status: 'in_stock' | 'out_of_stock' | 'backorder';
  is_default?: boolean;
  sort_order?: number;
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
    category_id?: number;
    is_featured?: boolean;
    on_sale?: boolean;
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

  // Variant management
  async getVariants(productId: number): Promise<ProductVariant[]> {
    const res = await apiClient.get(`/seller/products/${productId}/variants`);
    return res.data.data;
  },

  async createVariant(productId: number, data: CreateVariantData): Promise<ProductVariant> {
    const res = await apiClient.post(`/seller/products/${productId}/variants`, data);
    return res.data.data;
  },

  async updateVariant(variantId: number, data: Partial<CreateVariantData>): Promise<ProductVariant> {
    const res = await apiClient.put(`/seller/product-variant/${variantId}`, data);
    return res.data.data;
  },

  async deleteVariant(variantId: number): Promise<void> {
    await apiClient.delete(`/seller/product-variant/${variantId}`);
  },

  async setDefaultVariant(variantId: number): Promise<ProductVariant> {
    const res = await apiClient.post(`/seller/product-variant/${variantId}/set-default`);
    return res.data.data;
  },

  // Frame size management
  async getFrameSizes(productId: number): Promise<FrameSize[]> {
    const res = await apiClient.get(`/seller/products/${productId}/frame-sizes`);
    return res.data.data;
  },

  async createFrameSize(productId: number, data: CreateFrameSizeData): Promise<FrameSize> {
    const res = await apiClient.post(`/seller/products/${productId}/frame-sizes`, data);
    return res.data.data;
  },

  async updateFrameSize(frameSizeId: number, data: Partial<CreateFrameSizeData>): Promise<FrameSize> {
    const res = await apiClient.put(`/seller/frame-sizes/${frameSizeId}`, data);
    return res.data.data;
  },

  async deleteFrameSize(frameSizeId: number): Promise<void> {
    await apiClient.delete(`/seller/frame-sizes/${frameSizeId}`);
  },
};

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
  created_at: string;
  updated_at: string;
}

export interface CreateFrameSizeData {
  lens_width: number;
  bridge_width: number;
  temple_length: number;
  frame_width?: number;
  frame_height?: number;
  size_label?: string;
  stock_quantity: number;
  stock_status: 'in_stock' | 'out_of_stock' | 'backorder';
}


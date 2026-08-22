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
  is_muted?: boolean;
  shipping_type?: 'free' | 'fixed';
  shipping_fee?: number;
  is_boosted?: boolean | number;
  boost_payment_status?: string | null;
  boost_budget?: number | string | null;
  boost_location?: string | null;
  boost_start_at?: string | null;
  boost_end_at?: string | null;
  total_sold?: number;
  total_revenue?: number;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
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
  size_volume?: string;
  pack_type?: string;
  expiry_date?: string;
  model_3d_url?: string;
  try_on_image?: string;
  color_images?: string[];
  mm_calibers?: any;
  lens_colors?: ProductLensColorRow[];
  size_volume_variants?: ProductSizeVolumeVariant[];
  eye_hygiene_variants?: EyeHygieneVariantRow[];
  contact_lens_unit_config?: ContactLensUnitConfig;
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
  sale_campaign?: {
    display_label?: string;
    end_date?: string;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface ProductLensColorRow {
  id: number;
  name: string;
  color_code: string;
  description?: string;
}

export interface ProductSizeVolumeVariant {
  id?: number;
  size_volume: string;
  pack_type?: string | null;
  price: number;
  compare_at_price?: number | null;
  cost_price?: number | null;
  stock_quantity: number;
  stock_status: 'in_stock' | 'out_of_stock' | 'backorder';
  sku?: string | null;
  expiry_date?: string | null;
  image_url?: string | null;
  is_active?: boolean;
  sort_order?: number;
}

export interface EyeHygieneVariantRow {
  id?: number;
  name: string;
  description?: string | null;
  price: number;
  image_url?: string | null;
  is_active?: boolean;
  sort_order?: number;
}

export interface ContactLensPackRow {
  quantity: number;
  price?: number | null;
  images?: string[];
  available_variant_ids?: number[];
}

export interface ContactLensColourStockRow {
  pack_quantity: number;
  variant_id: number;
  stock_quantity: number;
}

export interface ContactLensUnitConfig {
  packs?: ContactLensPackRow[];
  colour_stock?: ContactLensColourStockRow[];
  qty_options?: number[];
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
  shipping_type?: 'free' | 'fixed';
  shipping_fee?: number;
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
  lens_colors?: ProductLensColorRow[];
  size_volume_variants?: ProductSizeVolumeVariant[];
  eye_hygiene_variants?: EyeHygieneVariantRow[];
  contact_lens_unit_config?: ContactLensUnitConfig;
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
  sizes?: Array<{
    lens_width: number;
    bridge_width: number;
    temple_length: number;
    size_label?: string;
    stock_quantity: number;
    stock_status?: 'in_stock' | 'out_of_stock' | 'backorder';
  }>;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  parent_id?: number | null;
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

  async toggleMute(id: number): Promise<Product> {
    const res = await apiClient.post(`/seller/products/${id}/toggle-mute`);
    return res.data.data;
  },

  async getCategories(): Promise<Category[]> {
    const res = await apiClient.get('/seller/products/categories');
    return res.data.data;
  },

  async suggestSku(): Promise<string> {
    const res = await apiClient.get('/seller/products/suggest-sku');
    return res.data.data.sku as string;
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
  async getFrameSizes(productId: number, variantId?: number | null): Promise<FrameSize[]> {
    const params =
      variantId === undefined
        ? undefined
        : { variant_id: variantId === null ? 'null' : variantId };
    const res = await apiClient.get(`/seller/products/${productId}/frame-sizes`, { params });
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

  async boostWithPlan(
    id: number,
    data: {
      location: string;
      budget: number;
      start_at?: string;
      end_at?: string;
      pay_method: string;
    }
  ): Promise<{ product: Product; message?: string }> {
    const res = await apiClient.post(`/seller/products/${id}/boost`, data);
    return res.data.data;
  },

  async completeBoostPayment(id: number): Promise<{ product: Product; message?: string }> {
    const res = await apiClient.post(`/seller/products/${id}/boost/complete-payment`);
    return res.data.data;
  },

  async toggleBoost(id: number): Promise<Product> {
    const res = await apiClient.post(`/seller/products/${id}/toggle-boost`);
    return res.data.data;
  },
};

/** Map API product to seller edit form state. */
export function productToEditFormData(data: Product): CreateProductData {
  const raw = data as Product & Record<string, unknown>;
  const expiry = raw.expiry_date;
  const expiryStr =
    typeof expiry === 'string'
      ? expiry.length >= 10
        ? expiry.slice(0, 10)
        : expiry
      : '';

  return {
    name: data.name,
    category_id: data.category_id || undefined,
    sub_category_id: data.sub_category_id || undefined,
    sku: data.sku,
    description: data.description || '',
    short_description: data.short_description || '',
    product_type: data.product_type,
    price: Number(data.price) || 0,
    compare_at_price: data.compare_at_price || undefined,
    sale_start_date: data.sale_start_date || undefined,
    sale_end_date: data.sale_end_date || undefined,
    cost_price: data.cost_price || undefined,
    stock_quantity: data.stock_quantity,
    stock_status: data.stock_status,
    images: data.images || [],
    frame_shape: data.frame_shape || '',
    frame_material: data.frame_material || '',
    frame_color: data.frame_color || '',
    gender: data.gender || 'unisex',
    lens_type: data.lens_type || '',
    lens_index_options: data.lens_index_options || [],
    treatment_options: data.treatment_options || [],
    is_featured: data.is_featured,
    is_active: data.is_active,
    shipping_type: data.shipping_type || 'free',
    shipping_fee: data.shipping_fee ?? 0,
    meta_title: data.meta_title,
    meta_description: data.meta_description,
    meta_keywords: data.meta_keywords,
    base_curve_options: data.base_curve_options || [],
    diameter_options: data.diameter_options || [],
    powers_range: data.powers_range || '',
    replacement_frequency: data.replacement_frequency || '',
    contact_lens_brand: data.contact_lens_brand || '',
    contact_lens_color: data.contact_lens_color || '',
    contact_lens_material: data.contact_lens_material || '',
    contact_lens_type: data.contact_lens_type || '',
    has_uv_filter: data.has_uv_filter || false,
    can_sleep_with: data.can_sleep_with || false,
    water_content: data.water_content || '',
    is_medical_device: data.is_medical_device !== false,
    size_volume: data.size_volume || '',
    pack_type: data.pack_type || '',
    expiry_date: expiryStr,
    model_3d_url: data.model_3d_url || '',
    try_on_image: data.try_on_image || '',
    color_images: data.color_images || [],
    mm_calibers: data.mm_calibers || null,
    lens_colors: data.lens_colors || [],
    size_volume_variants: (raw.size_volume_variants as ProductSizeVolumeVariant[]) || [],
    eye_hygiene_variants: (raw.eye_hygiene_variants as EyeHygieneVariantRow[]) || [],
    contact_lens_unit_config: data.contact_lens_unit_config,
  };
}

export interface FrameSize {
  id: number;
  product_id: number;
  product_variant_id?: number | null;
  lens_width: number;
  bridge_width: number;
  temple_length: number;
  frame_width?: number;
  frame_height?: number;
  size_label?: string;
  price?: number | null;
  image?: string | null;
  stock_quantity: number;
  stock_status: 'in_stock' | 'out_of_stock' | 'backorder';
  created_at: string;
  updated_at: string;
}

export interface CreateFrameSizeData {
  product_variant_id?: number | null;
  lens_width: number;
  bridge_width: number;
  temple_length: number;
  frame_width?: number;
  frame_height?: number;
  size_label?: string;
  price?: number;
  image?: string;
  stock_quantity: number;
  stock_status: 'in_stock' | 'out_of_stock' | 'backorder';
}


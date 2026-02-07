import apiClient from '@/lib/api-client';

export interface CartItem {
  id: number;
  product_id: number;
  variant_id?: number;
  store_id: number;
  quantity: number;
  price: number;
  product_variant?: any;
  lens_configuration?: any;
  prescription_data?: any;
  product: {
    id: number;
    name: string;
    images: string[];
    price: number;
  };
  variant?: {
    id: number;
    color_name: string;
    color_code?: string;
    images: string[];
  };
  store: {
    id: number;
    name: string;
  };
}

export interface Cart {
  id: number;
  user_id: number;
  items: CartItem[];
  breakdown: Array<{
    store_id: number;
    store_name: string;
    items: CartItem[];
    subtotal: number;
  }>;
  total: number;
}

export interface AddToCartData {
  product_id: number;
  variant_id?: number;
  quantity: number;
  product_variant?: any;
  lens_configuration?: any;
  prescription_data?: any;
  // Frame size and prescription
  frame_size_id?: number;
  prescription_id?: number;
  // Lens customization
  lens_index?: number;
  lens_type?: string;
  lens_thickness_material_id?: number;
  lens_thickness_option_id?: number;
  treatment_ids?: number[];
  lens_coatings?: string;
  progressive_variant_id?: number;
  // Contact lens fields
  contact_lens_left_base_curve?: number;
  contact_lens_left_diameter?: number;
  contact_lens_left_power?: number;
  contact_lens_left_qty?: number;
  contact_lens_right_base_curve?: number;
  contact_lens_right_diameter?: number;
  contact_lens_right_power?: number;
  contact_lens_right_qty?: number;
}

export const cartService = {
  async getCart(): Promise<Cart> {
    const res = await apiClient.get('/buyer/cart');
    return res.data.data;
  },

  async addItem(data: AddToCartData): Promise<CartItem> {
    const res = await apiClient.post('/buyer/cart/items', data);
    return res.data.data;
  },

  async updateItem(id: number, quantity: number): Promise<CartItem> {
    const res = await apiClient.put(`/buyer/cart/items/${id}`, { quantity });
    return res.data.data;
  },

  async removeItem(id: number): Promise<void> {
    await apiClient.delete(`/buyer/cart/items/${id}`);
  },

  async clear(): Promise<void> {
    await apiClient.post('/buyer/cart/clear');
  },
};


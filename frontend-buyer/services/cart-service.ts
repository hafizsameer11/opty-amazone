import apiClient from '@/lib/api-client';

export interface CartItem {
  id: number;
  product_id: number;
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
  quantity: number;
  product_variant?: any;
  lens_configuration?: any;
  prescription_data?: any;
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


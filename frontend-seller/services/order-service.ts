import apiClient from '@/lib/api-client';

export interface StoreOrder {
  id: number;
  order_id: number;
  store_id: number;
  status: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  delivery_code?: string;
  estimated_delivery_date?: string;
  delivery_method?: string;
  delivery_notes?: string;
  rejection_reason?: string;
  order: {
    id: number;
    order_no: string;
    user: {
      id: number;
      name: string;
      email: string;
    };
  };
  items: Array<{
    id: number;
    product_name: string;
    quantity: number;
    price: number;
    line_total: number;
  }>;
}

export interface AcceptOrderData {
  delivery_fee: number;
  estimated_delivery_date?: string;
  delivery_method?: string;
  delivery_notes?: string;
}

export const orderService = {
  async getOrders(params?: { status?: string; per_page?: number; page?: number }) {
    const res = await apiClient.get('/seller/orders', { params });
    // Laravel pagination structure: { success: true, message: "...", data: { data: [...], current_page: 1, ... } }
    if (res.data.success && res.data.data) {
      // Check if it's a paginated response (has data.data array)
      if (res.data.data.data && Array.isArray(res.data.data.data)) {
        return {
          data: res.data.data.data,
          meta: {
            current_page: res.data.data.current_page,
            per_page: res.data.data.per_page,
            total: res.data.data.total,
            last_page: res.data.data.last_page,
          }
        };
      }
      // If it's already an array (non-paginated)
      if (Array.isArray(res.data.data)) {
        return { data: res.data.data, meta: {} };
      }
    }
    return { data: [], meta: {} };
  },

  async getOrder(id: number): Promise<StoreOrder> {
    const res = await apiClient.get(`/seller/orders/${id}`);
    return res.data.data;
  },

  async getPendingOrders(params?: { per_page?: number; page?: number }) {
    const res = await apiClient.get('/seller/store-orders/pending', { params });
    return res.data.data;
  },

  async acceptOrder(id: number, data: AcceptOrderData): Promise<StoreOrder> {
    const res = await apiClient.post(`/seller/store-orders/${id}/accept`, data);
    return res.data.data;
  },

  async rejectOrder(id: number, reason: string): Promise<StoreOrder> {
    const res = await apiClient.post(`/seller/store-orders/${id}/reject`, { reason });
    return res.data.data;
  },

  async markOutForDelivery(id: number): Promise<StoreOrder> {
    const res = await apiClient.post(`/seller/store-orders/${id}/out-for-delivery`);
    return res.data.data;
  },

  async markDelivered(id: number, deliveryCode: string): Promise<StoreOrder> {
    const res = await apiClient.post(`/seller/store-orders/${id}/delivered`, {
      delivery_code: deliveryCode,
    });
    return res.data.data;
  },
};


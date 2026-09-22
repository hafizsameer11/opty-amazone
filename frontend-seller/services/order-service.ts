import apiClient from '@/lib/api-client';
import type { OrderLineSelections } from '@/types/order-line';

export type OrderItem = OrderLineSelections & {
  id: number;
  product_id: number;
  quantity: number;
  price: number;
  line_total: number;
  product_name: string;
  product_sku: string;
  product_images?: string[];
  product?: {
    id: number;
    name: string;
    sku?: string;
    images?: string[];
  } | null;
};

export interface StoreOrder {
  id: number;
  order_id: number;
  store_id: number;
  status: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  discount_total?: number;
  coupon_code?: string | null;
  coupon_discount?: number;
  coupon_shipping_discount?: number;
  coupon_snapshot?: Record<string, unknown> | null;
  payment_status?: string;
  financial_version?: number;
  delivery_address_snapshot?: Record<string, string | number | null>;
  delivery_code_expires_at?: string;
  delivery_verified_at?: string;
  dispute_reason?: string;
  escrow?: { id: number; amount: number; status: string };
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
  items: OrderItem[];
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
    const res = await apiClient.post(`/seller/store-orders/${id}/accept`, { ...data, delivery_notes: data.delivery_notes || "", idempotency_key: `shipping-quote:${id}` });
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

  async requestDeliveryCode(id: number): Promise<StoreOrder> {
    const res = await apiClient.post(`/seller/store-orders/${id}/delivery-code-request`);
    return res.data.data;
  },

  async markDelivered(id: number, deliveryCode: string): Promise<StoreOrder> {
    const res = await apiClient.post(`/seller/store-orders/${id}/delivered`, {
      delivery_code: deliveryCode,
    });
    return res.data.data;
  },
};


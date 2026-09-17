import apiClient from '@/lib/api-client';
import type { OrderLineSelections } from '@/types/order-line';

/** Single line on a store order / parent order — includes persisted customization. */
export type OrderItem = OrderLineSelections & {
  id: number;
  product_id: number;
  quantity: number;
  price: number;
  line_total: number;
  product_name: string;
  product_sku: string;
  product_images: string[];
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
  status: 'pending' | 'awaiting_payment' | 'rejected' | 'paid' | 'processing' | 'out_for_delivery' | 'delivered' | 'cancelled' | 'refunded' | 'disputed';
  subtotal: number;
  delivery_fee: number;
  total: number;
  discount_total?: number;
  payment_status?: string;
  financial_version?: number;
  delivery_address_snapshot?: Record<string, string | number | null>;
  delivery_code_expires_at?: string;
  delivery_verified_at?: string;
  dispute_reason?: string;
  escrow?: { id: number; amount: number; status: string };
  delivery_code?: string | null;
  estimated_delivery_date?: string;
  delivery_method?: string;
  delivery_notes?: string;
  rejection_reason?: string;
  accepted_at?: string;
  paid_at?: string;
  out_for_delivery_at?: string;
  delivered_at?: string;
  store: {
    id: number;
    name: string;
    slug: string;
  };
  items: OrderItem[];

}

export interface Order {
  id: number;
  order_no: string;
  payment_method?: string;
  payment_status: 'pending' | 'partially_paid' | 'paid' | 'failed' | 'refunded' | 'cancelled' | 'disputed';
  items_total: number;
  shipping_total: number;
  platform_fee: number;
  discount_total: number;
  grand_total: number;
  created_at: string;
  store_orders: StoreOrder[];
}

export interface PlaceOrderData {
  delivery_address_id: number;
  payment_method?: 'card' | 'wallet';
  coupon_code?: string;
  points_to_redeem?: number;
}

export const orderService = {
  async placeOrder(data: PlaceOrderData) {
    const res = await apiClient.post('/buyer/checkout/place', data);
    return res.data.data;
  },

  async getOrders(params?: { per_page?: number; page?: number }) {
    const res = await apiClient.get('/buyer/orders', { params });
    return res.data.data;
  },

  async getOrder(id: number): Promise<Order> {
    const res = await apiClient.get(`/buyer/orders/${id}`);
    return res.data.data;
  },

  async getStoreOrders(params?: { per_page?: number; page?: number }) {
    const res = await apiClient.get('/buyer/store-orders', { params });
    return res.data.data;
  },

  async getStoreOrder(id: number): Promise<StoreOrder> {
    const res = await apiClient.get(`/buyer/store-orders/${id}`);
    return res.data.data;
  },

  async payStoreOrder(storeOrderId: number, paymentMethod: 'card' | 'wallet', expectedTotal: number) {
    const res = await apiClient.post(`/buyer/store-orders/${storeOrderId}/pay`, {
      payment_method: paymentMethod, expected_total: expectedTotal, idempotency_key: `order-payment:${storeOrderId}`,
    });
    return res.data.data;
  },

  async reissueCode(id: number) { const res = await apiClient.post(`/buyer/store-orders/${id}/delivery-code`); return res.data.data; },
  async dispute(id: number, reason: string) { const res = await apiClient.post(`/buyer/store-orders/${id}/dispute`, { reason }); return res.data.data; },
  async cancelStoreOrder(storeOrderId: number) {
    const res = await apiClient.post(`/buyer/store-orders/${storeOrderId}/cancel`);
    return res.data.data;
  },

  async getPaymentInfo(orderId: number) {
    const res = await apiClient.get(`/buyer/orders/${orderId}/payment-info`);
    return res.data.data;
  },
};


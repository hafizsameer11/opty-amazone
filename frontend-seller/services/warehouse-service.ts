import apiClient, { getApiOrigin } from '@/lib/api-client';

export type WarehouseType = 'eyeglasses' | 'contact_lenses' | 'contact_lens_solutions';
export type WarehouseStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
export interface WarehouseCategory { id: number; name: string; type: WarehouseType; }
export interface WarehouseProduct { id: number; name: string; sku: string; description?: string | null; image_path?: string | null; image_url?: string | null; price: string; shipping_fee: string; stock_quantity: number; availability: string; color?: string | null; temple_size?: string | null; lens_size?: string | null; bridge_size?: string | null; details?: Record<string, string | boolean | null>; category: WarehouseCategory; }
export interface WarehouseCartItem { id: number; quantity: number; product: WarehouseProduct; }
export interface WarehouseCartQuote { cart: { id: number }; items: WarehouseCartItem[]; subtotal: string; shipping_fee: string; total: string; currency: 'EUR'; }
export interface WarehouseOrderItem { id: number; product_name: string; sku: string; unit_price: string; quantity: number; line_total: string; image_path?: string | null; }
export interface WarehouseOrder { id: number; order_number: string; status: WarehouseStatus; payment_status: 'paid' | 'refunded'; subtotal: string; shipping_fee: string; total: string; tracking_number?: string | null; shipping_carrier?: string | null; shipping_notes?: string | null; created_at: string; items: WarehouseOrderItem[]; store?: { name: string }; }
export interface Page<T> { data: T[]; current_page: number; last_page: number; total: number; }

export const WAREHOUSE_UPDATED_EVENT = 'seller:warehouse-updated';

/** Supports both absolute API URLs and older relative `/storage/...` values. */
export function warehouseImageUrl(path?: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const origin = getApiOrigin().replace(/\/$/, '');
  return origin + (path.startsWith('/') ? path : '/' + path);
}

const normaliseProduct = (product: WarehouseProduct): WarehouseProduct => ({
  ...product,
  image_url: warehouseImageUrl(product.image_url || product.image_path),
});

const normaliseCart = (quote: WarehouseCartQuote): WarehouseCartQuote => ({
  ...quote,
  items: quote.items.map((item) => ({ ...item, product: normaliseProduct(item.product) })),
});

/** Refresh the current header immediately and other open seller tabs via storage. */
function notifyWarehouseUpdated(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(WAREHOUSE_UPDATED_EVENT));
  try { localStorage.setItem(WAREHOUSE_UPDATED_EVENT, String(Date.now())); } catch { /* Storage can be unavailable. */ }
}

export const warehouseService = {
  async products(params: Record<string, string | number | undefined> = {}) {
    const data = (await apiClient.get('/seller/warehouse/products', { params })).data.data as { products: Page<WarehouseProduct>; categories: WarehouseCategory[]; cart_count: number };
    return { ...data, products: { ...data.products, data: data.products.data.map(normaliseProduct) } };
  },
  async product(id: number) { return normaliseProduct((await apiClient.get('/seller/warehouse/products/' + id)).data.data as WarehouseProduct); },
  async cart() { return normaliseCart((await apiClient.get('/seller/warehouse/cart')).data.data as WarehouseCartQuote); },
  async addToCart(warehouse_product_id: number, quantity: number) { const data = normaliseCart((await apiClient.post('/seller/warehouse/cart/items', { warehouse_product_id, quantity })).data.data as WarehouseCartQuote); notifyWarehouseUpdated(); return data; },
  async updateCartItem(id: number, quantity: number) { const data = normaliseCart((await apiClient.put('/seller/warehouse/cart/items/' + id, { quantity })).data.data as WarehouseCartQuote); notifyWarehouseUpdated(); return data; },
  async removeCartItem(id: number) { const data = normaliseCart((await apiClient.delete('/seller/warehouse/cart/items/' + id)).data.data as WarehouseCartQuote); notifyWarehouseUpdated(); return data; },
  async checkout(idempotency_key: string, shipping_address?: Record<string, string>) { const data = (await apiClient.post('/seller/warehouse/checkout', { idempotency_key, shipping_address })).data.data as WarehouseOrder; notifyWarehouseUpdated(); return data; },
  async orders(params: Record<string, string | number | undefined> = {}) { return (await apiClient.get('/seller/warehouse/orders', { params })).data.data as Page<WarehouseOrder>; },
  async order(id: number) { return (await apiClient.get('/seller/warehouse/orders/' + id)).data.data as WarehouseOrder; },
};

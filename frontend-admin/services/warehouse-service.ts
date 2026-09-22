import apiClient, { getApiOrigin } from '@/lib/api-client';

export type WarehouseType = 'eyeglasses' | 'contact_lenses' | 'contact_lens_solutions';
export type WarehouseStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface WarehouseCategory { id: number; name: string; slug: string; type: WarehouseType; description?: string | null; is_active: boolean; sort_order: number; products_count?: number; }
export interface WarehouseProduct {
  id: number; warehouse_category_id: number; name: string; sku: string; description?: string | null; image_path?: string | null; image_url?: string | null;
  price: string; shipping_fee: string; stock_quantity: number; low_stock_threshold: number; availability: 'in_stock' | 'low_stock' | 'out_of_stock';
  color?: string | null; temple_size?: string | null; lens_size?: string | null; bridge_size?: string | null; details?: Record<string, string | boolean | null>; is_active: boolean; is_draft: boolean; category: WarehouseCategory;
}
export interface WarehouseOrderItem { id: number; product_name: string; sku: string; image_path?: string | null; unit_price: string; quantity: number; line_total: string; product_snapshot?: Record<string, unknown>; }
export interface WarehouseOrder { id: number; order_number: string; status: WarehouseStatus; payment_status: 'paid' | 'refunded'; subtotal: string; shipping_fee: string; total: string; tracking_number?: string | null; shipping_carrier?: string | null; shipping_notes?: string | null; created_at: string; seller?: { id: number; name: string; email?: string }; store?: { id: number; name: string }; items: WarehouseOrderItem[]; }
export interface Page<T> { data: T[]; current_page: number; last_page: number; total: number; }
export interface WarehouseDashboard {
  stats: { total_products: number; total_stock: number; warehouse_orders: number; revenue: number; draft_products: number; low_stock_products: number; out_of_stock_products: number };
  low_stock: WarehouseProduct[];
  best_selling: Array<{ warehouse_product_id: number | null; product_name: string; sku: string; image_path?: string | null; units: number; orders: number }>;
  stock_by_category: Record<string, number>;
  orders_trend: Array<{ month: string; label: string; orders: number; revenue: number }>;
}

const body = (data: Record<string, unknown>, image?: File | null) => {
  const form = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    // FormData serialises booleans as "true" / "false", but Laravel's
    // boolean rule intentionally accepts the HTML form values 1 and 0.
    // Send those canonical values for the Warehouse availability checkbox.
    form.append(
      key,
      key === 'details'
        ? JSON.stringify(value)
        : typeof value === 'boolean'
          ? (value ? '1' : '0')
          : String(value),
    );
  });
  if (image) form.append('image', image);
  return form;
};

/** Accept both the API's current absolute image URL and legacy relative paths. */
export function warehouseImageUrl(path?: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const origin = getApiOrigin().replace(/\/$/, '');
  return origin + (path.startsWith('/') ? path : `/${path}`);
}

const normaliseProduct = (product: WarehouseProduct): WarehouseProduct => ({
  ...product,
  image_url: warehouseImageUrl(product.image_url || product.image_path),
});

export const warehouseService = {
  async dashboard() {
    const data = (await apiClient.get('/admin/warehouse/dashboard')).data.data as WarehouseDashboard;
    return { ...data, low_stock: data.low_stock.map(normaliseProduct) };
  },
  async products(params: Record<string, string | number | boolean | undefined> = {}) {
    const data = (await apiClient.get('/admin/warehouse/products', { params })).data.data as Page<WarehouseProduct>;
    return { ...data, data: data.data.map(normaliseProduct) };
  },
  async product(id: number) { return normaliseProduct((await apiClient.get(`/admin/warehouse/products/${id}`)).data.data as WarehouseProduct); },
  async createProduct(data: Record<string, unknown>, image?: File | null) { return normaliseProduct((await apiClient.post('/admin/warehouse/products', body(data, image))).data.data as WarehouseProduct); },
  async updateProduct(id: number, data: Record<string, unknown>, image?: File | null) { return normaliseProduct((await apiClient.post(`/admin/warehouse/products/${id}`, body(data, image))).data.data as WarehouseProduct); },
  async deleteProduct(id: number) { await apiClient.delete(`/admin/warehouse/products/${id}`); },
  async categories() { return (await apiClient.get('/admin/warehouse/categories')).data.data as WarehouseCategory[]; },
  async createCategory(data: Partial<WarehouseCategory>) { return (await apiClient.post('/admin/warehouse/categories', data)).data.data as WarehouseCategory; },
  async updateCategory(id: number, data: Partial<WarehouseCategory>) { return (await apiClient.put(`/admin/warehouse/categories/${id}`, data)).data.data as WarehouseCategory; },
  async deleteCategory(id: number) { await apiClient.delete(`/admin/warehouse/categories/${id}`); },
  async orders(params: Record<string, string | number | undefined> = {}) { return (await apiClient.get('/admin/warehouse/orders', { params })).data.data as Page<WarehouseOrder>; },
  async order(id: number) { return (await apiClient.get(`/admin/warehouse/orders/${id}`)).data.data as WarehouseOrder; },
  async updateOrder(id: number, data: Partial<Pick<WarehouseOrder, 'status' | 'tracking_number' | 'shipping_carrier' | 'shipping_notes'>>) { return (await apiClient.put(`/admin/warehouse/orders/${id}`, data)).data.data as WarehouseOrder; },
};

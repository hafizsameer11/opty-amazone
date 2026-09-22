import apiClient from '@/lib/api-client';

export type CouponType = 'percentage' | 'fixed_amount' | 'free_shipping';
export type CouponScope = 'store' | 'products' | 'categories' | 'variants';

export interface CouponTarget { id: number; name?: string; sku?: string; color_name?: string; product_id?: number; product?: { id: number; name: string } }
export interface Coupon {
  id: number; store_id: number; code: string; description?: string; discount_type: CouponType; discount_value: number;
  min_order_amount?: number | null; usage_limit?: number | null; usage_per_user?: number | null;
  starts_at?: string | null; ends_at?: string | null; schedule_timezone?: string | null; is_active: boolean; status: 'active' | 'inactive' | 'paused' | 'scheduled' | 'archived';
  resolved_status?: string; scope: CouponScope; is_public: boolean; followers_only: boolean; first_order_only: boolean;
  products?: CouponTarget[]; categories?: CouponTarget[]; variants?: CouponTarget[]; usages_count?: number; redeemed_usages_count?: number;
  usage_count?: number; reserved_count?: number; created_at: string; updated_at: string;
  store?: { id: number; name: string };
}

export interface CreateCouponData {
  code: string; description?: string; discount_type: CouponType; discount_value: number;
  min_order_amount?: number; usage_limit?: number; usage_per_user?: number; starts_at?: string; ends_at?: string;
  schedule_timezone?: string; launch_mode?: 'run_now' | 'schedule'; is_active?: boolean; status?: 'active' | 'inactive' | 'paused'; scope: CouponScope; is_public?: boolean;
  followers_only?: boolean; first_order_only?: boolean; product_ids?: number[]; category_ids?: number[]; variant_ids?: number[];
}

export interface CouponStatistics {
  total_coupons: number; active_coupons: number; redeemed_coupons: number; reserved_coupons: number;
  total_usages: number; total_discount_given: number; remaining_usage: number; revenue_generated: number;
  order_count: number; conversion_count: number;
}

export const couponService = {
  async getAll(params?: Record<string, unknown>) { const res = await apiClient.get('/seller/coupons', { params }); return res.data.data; },
  async getOne(id: number): Promise<Coupon> { const res = await apiClient.get(`/seller/coupons/${id}`); return res.data.data; },
  async create(data: CreateCouponData): Promise<Coupon> { const res = await apiClient.post('/seller/coupons', data); return res.data.data; },
  async update(id: number, data: Partial<CreateCouponData>): Promise<Coupon> { const res = await apiClient.put(`/seller/coupons/${id}`, data); return res.data.data; },
  async delete(id: number): Promise<void> { await apiClient.delete(`/seller/coupons/${id}`); },
  async toggleStatus(id: number): Promise<Coupon> { const res = await apiClient.post(`/seller/coupons/${id}/toggle-status`); return res.data.data; },
  async pause(id: number): Promise<Coupon> { const res = await apiClient.post(`/seller/coupons/${id}/pause`); return res.data.data; },
  async resume(id: number): Promise<Coupon> { const res = await apiClient.post(`/seller/coupons/${id}/resume`); return res.data.data; },
  async analytics() { const res = await apiClient.get('/seller/coupons/analytics'); return res.data.data; },
  async usageHistory(id: number, params?: Record<string, unknown>) { const res = await apiClient.get(`/seller/coupons/${id}/usage-history`, { params }); return res.data.data; },
  async targets(type: CouponScope) { const res = await apiClient.get(`/seller/coupons/targets/${type}`); return res.data.data as CouponTarget[]; },
};

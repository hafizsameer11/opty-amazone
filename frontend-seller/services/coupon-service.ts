import apiClient from '@/lib/api-client';

export interface Coupon {
  id: number;
  store_id: number;
  code: string;
  description?: string;
  discount_type: 'percentage' | 'fixed_amount' | 'free_shipping' | 'bogo';
  discount_value: number;
  max_discount?: number;
  min_order_amount?: number;
  usage_limit?: number;
  usage_per_user?: number;
  starts_at?: string;
  ends_at?: string;
  is_active: boolean;
  applicable_to?: string;
  conditions?: string;
  created_at: string;
  updated_at: string;
  usages_count?: number;
  store?: {
    id: number;
    name: string;
  };
}

export interface CreateCouponData {
  code: string;
  description?: string;
  discount_type: 'percentage' | 'fixed_amount' | 'free_shipping' | 'bogo';
  discount_value: number;
  max_discount?: number;
  min_order_amount?: number;
  usage_limit?: number;
  usage_per_user?: number;
  starts_at?: string;
  ends_at?: string;
  is_active?: boolean;
  applicable_to?: string;
  conditions?: string;
}

export interface CouponStatistics {
  total_coupons: number;
  active_coupons: number;
  total_usages: number;
  total_discount_given: number;
}

export const couponService = {
  async getAll(params?: {
    search?: string;
    is_active?: boolean;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
    per_page?: number;
    page?: number;
  }) {
    const res = await apiClient.get('/seller/coupons', { params });
    return res.data.data;
  },

  async getOne(id: number): Promise<Coupon> {
    const res = await apiClient.get(`/seller/coupons/${id}`);
    return res.data.data;
  },

  async create(data: CreateCouponData): Promise<Coupon> {
    const res = await apiClient.post('/seller/coupons', data);
    return res.data.data;
  },

  async update(id: number, data: Partial<CreateCouponData>): Promise<Coupon> {
    const res = await apiClient.put(`/seller/coupons/${id}`, data);
    return res.data.data;
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/seller/coupons/${id}`);
  },

  async toggleStatus(id: number): Promise<Coupon> {
    const res = await apiClient.post(`/seller/coupons/${id}/toggle-status`);
    return res.data.data;
  },
};

import apiClient from '@/lib/api-client';

export interface CouponValidation {
  valid: boolean;
  coupon?: {
    id: number;
    code: string;
    discount_type: 'percentage' | 'fixed_amount' | 'free_shipping' | 'bogo';
    discount_value: number;
  };
  discount_amount?: number;
  message: string;
}

export const couponService = {
  async validate(code: string, orderTotal: number): Promise<CouponValidation> {
    try {
      const res = await apiClient.post('/buyer/coupons/validate', {
        code,
        order_total: orderTotal,
      });
      return {
        valid: true,
        coupon: res.data.data.coupon,
        discount_amount: res.data.data.discount_amount,
        message: res.data.data.message || 'Coupon applied successfully',
      };
    } catch (error: any) {
      return {
        valid: false,
        message: error.response?.data?.message || 'Invalid coupon code',
      };
    }
  },
};

import apiClient from '@/lib/api-client';

export interface PointsBalance {
  balance: number;
  available: number;
  expired: number;
}

export interface PointTransaction {
  id: number;
  user_id: number;
  type: 'earn' | 'redeem' | 'expire' | 'adjustment' | 'referral' | 'review' | 'signup' | 'birthday' | 'social_share';
  points: number;
  balance_after: number;
  description?: string;
  reference_type?: string;
  reference_id?: number;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface RedeemResult {
  points_used: number;
  discount_amount: number;
  new_balance: number;
}

export const pointsService = {
  async getBalance(): Promise<PointsBalance> {
    const res = await apiClient.get('/buyer/points/balance');
    return res.data.data;
  },

  async getTransactions(limit?: number): Promise<PointTransaction[]> {
    const res = await apiClient.get('/buyer/points/transactions', {
      params: { limit },
    });
    return res.data.data;
  },

  async redeem(points: number, orderId?: number): Promise<RedeemResult> {
    const res = await apiClient.post('/buyer/points/redeem', {
      points,
      order_id: orderId,
    });
    return res.data.data;
  },
};

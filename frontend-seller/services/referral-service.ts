import apiClient from '@/lib/api-client';

export type ReferralCampaign = {
  id: number; name: string; identifier: string; status: string; approval_status: string; scope_type: 'store' | 'products' | 'categories' | 'mixed';
  reward_type: 'fixed' | 'percentage'; reward_amount: string; max_reward_per_order?: string | null; budget_amount: string; budget_reserved: string; budget_spent: string;
  minimum_order_amount: string; minimum_quantity: number; new_customer_only: boolean; activation_mode: 'immediate' | 'scheduled'; starts_at: string; ends_at?: string | null;
  products: { id: number; name: string }[]; categories: { id: number; name: string }[]; analytics?: ReferralAnalytics;
};
export type ReferralAnalytics = { clicks: number; registrations: number; orders: number; qualified_conversions: number; pending_rewards: number; rewarded_conversions: number; reversed_rewards: number; revenue_generated: number; referral_commission_cost: number; net_revenue: number; conversion_rate: number; average_order_value: number; budget_used: number; budget_remaining: number };
export type ReferralPayload = { name: string; scope_type: ReferralCampaign['scope_type']; reward_type: ReferralCampaign['reward_type']; reward_amount: number; max_reward_per_order?: number | null; budget_amount: number; usage_limit?: number | null; monthly_reward_limit?: number | null; per_buyer_limit?: number | null; minimum_order_amount?: number; minimum_quantity?: number; new_customer_only?: boolean; platform_stacking?: 'exclusive' | 'allow_platform'; activation_mode: 'immediate' | 'scheduled'; starts_at?: string; ends_at?: string | null; product_ids?: number[]; category_ids?: number[] };
export const referralService = {
  async list(page = 1) { return (await apiClient.get('/seller/referral-campaigns', { params: { page } })).data.data; },
  async get(id: number) { return (await apiClient.get(`/seller/referral-campaigns/${id}`)).data.data; },
  async create(data: ReferralPayload) { return (await apiClient.post('/seller/referral-campaigns', data)).data.data as ReferralCampaign; },
  async update(id: number, data: Partial<ReferralPayload>) { return (await apiClient.put(`/seller/referral-campaigns/${id}`, data)).data.data as ReferralCampaign; },
  async action(id: number, action: 'pause' | 'resume' | 'archive') { return (await apiClient.post(`/seller/referral-campaigns/${id}/action`, { action })).data.data as ReferralCampaign; },
};

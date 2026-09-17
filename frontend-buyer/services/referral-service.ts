import apiClient from '@/lib/api-client';

export type ReferralStatus = 'pending' | 'qualified' | 'rewarded' | 'rejected' | 'suspended' | 'reversed';
export type ReferralCampaign = {
  id: number; identifier: string; name: string; scope_type: 'store' | 'products' | 'categories' | 'mixed';
  reward_type: 'fixed' | 'percentage'; reward_amount: string | number; max_reward_per_order?: string | number | null;
  minimum_order_amount: string | number; minimum_quantity: number; new_customer_only: boolean; starts_at: string; ends_at?: string | null;
  store?: { id: number; name: string }; products?: { id: number; name: string }[]; categories?: { id: number; name: string }[];
};
export type ReferralReward = { id: number; source: 'platform' | 'seller_campaign'; status: ReferralStatus; amount: string | number;
  eligible_subtotal: string | number; reward_type: string; reward_value: string | number; reason?: string | null; created_at: string;
  campaign?: { id: number; name: string; identifier: string } | null; referred?: { id: number; name: string; email: string }; order?: { id: number; order_no: string };
};
export type ReferralDashboard = { platform: { code: string; link: string; attribution_days: number }; stats: Record<ReferralStatus | 'clicks' | 'registrations' | 'total_rewards', number>;
  campaigns: ReferralCampaign[]; history: { data: ReferralReward[]; current_page: number; last_page: number } };

export const REFERRAL_TOKEN_KEY = 'opty-referral-attribution-token';
const REFERRAL_COOKIE = 'opty_referral_attribution';

export function storeReferralAttribution(token: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(REFERRAL_TOKEN_KEY, token);
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${REFERRAL_COOKIE}=${encodeURIComponent(token)}; Max-Age=${60 * 60 * 24 * 30}; Path=/; SameSite=Lax${secure}`;
}

export function readReferralAttribution(): string | null {
  if (typeof window === 'undefined') return null;
  const local = window.localStorage.getItem(REFERRAL_TOKEN_KEY);
  if (local) return local;
  const cookie = document.cookie.split('; ').find((entry) => entry.startsWith(`${REFERRAL_COOKIE}=`));
  return cookie ? decodeURIComponent(cookie.slice(REFERRAL_COOKIE.length + 1)) : null;
}

export function clearReferralAttribution(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(REFERRAL_TOKEN_KEY);
  document.cookie = `${REFERRAL_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
}

export const referralService = {
  async track(referrerCode: string, campaignIdentifier?: string, productId?: number) {
    const response = await apiClient.post('/referrals/attributions', { referrer_code: referrerCode, campaign_identifier: campaignIdentifier, product_id: productId });
    return response.data.data as { token: string; expires_at: string; product_id?: number };
  },
  async claim(token: string) { return (await apiClient.post('/buyer/referrals/claim', { token })).data.data; },
  async dashboard(productId?: number): Promise<ReferralDashboard> { return (await apiClient.get('/buyer/referrals', { params: productId ? { product_id: productId } : undefined })).data.data; },
};

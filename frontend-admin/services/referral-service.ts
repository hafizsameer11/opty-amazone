import apiClient from '@/lib/api-client';

export type ReferralSettings = Record<string, boolean | number | string | null>;
export type ReferralCampaign = { id: number; name: string; identifier: string; status: string; approval_status: string; store?: { id: number; name: string }; seller?: { id: number; name: string; email: string }; budget_amount: string; budget_spent: string; budget_reserved: string; analytics?: Record<string, number> };
export type ReferralReward = { id: number; source: string; status: string; amount: string; eligible_subtotal: string; reason?: string | null; created_at: string; campaign?: { id: number; name: string; identifier: string }; referrer?: { id: number; name: string; email: string }; referred?: { id: number; name: string; email: string }; order?: { id: number; order_no: string }; buyer_transaction?: { id: number }; seller_wallet_entry?: { id: number }; platform_ledger_entry?: { id: number }; reversal?: { id: number; reason: string } };
export const referralService = {
  async settings(): Promise<ReferralSettings> { return (await apiClient.get('/admin/referrals/settings')).data.data; },
  async updateSettings(data: ReferralSettings): Promise<ReferralSettings> { return (await apiClient.put('/admin/referrals/settings', data)).data.data; },
  async campaigns(page = 1) { return (await apiClient.get('/admin/referrals/campaigns', { params: { page } })).data.data; },
  async campaignAction(id: number, action: 'approve' | 'reject' | 'suspend' | 'archive', reason?: string) { return (await apiClient.post(`/admin/referrals/campaigns/${id}/action`, { action, reason })).data.data; },
  async rewards(params?: Record<string, string>) { return (await apiClient.get('/admin/referrals/rewards', { params })).data.data; },
  async rewardAction(id: number, action: 'approve' | 'reject' | 'suspend' | 'reverse', reason: string) { return (await apiClient.post(`/admin/referrals/rewards/${id}/action`, { action, reason })).data.data; },
  async conversions() { return (await apiClient.get('/admin/referrals/conversions')).data.data; },
  async audit() { return (await apiClient.get('/admin/referrals/audit')).data.data; },
  async exportFinancialReport(): Promise<Blob> {
    return (await apiClient.get('/admin/referrals/export', { responseType: 'blob' })).data;
  },
};

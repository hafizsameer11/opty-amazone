import apiClient from '@/lib/api-client';
export const financeService = {
  async list(resource: string, page = 1, userId?: string) { return (await apiClient.get(`/admin/finance/${resource}`, { params: { page, user_id: userId } })).data.data; },
  async withdrawal(id: number, data: { status: string; notes: string; payout_reference?: string }) { return (await apiClient.post(`/admin/finance/withdrawals/${id}`, data)).data.data; },
};

import apiClient from '@/lib/api-client';

export type SellerWallet = { id: number; available_balance: string; pending_balance: string; reserved_balance: string; ad_reserved_balance: string; ad_spend_total: string; top_up_total: string; disputed_balance: string; debt_balance: string; total_earnings: string; locked_escrow_amount: string };
export type LedgerEntry = { id: number; type: string; amount: string; status: string; store_order_id?: number; withdrawal_id?: number; ad_campaign_id?: number; description?: string; metadata?: Record<string, unknown>; created_at: string; balances_after: Record<string, string> };
export type Withdrawal = { id: number; amount: string; status: string; created_at: string; payout_reference?: string; notes?: string };
export type Page<T> = { data: T[]; current_page: number; last_page: number; total: number };
export const walletService = {
  async summary(): Promise<SellerWallet> { return (await apiClient.get('/seller/wallet')).data.data; },
  async capabilities(): Promise<{ wallet_top_up: boolean; currency: string }> { return (await apiClient.get('/seller/wallet/capabilities')).data.data; },
  async topUp(data: { amount: string; idempotency_key: string }): Promise<{ wallet: SellerWallet; transaction: LedgerEntry }> { return (await apiClient.post('/seller/wallet/top-ups', data)).data.data; },
  async transactions(page = 1): Promise<Page<LedgerEntry>> { return (await apiClient.get('/seller/wallet/transactions', { params: { page } })).data.data; },
  async withdrawals(page = 1): Promise<Page<Withdrawal>> { return (await apiClient.get('/seller/wallet/withdrawals', { params: { page } })).data.data; },
  async withdraw(data: { amount: string; idempotency_key: string; bank_details: { account_name: string; account_number: string; bank_name: string } }): Promise<Withdrawal> {
    return (await apiClient.post('/seller/wallet/withdrawals', data)).data.data;
  },
};

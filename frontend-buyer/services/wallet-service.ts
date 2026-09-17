import apiClient from '@/lib/api-client';

export interface WalletBalance {
  balance: number;
  currency: string;
}

export interface WalletTransaction {
  id: number;
  type: string;
  meta?: { payment_method?: string; products?: string[]; campaign_name?: string; order_id?: number; store_order_id?: number; reward_amount?: string | number; referral_reward_id?: number };
  amount: number;
  status: 'pending' | 'success' | 'completed' | 'failed';
  description?: string;
  created_at: string;
}

export interface TopUpData {
  amount?: number;
  stripe_session_id: string;
}

export interface WithdrawData {
  amount: number;
  bank_account_id?: number;
  account_number?: string;
  account_name?: string;
  bank_name?: string;
}

export const walletService = {
  async capabilities(): Promise<{ development_top_up: boolean; stripe_available: boolean }> { const res = await apiClient.get('/buyer/wallet/capabilities'); return res.data.data; },
  async developmentTopUp(amount: number, key: string) { const res = await apiClient.post('/buyer/wallet/development-top-up', { amount, idempotency_key: key }); return res.data.data; },
  async getBalance(): Promise<WalletBalance> {
    const res = await apiClient.get('/buyer/wallet/balance');
    return res.data.data;
  },

  async getTransactions(params?: { per_page?: number; page?: number }) {
    const res = await apiClient.get('/buyer/wallet/transactions', { params });
    return res.data.data;
  },

  async topUp(data: TopUpData) {
    const res = await apiClient.post('/buyer/wallet/top-up', {
      amount: data.amount,
      stripe_session_id: data.stripe_session_id,
    });
    return res.data.data;
  },

  async withdraw(data: WithdrawData) {
    const slot = 'opty-buyer-withdraw:' + JSON.stringify(data);
    const key = sessionStorage.getItem(slot) || crypto.randomUUID();
    sessionStorage.setItem(slot, key);
    const res = await apiClient.post('/buyer/wallet/withdraw', { ...data, idempotency_key: key });
    sessionStorage.removeItem(slot);
    return res.data.data;
  },
};

import apiClient from '@/lib/api-client';

export interface WalletBalance {
  balance: number;
  currency: string;
}

export interface WalletTransaction {
  id: number;
  type: 'top_up' | 'withdraw' | 'payment' | 'refund';
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  description?: string;
  created_at: string;
}

export interface TopUpData {
  amount: number;
  stripe_session_id?: string;
}

export interface WithdrawData {
  amount: number;
  bank_account_id?: number;
  account_number?: string;
  account_name?: string;
  bank_name?: string;
}

export const walletService = {
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
    const res = await apiClient.post('/buyer/wallet/withdraw', data);
    return res.data.data;
  },
};


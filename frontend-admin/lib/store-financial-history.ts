import type { StoreDetailResponse } from '@/services/seller-service';

type Translate = (key: string, values?: Record<string, string | number>) => string;

/**
 * Turn the backend's `financial_history` counters into one sentence so the
 * admin knows exactly why a store cannot be deleted.
 */
export function describeFinancialHistory(
  history: StoreDetailResponse['financial_history'],
  t: Translate
): string {
  const parts: string[] = [];
  const push = (count: number | undefined, key: string) => {
    if (count) parts.push(t(key, { count }));
  };

  push(history.store_orders, 'financialHistoryOrders');
  push(history.wallet_entries, 'financialHistoryWalletEntries');
  push(history.withdrawals, 'financialHistoryWithdrawals');
  push(history.platform_ledger_entries, 'financialHistoryLedgerEntries');
  push(history.paid_ad_campaigns, 'financialHistoryAdCampaigns');

  if (history.wallet_balance) {
    parts.push(t('financialHistoryBalance', { amount: history.wallet_balance }));
  }

  return parts.length ? parts.join(', ') : t('deleteStoreBlockedFallback');
}
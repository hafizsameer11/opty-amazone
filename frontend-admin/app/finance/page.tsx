'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { financeService } from '@/services/finance-service';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { statusKey, useLanguage } from '@/contexts/LanguageContext';

const tabs = {
  'seller-wallets': 'sellerBalances',
  'seller-transactions': 'sellerLedgerFinance',
  'platform-revenue': 'boostAdsRevenue',
  withdrawals: 'withdrawals',
  'buyer-transactions': 'buyerWalletTransactions',
} as const;
type Resource = keyof typeof tabs;
type Row = {
  id: number; store?: { name: string }; wallet?: { store?: { name: string } }; seller_wallet?: { store?: { name: string } };
  campaign?: { id: number; name: string; status: string }; user?: { name: string; email: string }; amount?: string; status?: string; type?: string; created_at?: string;
  available_balance?: string; pending_balance?: string; reserved_balance?: string; ad_reserved_balance?: string; ad_spend_total?: string; top_up_total?: string; disputed_balance?: string; debt_balance?: string; total_earnings?: string;
  store_order_id?: number; withdrawal_id?: number; seller_wallet_id?: number; ad_campaign_id?: number; description?: string; notes?: string; payout_reference?: string;
  bank_details?: { account_name: string; account_number: string; bank_name: string }; balances_after?: Record<string, string>; deltas?: Record<string, string>;
  meta?: { payment_method?: string; store_order_id?: number; order_id?: number; reverses_transaction_id?: number };
};

const euro = (value: unknown) => `€${Number(value || 0).toFixed(2)}`;
const readableKey = (value: unknown) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '_');

export default function FinancePage() {
  const { t } = useLanguage();
  const [resource, setResource] = useState<Resource>('seller-wallets');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Row[]>([]);
  const [last, setLast] = useState(1);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState('');

  const load = useCallback(async () => {
    try {
      const result = await financeService.list(resource, page, userId || undefined);
      setRows(result.data); setLast(result.last_page); setError('');
    } catch { setError(t('unableLoadFinance')); }
  }, [page, resource, t, userId]);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('user_id');
    if (id) { setUserId(id); setResource('buyer-transactions'); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useLiveRefresh(load);

  const status = (value?: string) => value ? t(statusKey(value)) : '';
  const type = (value?: string) => value ? t(`financeType_${readableKey(value)}`) : '';
  const method = (value?: string) => value ? t(`paymentMethod_${readableKey(value)}`) : t('legacy');
  const rowName = (row: Row) => row.store?.name || row.wallet?.store?.name || row.seller_wallet?.store?.name || row.campaign?.name || row.user?.name || type(row.type) || t(tabs[resource]);

  return <AdminLayout>
    <div className="space-y-6">
      <header><h1 className="text-3xl font-bold">{t('marketplaceFinance')}</h1><p className="mt-2 text-gray-600">{t('financeDescription')}</p></header>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label={t('marketplaceFinance')}>
        {Object.entries(tabs).map(([key, title]) => <button key={key} type="button" role="tab" aria-selected={resource === key} onClick={() => { setResource(key as Resource); setPage(1); setRows([]); }} className={`rounded-lg border px-4 py-2 ${resource === key ? 'bg-blue-700 text-white' : 'bg-white'}`}>{t(title)}</button>)}
      </div>
      {error && <p role="alert" className="text-red-700">{error}</p>}
      {resource === 'buyer-transactions' && <label className="block text-sm">{t('buyerIdFilter')}<input aria-label={t('buyerIdFilter')} className="border rounded p-2 ml-2" value={userId} onChange={e => { setUserId(e.target.value); setPage(1); }} /></label>}
      {!rows.length && !error && <p className="text-gray-500">{t('noFinancialRecords')}</p>}
      <div className="space-y-4">
        {rows.map(row => <section key={`${resource}:${row.id}`} className="rounded-xl border bg-white p-5 space-y-3">
          <div className="flex justify-between gap-4"><h2 className="font-semibold">#{row.id} · {rowName(row)}</h2><span>{status(row.status)} {row.amount !== undefined && <strong>{euro(row.amount)}</strong>}</span></div>
          {resource === 'seller-wallets' ? <div className="grid sm:grid-cols-3 gap-4">{[
            ['available', row.available_balance], ['reservedForAds', row.ad_reserved_balance], ['adSpend', row.ad_spend_total], ['walletTopUps', row.top_up_total], ['pendingEarnings', row.pending_balance], ['reservedWithdrawal', row.reserved_balance], ['disputed', row.disputed_balance], ['refundDebt', row.debt_balance], ['totalEarningsAfterReversals', row.total_earnings],
          ].map(([key, amount]) => <p key={String(key)} className="text-sm text-gray-600">{t(String(key))}<strong className="block text-xl text-gray-900">{euro(amount)}</strong></p>)}</div> : <>
            <p className="text-sm text-gray-600">{row.created_at && new Date(row.created_at).toLocaleString()} · {type(row.type)} · {row.description || row.notes}</p>
            <p className="text-sm">{row.user?.email} {row.seller_wallet_id && `${t('sellerLedger')} #${row.seller_wallet_id}`} {row.ad_campaign_id && `${t('boostCampaign')} #${row.ad_campaign_id}`} {row.store_order_id && `${t('shipment')} #${row.store_order_id}`} {row.withdrawal_id && `${t('withdrawal')} #${row.withdrawal_id}`}</p>
            {row.meta && <p className="text-sm">{t('method')}: {method(row.meta.payment_method)} {row.meta.order_id && <a className="text-blue-700" href={`/orders/${row.meta.order_id}`}> · {t('order')} #{row.meta.order_id}</a>} {row.meta.reverses_transaction_id && ` · ${t('reversal')} #${row.meta.reverses_transaction_id}`}</p>}
            {row.balances_after && <details className="text-sm"><summary className="cursor-pointer">{t('ledgerChanges')}</summary><pre className="whitespace-pre-wrap mt-2">{JSON.stringify({ changes: row.deltas, after: row.balances_after }, null, 2)}</pre></details>}
            {resource === 'withdrawals' && <><p className="text-sm">{row.bank_details?.account_name} · {row.bank_details?.bank_name} · {row.bank_details?.account_number}</p><p className="text-sm">{t('payoutReference')}: {row.payout_reference || t('notRecorded')}</p><WithdrawalAction row={row} reload={load} /></>}
          </>}
        </section>)}
      </div>
      <div className="flex gap-4"><button disabled={page <= 1} onClick={() => setPage(page - 1)} className="disabled:opacity-40">{t('previous')}</button><span>{t('pageOf', { page, last })}</span><button disabled={page >= last} onClick={() => setPage(page + 1)} className="disabled:opacity-40">{t('next')}</button></div>
    </div>
  </AdminLayout>;
}

function WithdrawalAction({ row, reload }: { row: Row; reload: () => Promise<void> }) {
  const { t } = useLanguage();
  const [selectedStatus, setSelectedStatus] = useState(''); const [notes, setNotes] = useState(''); const [reference, setReference] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const choices: Record<string, string[]> = { pending: ['approved', 'rejected'], approved: ['processing', 'rejected'], processing: ['completed', 'failed'] };
  const options = choices[row.status || ''] || [];
  if (!options.length) return null;
  const submit = async (event: React.FormEvent) => { event.preventDefault(); if (busy) return; setBusy(true); setError(''); try { await financeService.withdrawal(row.id, { status: selectedStatus, notes, payout_reference: reference || undefined }); setSelectedStatus(''); await reload(); } catch { setError(t('unableUpdateWithdrawal')); } finally { setBusy(false); } };
  return <form onSubmit={submit} className="space-y-3 border-t pt-3"><p className="text-sm text-gray-600">{t('bankTransferHelp')}</p>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    <label className="sr-only" htmlFor={`withdrawal-action-${row.id}`}>{t('withdrawalAction')}</label><select id={`withdrawal-action-${row.id}`} required className="border rounded p-2" value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)}><option value="">{t('selectAction')}</option>{options.map(value => <option key={value} value={value}>{t(statusKey(value))}</option>)}</select>
    <input aria-label={t('withdrawalNotes')} required minLength={5} maxLength={2000} className="border rounded p-2 w-full" value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('withdrawalNotes')} />
    {selectedStatus === 'completed' && <input aria-label={t('bankPayoutReference')} required className="border rounded p-2 w-full" value={reference} onChange={e => setReference(e.target.value)} placeholder={t('bankPayoutReference')} />}
    <button disabled={busy} className="rounded bg-blue-700 text-white px-4 py-2 disabled:opacity-50">{busy ? t('saving') : t('applyWithdrawal')}</button>
  </form>;
}

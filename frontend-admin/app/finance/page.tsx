'use client';
import { useEffect, useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { financeService } from '@/services/finance-service';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';

const tabs = { 'seller-wallets': 'Seller balances', 'seller-transactions': 'Seller ledger', 'platform-revenue': 'Boost Ads revenue', 'withdrawals': 'Withdrawals', 'buyer-transactions': 'Buyer wallet transactions' };
type Resource = keyof typeof tabs;
type Row = { id: number; store?: { name: string }; wallet?: { store?: { name: string } }; seller_wallet?: { store?: { name: string } }; campaign?: { id: number; name: string; status: string }; user?: { name: string; email: string }; amount?: string; status?: string; type?: string; created_at?: string; available_balance?: string; pending_balance?: string; reserved_balance?: string; ad_reserved_balance?: string; ad_spend_total?: string; top_up_total?: string; disputed_balance?: string; debt_balance?: string; total_earnings?: string; store_order_id?: number; withdrawal_id?: number; seller_wallet_id?: number; ad_campaign_id?: number; description?: string; notes?: string; payout_reference?: string; bank_details?: { account_name: string; account_number: string; bank_name: string }; balances_after?: Record<string, string>; deltas?: Record<string, string>; meta?: { payment_method?: string; store_order_id?: number; order_id?: number; reverses_transaction_id?: number } };
const euro = (v: unknown) => '€' + Number(v || 0).toFixed(2);

export default function FinancePage() {
  const [resource, setResource] = useState<Resource>('seller-wallets'); const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Row[]>([]); const [last, setLast] = useState(1); const [error, setError] = useState('');
  const [userId, setUserId] = useState('');
  useEffect(() => { const id = new URLSearchParams(window.location.search).get('user_id'); if (id) { setUserId(id); setResource('buyer-transactions'); } }, []);
  const load = async () => { try { const result = await financeService.list(resource, page, userId || undefined); setRows(result.data); setLast(result.last_page); setError(''); } catch (e: any) { setError(e.response?.data?.message || 'Unable to load financial records.'); } };
  useEffect(() => { void load(); }, [resource, page, userId]); useLiveRefresh(load);
  return <AdminLayout><div className="space-y-6"><header><h1 className="text-3xl font-bold">Marketplace Finance</h1><p className="mt-2 text-gray-600">Buyer payments, seller balances, reversals and bank payout records. Updates every 5 seconds.</p></header>
    <div className="flex flex-wrap gap-2">{Object.entries(tabs).map(([key, title]) => <button key={key} onClick={() => { setResource(key as Resource); setPage(1); setRows([]); }} className={`rounded-lg border px-4 py-2 ${resource === key ? 'bg-blue-700 text-white' : 'bg-white'}`}>{title}</button>)}</div>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {resource === 'buyer-transactions' && <label className="block text-sm">Buyer ID filter <input aria-label="Buyer ID filter" className="border rounded p-2 ml-2" value={userId} onChange={e => { setUserId(e.target.value); setPage(1); }} /></label>}
    {!rows.length && !error && <p className="text-gray-500">No records on this page.</p>}
    <div className="space-y-4">{rows.map(row => <section key={`${resource}:${row.id}`} className="rounded-xl border bg-white p-5 space-y-3">
      <div className="flex justify-between gap-4"><h2 className="font-semibold">#{row.id} · {row.store?.name || row.wallet?.store?.name || row.seller_wallet?.store?.name || row.campaign?.name || row.user?.name || row.type?.replaceAll('_', ' ') || tabs[resource]}</h2><span>{row.status} {row.amount !== undefined && <strong>{euro(row.amount)}</strong>}</span></div>
      {resource === 'seller-wallets' ? <div className="grid sm:grid-cols-3 gap-4">{[['Available', row.available_balance], ['Reserved for ads', row.ad_reserved_balance], ['Ad spend', row.ad_spend_total], ['Wallet top-ups', row.top_up_total], ['Pending earnings', row.pending_balance], ['Reserved withdrawal', row.reserved_balance], ['Disputed', row.disputed_balance], ['Refund debt', row.debt_balance], ['Total earnings after reversals', row.total_earnings]].map(([title, amount]) => <p key={title} className="text-sm text-gray-600">{title}<strong className="block text-xl text-gray-900">{euro(amount)}</strong></p>)}</div> : <>
        <p className="text-sm text-gray-600">{row.created_at && new Date(row.created_at).toLocaleString()} · {row.type?.replaceAll('_', ' ')} · {row.description || row.notes}</p>
        <p className="text-sm">{row.user?.email} {row.seller_wallet_id && `Seller wallet #${row.seller_wallet_id}`} {row.ad_campaign_id && `Boost campaign #${row.ad_campaign_id}`} {row.store_order_id && `Shipment #${row.store_order_id}`} {row.withdrawal_id && `Withdrawal #${row.withdrawal_id}`}</p>
        {row.meta && <p className="text-sm">Method: {row.meta.payment_method || 'legacy'} {row.meta.order_id && <a className="text-blue-700" href={`/orders/${row.meta.order_id}`}> · Order #{row.meta.order_id}</a>} {row.meta.reverses_transaction_id && ` · Reverses transaction #${row.meta.reverses_transaction_id}`}</p>}
        {row.balances_after && <details className="text-sm"><summary className="cursor-pointer">Ledger changes and resulting balances</summary><pre className="whitespace-pre-wrap mt-2">{JSON.stringify({ changes: row.deltas, after: row.balances_after }, null, 2)}</pre></details>}
        {resource === 'withdrawals' && <><p className="text-sm">{row.bank_details?.account_name} · {row.bank_details?.bank_name} · {row.bank_details?.account_number}</p><p className="text-sm">Payout reference: {row.payout_reference || 'Not recorded'}</p><WithdrawalAction row={row} reload={load} /></>}
      </>}
    </section>)}</div>
    <div className="flex gap-4"><button disabled={page <= 1} onClick={() => setPage(page - 1)} className="disabled:opacity-40">Previous</button><span>Page {page} / {last}</span><button disabled={page >= last} onClick={() => setPage(page + 1)} className="disabled:opacity-40">Next</button></div>
  </div></AdminLayout>;
}
function WithdrawalAction({ row, reload }: { row: Row; reload: () => Promise<void> }) {
  const [status, setStatus] = useState(''); const [notes, setNotes] = useState(''); const [reference, setReference] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const choices: Record<string, string[]> = { pending: ['approved', 'rejected'], approved: ['processing', 'rejected'], processing: ['completed', 'failed'] };
  const options = choices[row.status || ''] || [];
  if (!options.length) return null;
  const submit = async (e: React.FormEvent) => { e.preventDefault(); if (busy) return; setBusy(true); setError(''); try { await financeService.withdrawal(row.id, { status, notes, payout_reference: reference || undefined }); setStatus(''); await reload(); } catch (e: any) { setError(e.response?.data?.message || 'Could not update withdrawal.'); } finally { setBusy(false); } };
  return <form onSubmit={submit} className="space-y-3 border-t pt-3"><p className="text-sm text-gray-600">Process the bank transfer through your payout system. Record completion only after it succeeds.</p>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    <select aria-label="Withdrawal action" required className="border rounded p-2" value={status} onChange={e => setStatus(e.target.value)}><option value="">Select action</option>{options.map(s => <option key={s}>{s}</option>)}</select>
    <input aria-label="Withdrawal notes" required minLength={5} maxLength={2000} className="border rounded p-2 w-full" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Review / payout notes" />
    {status === 'completed' && <input aria-label="Bank payout reference" required className="border rounded p-2 w-full" value={reference} onChange={e => setReference(e.target.value)} placeholder="Completed bank payout reference" />}
    <button disabled={busy} className="rounded bg-blue-700 text-white px-4 py-2 disabled:opacity-50">{busy ? 'Saving…' : 'Apply withdrawal action'}</button>
  </form>;
}

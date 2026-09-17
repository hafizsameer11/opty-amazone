'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { adService, money, label, terminal, adError, type Campaign, type Analytics, type BudgetTransaction, type Audit, type Metric, type Page } from '@/services/ad-service';

function MetricsTable({ rows, dimension }: { rows: Metric[]; dimension: 'day' | 'placement' | 'location' }) {
  return <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr className="border-b text-slate-500">{[dimension, 'Impressions', 'Clicks', 'Spend', 'Conversions', 'Revenue'].map(h => <th className="py-3 pr-4 capitalize" key={h}>{h}</th>)}</tr></thead>
    <tbody>{rows.map(row => <tr key={row[dimension]} className="border-b"><td className="py-3 pr-4 capitalize">{row[dimension]}</td><td>{row.impressions}</td><td>{row.clicks}</td><td>{money(row.spent_cents)}</td><td>{row.conversions}</td><td>{money(row.revenue_cents)}</td></tr>)}</tbody></table>
    {!rows.length && <p className="py-4 text-slate-500">No events yet.</p>}</div>;
}
export default function CampaignDetails({ id, admin = false }: { id: number; admin?: boolean }) {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [transactions, setTransactions] = useState<Page<BudgetTransaction> | null>(null);
  const [audits, setAudits] = useState<Page<Audit> | null>(null);
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState(''); const [pendingAction, setPendingAction] = useState('');
  const [tab, setTab] = useState('analytics'); const [page, setPage] = useState(1); const [auditPage, setAuditPage] = useState(1);
  const load = useCallback(async () => {
    try {
      const [c, report, tx] = await Promise.all([adService.get(id), adService.analytics(id), adService.transactions(id, page)]);
      setCampaign(c); setAnalytics(report); setTransactions(tx);
      if (admin) setAudits(await adService.audits(id, auditPage));
      setError('');
    } catch (e) { setError(adError(e)); }
  }, [id, page, auditPage, admin]);
  useEffect(() => { void load(); const timer = setInterval(() => { void load(); }, 30000); return () => clearInterval(timer); }, [load]);
  async function perform(action: string) {
    setBusy(true); setError('');
    try { await adService.action(id, action, reason || undefined); setPendingAction(''); setReason(''); await load(); }
    catch (e) { setError(adError(e)); } finally { setBusy(false); }
  }
  const base = admin ? '/ad-campaigns' : '/boost-ads';
  if (!campaign) return <div><Link href={base}>← Campaigns</Link><p className="p-6" role={error ? 'alert' : 'status'}>{error || 'Loading campaign…'}</p><button onClick={() => void load()}>Retry</button></div>;
  const c = analytics?.summary || campaign;
  const actions: string[] = [];
  if (!terminal(c.status) && c.status !== 'reconciliation_hold') {
    if (admin) {
      if (c.status === 'pending_review') actions.push('approve', 'reject');
      if (c.status === 'legacy_review') actions.push('reject');
      if (['active', 'scheduled'].includes(c.status)) actions.push('pause');
      if (c.status === 'paused') actions.push('resume');
      actions.push('terminate');
      if (Number(c.remaining_cents) > 0) actions.push('refund');
    } else {
      if (['pending_payment', 'payment_failed'].includes(c.status)) actions.push('pay');
      if (['active', 'scheduled'].includes(c.status)) actions.push('pause');
      if (c.status === 'paused' && c.pause_source !== 'admin') actions.push('resume');
      actions.push('cancel');
    }
  }
  return <div className="space-y-6 text-slate-900">
    <Link href={base} className="text-blue-700">← All campaigns</Link>
    <div className="flex flex-wrap justify-between gap-4"><div><p className="text-sm text-slate-500">Campaign #{c.id}{c.seller ? ' · ' + c.seller.name : ''}</p><h1 className="text-3xl font-bold">{c.name}</h1><p className="capitalize mt-2"><span className="inline-block bg-blue-100 text-blue-900 rounded-full px-3 py-1 mr-2">{label(c.status)}</span>Payment: {label(c.payment_status)}</p></div>
      <div className="flex flex-wrap gap-2 items-start">{actions.map(action => <button key={action} disabled={busy} className="border border-slate-300 bg-white rounded-lg px-3 py-2 capitalize disabled:opacity-50" onClick={() => { setPendingAction(action); setReason(''); }}>{label(action)}</button>)}
        {!admin && terminal(c.status) && <Link className="bg-blue-700 text-white px-3 py-2 rounded-lg" href={'/boost-ads?duplicate=' + c.id}>Duplicate campaign</Link>}</div></div>
    {error && <p role="alert" className="bg-red-50 text-red-800 p-4 rounded-lg">{error}</p>}
    {pendingAction && <form className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3" onSubmit={e => { e.preventDefault(); void perform(pendingAction); }}>
      <h2 className="font-semibold capitalize">Confirm {label(pendingAction)}</h2>
      <p className="text-sm">{pendingAction === 'pay' ? 'Reserve ' + money(c.budget_cents) + ' from your wallet. A failed reservation cannot activate advertising.' : ['cancel', 'reject', 'terminate', 'refund'].includes(pendingAction) ? 'This stops delivery and returns the unused reserved balance (' + money(c.remaining_cents) + ') to its original wallet balances.' : pendingAction === 'pause' ? 'New delivery and spending stop immediately.' : 'The campaign must satisfy payment, product, dates and budget checks.'}</p>
      {admin && <label className="block text-sm">Reason (recorded in audit history)<textarea required minLength={3} maxLength={2000} value={reason} onChange={e => setReason(e.target.value)} className="block border rounded-lg p-2 mt-1 w-full" /></label>}
      <div className="flex gap-3"><button disabled={busy} className="bg-blue-700 text-white px-4 py-2 rounded-lg">{busy ? 'Processing…' : 'Confirm ' + label(pendingAction)}</button><button type="button" disabled={busy} onClick={() => setPendingAction('')}>Back</button></div>
    </form>}
    {c.rejection_reason && <p className="p-4 bg-red-50 rounded-lg">Rejection reason: {c.rejection_reason}</p>}
    {c.status === 'legacy_review' && <div className="p-4 bg-amber-50 rounded-lg"><p>Historic payment and remaining funds are unverified. This campaign cannot deliver or release money. Reconcile it against payment evidence before replacing it.</p>{admin && <pre className="text-xs overflow-auto mt-2">{JSON.stringify(c.legacy_snapshot, null, 2)}</pre>}</div>}
    {c.status === 'reconciliation_hold' && <p className="p-4 bg-amber-50 rounded-lg">Delivery and financial actions are held because the ledger does not reconcile. An operator must investigate the audit history and ledger.</p>}
    <div className="grid md:grid-cols-3 gap-4 bg-white border rounded-xl p-5">
      <div><p className="text-slate-500 text-sm">Product</p><p className="font-semibold">{c.product?.name || 'Unavailable product'} (#{c.product_id})</p><p className="text-sm">{c.product ? '€' + Number(c.product.price).toFixed(2) + ' · Stock: ' + c.product.stock_quantity + ' · ' + (c.product.is_approved ? 'Approved' : 'Not approved') : ''}</p></div>
      <div><p className="text-slate-500 text-sm">Campaign dates</p><p>{new Date(c.starts_at).toLocaleString()} → {new Date(c.ends_at).toLocaleString()}</p><p className="text-xs text-slate-500">Daily budgets reset at 00:00 UTC</p></div>
      <div><p className="text-slate-500 text-sm">Targeting & placements</p><p>{c.locations.join(', ') || 'Unverified'}</p><p className="capitalize">{c.placements.map(label).join(', ') || 'Unverified'}</p></div>
    </div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{[
      ['Campaign budget', money(c.budget_cents)], ['Spent', money(c.spent_cents)], ['Remaining reservation', money(c.remaining_cents)], ['Returned to wallet', money(c.released_cents)],
      ['Budget type', money(c.budget_amount_cents) + (c.budget_type === 'daily' ? ' / day' : ' total')], ['CPC bid', money(c.bid_cents)], ['Impressions', c.impressions], ['Unique impressions / day', c.unique_impressions],
      ['Clicks', c.clicks], ['CTR', c.ctr + '%'], ['Average CPC', money(c.average_cpc_cents)], ['Product views', c.product_views],
      ['Add to carts', c.add_to_carts], ['Conversions', c.conversions], ['Conversion rate', c.conversion_rate + '%'], ['Attributed revenue', money(c.revenue_cents)], ['ROAS', c.roas + '×'],
    ].map(([k, value]) => <div key={k} className="bg-white rounded-xl border p-4"><p className="text-xs text-slate-500">{k}</p><p className="text-lg font-semibold mt-1">{value}</p></div>)}</div>
    <div className="flex gap-3 border-b">{['analytics', 'transactions', ...(admin ? ['audit history'] : [])].map(name => <button key={name} onClick={() => setTab(name)} className={'px-3 py-3 capitalize ' + (tab === name ? 'border-b-2 border-blue-700 text-blue-700' : '')}>{name}</button>)}</div>
    <div className="bg-white rounded-xl border p-5">
      {tab === 'analytics' && analytics && <div className="space-y-6"><p className="text-sm text-slate-500">Last-click attribution within {analytics.attribution_window_days} days of payment. Revenue uses order line totals, excluding shipping. Cancelled/refunded store orders reverse conversions. Unique impressions are deduplicated per UTC day.</p>
        <div><h2 className="font-semibold">Daily performance</h2><MetricsTable rows={analytics.daily} dimension="day" /></div><div><h2 className="font-semibold">By placement</h2><MetricsTable rows={analytics.placements} dimension="placement" /></div><div><h2 className="font-semibold">By location</h2><MetricsTable rows={analytics.locations} dimension="location" /></div></div>}
      {tab === 'transactions' && <div className="overflow-auto"><table className="w-full text-sm text-left"><thead><tr>{['Date', 'Type', 'Amount', 'Reserved balance after', 'Source balances'].map(h => <th key={h} className="pb-3 pr-4">{h}</th>)}</tr></thead><tbody>{transactions?.data.map(tx => <tr key={tx.id} className="border-t"><td className="py-3">{new Date(tx.created_at).toLocaleString()}</td><td className="capitalize">{label(tx.type)}</td><td>{money(tx.amount_cents)}</td><td>{money(tx.balance_after_cents)}</td><td className="text-xs">{JSON.stringify(tx.metadata)}</td></tr>)}</tbody></table><div className="flex gap-4 pt-4"><button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button><span>Page {page} of {transactions?.last_page || 1}</span><button disabled={page >= (transactions?.last_page || 1)} onClick={() => setPage(p => p + 1)}>Next</button></div></div>}
      {tab === 'audit history' && <div className="space-y-3">{audits?.data.map(a => <div key={a.id} className="border-b pb-3"><p className="font-medium capitalize">{label(a.action)}: {a.from_status || 'new'} → {a.to_status}</p><p className="text-sm">{a.reason}</p><p className="text-xs text-slate-500">{new Date(a.created_at).toLocaleString()} · {a.actor_id ? 'User #' + a.actor_id : 'System'}</p></div>)}<div className="flex gap-4"><button disabled={auditPage <= 1} onClick={() => setAuditPage(p => p - 1)}>Previous</button><span>Page {auditPage} of {audits?.last_page || 1}</span><button disabled={auditPage >= (audits?.last_page || 1)} onClick={() => setAuditPage(p => p + 1)}>Next</button></div></div>}
    </div>
  </div>;
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { adService, adError, money, label, type Campaign, type Page } from '@/services/ad-service';

export default function CampaignList({ admin = false, refreshKey = 0 }: { admin?: boolean; refreshKey?: number }) {
  const productId = useSearchParams().get('product_id') || '';
  const [rows, setRows] = useState<Page<Campaign> | null>(null); const [error, setError] = useState(''); const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', payment_status: '', seller_id: '', product_id: productId, from: '', to: '' });
  const [applied, setApplied] = useState<Record<string, string>>(productId ? { product_id: productId } : {}); const [page, setPage] = useState(1);
  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await adService.list({ ...applied, page })); setError(''); } catch (e) { setError(adError(e)); } finally { setLoading(false); }
  }, [applied, page]);
  useEffect(() => { void load(); const timer = setInterval(() => void load(), 30000); return () => clearInterval(timer); }, [load, refreshKey]);
  const input = 'border border-slate-300 rounded-lg p-2 bg-white text-sm w-full';
  return <div className="space-y-4">
    <form className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white border rounded-xl p-4" onSubmit={e => { e.preventDefault(); setPage(1); setApplied(Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''))); }}>
      <label className="text-xs text-slate-600">Status<select aria-label="Campaign status" className={input} value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}><option value="">All statuses</option>{['pending_payment', 'payment_failed', 'pending_review', 'scheduled', 'active', 'paused', 'completed', 'exhausted', 'cancelled', 'rejected', 'terminated', 'invalid', 'legacy_review', 'reconciliation_hold'].map(s => <option key={s} value={s}>{label(s)}</option>)}</select></label>
      <label className="text-xs text-slate-600">Payment<select aria-label="Payment status" className={input} value={filters.payment_status} onChange={e => setFilters(f => ({ ...f, payment_status: e.target.value }))}><option value="">All payments</option>{['unpaid', 'failed', 'reserved', 'released', 'unverified'].map(s => <option key={s} value={s}>{label(s)}</option>)}</select></label>
      {admin && <label className="text-xs text-slate-600">Seller ID<input type="number" min="1" className={input} value={filters.seller_id} onChange={e => setFilters(f => ({ ...f, seller_id: e.target.value }))} /></label>}
      <label className="text-xs text-slate-600">Product ID<input type="number" min="1" className={input} value={filters.product_id} onChange={e => setFilters(f => ({ ...f, product_id: e.target.value }))} /></label>
      <label className="text-xs text-slate-600">Starts from<input type="date" className={input} value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} /></label>
      <label className="text-xs text-slate-600">Starts through<input type="date" min={filters.from || undefined} className={input} value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} /></label>
      <button className="rounded-lg px-4 py-2 bg-blue-700 text-white self-end" disabled={loading}>Apply filters</button>
    </form>
    {error && <div role="alert" className="p-4 bg-red-50 text-red-800 rounded-lg">{error} <button className="underline" onClick={() => void load()}>Retry</button></div>}
    <div className="overflow-auto rounded-xl border bg-white"><table className="w-full text-sm text-left"><thead className="bg-slate-50 text-slate-500"><tr>{['Campaign / product', 'Status / payment', 'Dates', 'Budget / remaining', 'Spend', 'Impressions', 'Clicks / CTR', 'CPC', 'Conversions / revenue', 'ROAS'].map(h => <th className="p-3 whitespace-nowrap" key={h}>{h}</th>)}</tr></thead>
      <tbody>{rows?.data.map(c => <tr key={c.id} className="border-t hover:bg-blue-50/30">
        <td className="p-3 min-w-44"><Link className="font-semibold text-blue-700 hover:underline" href={(admin ? '/ad-campaigns/' : '/boost-ads/') + c.id}>{c.name}</Link><p className="text-xs text-slate-500">{c.product?.name || 'Unavailable product'}{admin && c.seller ? ' · ' + c.seller.name : ''}</p></td>
        <td className="p-3 capitalize"><span className="bg-slate-100 rounded px-2 py-1 inline-block">{label(c.status)}</span><p className="text-xs mt-2">{label(c.payment_status)}</p></td>
        <td className="p-3 text-xs whitespace-nowrap">{new Date(c.starts_at).toLocaleDateString()}<br />→ {new Date(c.ends_at).toLocaleDateString()}</td>
        <td className="p-3 whitespace-nowrap">{money(c.budget_cents)}<p className="text-xs">{money(c.remaining_cents)} remaining</p></td><td className="p-3">{money(c.spent_cents)}</td><td className="p-3">{c.impressions}</td><td className="p-3">{c.clicks}<p className="text-xs">{c.ctr}%</p></td><td className="p-3">{money(c.average_cpc_cents)}</td><td className="p-3">{c.conversions}<p className="text-xs">{money(c.revenue_cents)}</p></td><td className="p-3">{c.roas}×</td>
      </tr>)}</tbody></table>
      {loading && !rows && <p role="status" className="p-8 text-center">Loading campaigns…</p>}
      {rows?.data.length === 0 && <p className="p-8 text-center text-slate-500">No campaigns match these filters.</p>}
    </div>
    <div className="flex gap-4 justify-between items-center text-sm"><p>{rows?.total || 0} campaigns</p><div className="flex gap-4"><button disabled={page <= 1 || loading} onClick={() => setPage(p => p - 1)}>Previous</button><span>Page {page} of {rows?.last_page || 1}</span><button disabled={page >= (rows?.last_page || 1) || loading} onClick={() => setPage(p => p + 1)}>Next</button></div></div>
  </div>;
}

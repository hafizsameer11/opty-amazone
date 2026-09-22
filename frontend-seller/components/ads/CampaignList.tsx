'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { adService, adError, formatCampaignTime, money, type Campaign, type Page } from '@/services/ad-service';
import { useLanguage } from '@/contexts/LanguageContext';

const inputClass = 'border border-slate-300 rounded-lg p-2 bg-white text-sm w-full';

export default function CampaignList({ admin = false, refreshKey = 0 }: { admin?: boolean; refreshKey?: number }) {
  const { t } = useLanguage();
  const productId = useSearchParams().get('product_id') || '';
  const [rows, setRows] = useState<Page<Campaign> | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [filters, setFilters] = useState({ status: '', payment_status: '', seller_id: '', product_id: productId, from: '', to: '' });
  const [applied, setApplied] = useState<Record<string, string>>(productId ? { product_id: productId } : {});
  const [page, setPage] = useState(1);

  const statusLabel = (status: string) => {
    const key = `ads.status.${status}`;
    const translated = t(key);
    return translated === key ? status.replaceAll('_', ' ') : translated;
  };
  const paymentLabel = (status: string) => {
    const key = `ads.payment.${status}`;
    const translated = t(key);
    return translated === key ? status.replaceAll('_', ' ') : translated;
  };

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await adService.list({ ...applied, page })); setError(''); }
    catch (e) { setError(adError(e)); }
    finally { setLoading(false); }
  }, [applied, page]);

  useEffect(() => { void load(); const timer = setInterval(() => void load(), 30000); return () => clearInterval(timer); }, [load, refreshKey]);

  async function remove(campaign: Campaign) {
    if (!window.confirm(t('ads.deleteConfirm', { name: campaign.name }))) return;
    setDeletingId(campaign.id); setError('');
    try { await adService.destroy(campaign.id); await load(); }
    catch (e) { setError(adError(e)); }
    finally { setDeletingId(null); }
  }

  return <div className="space-y-4">
    <form className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white border rounded-xl p-4" onSubmit={e => { e.preventDefault(); setPage(1); setApplied(Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''))); }}>
      <label className="text-xs text-slate-600">{t('ads.status')}<select aria-label={t('ads.status')} className={inputClass} value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}><option value="">{t('ads.allStatuses')}</option>{['pending_payment', 'payment_failed', 'pending_review', 'scheduled', 'active', 'paused', 'completed', 'exhausted', 'cancelled', 'rejected', 'terminated', 'invalid', 'legacy_review', 'reconciliation_hold'].map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}</select></label>
      <label className="text-xs text-slate-600">{t('ads.payment')}<select aria-label={t('ads.payment')} className={inputClass} value={filters.payment_status} onChange={e => setFilters(f => ({ ...f, payment_status: e.target.value }))}><option value="">{t('ads.allPayments')}</option>{['unpaid', 'failed', 'reserved', 'released', 'unverified'].map(s => <option key={s} value={s}>{paymentLabel(s)}</option>)}</select></label>
      {admin && <label className="text-xs text-slate-600">{t('ads.sellerId')}<input type="number" min="1" className={inputClass} value={filters.seller_id} onChange={e => setFilters(f => ({ ...f, seller_id: e.target.value }))} /></label>}
      <label className="text-xs text-slate-600">{t('ads.productId')}<input type="number" min="1" className={inputClass} value={filters.product_id} onChange={e => setFilters(f => ({ ...f, product_id: e.target.value }))} /></label>
      <label className="text-xs text-slate-600">{t('ads.startsFrom')}<input type="date" className={inputClass} value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} /></label>
      <label className="text-xs text-slate-600">{t('ads.startsThrough')}<input type="date" min={filters.from || undefined} className={inputClass} value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} /></label>
      <button className="rounded-lg px-4 py-2 bg-blue-700 text-white self-end" disabled={loading}>{t('ads.applyFilters')}</button>
    </form>
    {error && <div role="alert" className="p-4 bg-red-50 text-red-800 rounded-lg">{error} <button className="underline" onClick={() => void load()}>{t('ads.retry')}</button></div>}
    <div className="overflow-auto rounded-xl border bg-white"><table className="w-full text-sm text-left"><thead className="bg-slate-50 text-slate-500"><tr>{['campaignProduct', 'statusPayment', 'dates', 'budgetRemaining', 'spend', 'impressions', 'clicksCtr', 'cpc', 'conversionsRevenue', 'roas', 'actions'].map(key => <th className="p-3 whitespace-nowrap" key={key}>{t(`ads.${key}`)}</th>)}</tr></thead>
      <tbody>{rows?.data.map(c => <tr key={c.id} className="border-t hover:bg-blue-50/30">
        <td className="p-3 min-w-44"><Link className="font-semibold text-blue-700 hover:underline" href={(admin ? '/ad-campaigns/' : '/boost-ads/') + c.id}>{c.name}</Link><p className="text-xs text-slate-500">{c.product?.name || t('ads.unavailableProduct')}{admin && c.seller ? ' · ' + c.seller.name : ''}</p></td>
        <td className="p-3 capitalize"><span className="bg-slate-100 rounded px-2 py-1 inline-block">{statusLabel(c.status)}</span><p className="text-xs mt-2">{paymentLabel(c.payment_status)}</p></td>
        <td className="p-3 text-xs whitespace-nowrap">{formatCampaignTime(c.starts_at)}<br />→ {formatCampaignTime(c.ends_at)}</td>
        <td className="p-3 whitespace-nowrap">{money(c.budget_cents)}<p className="text-xs">{money(c.remaining_cents)} {t('ads.remaining')}</p></td><td className="p-3">{money(c.spent_cents)}</td><td className="p-3">{c.impressions}</td><td className="p-3">{c.clicks}<p className="text-xs">{c.ctr}%</p></td><td className="p-3">{money(c.average_cpc_cents)}</td><td className="p-3">{c.conversions}<p className="text-xs">{money(c.revenue_cents)}</p></td><td className="p-3">{c.roas}×</td><td className="p-3 whitespace-nowrap"><Link className="inline-block rounded-lg border border-blue-700 px-3 py-2 text-blue-700 hover:bg-blue-50" href={(admin ? '/ad-campaigns/' : '/boost-ads/') + c.id}>{t('ads.viewDetails')}</Link>{!admin && <button type="button" disabled={deletingId === c.id} onClick={() => void remove(c)} className="mt-2 block rounded-lg border border-red-300 px-3 py-2 text-red-700 hover:bg-red-50 disabled:opacity-50">{deletingId === c.id ? t('ads.deleting') : t('ads.delete')}</button>}</td>
      </tr>)}</tbody></table>
      {loading && !rows && <p role="status" className="p-8 text-center">{t('ads.loadingCampaigns')}</p>}
      {rows?.data.length === 0 && <p className="p-8 text-center text-slate-500">{t('ads.noMatch')}</p>}
    </div>
    <div className="flex gap-4 justify-between items-center text-sm"><p>{t('ads.campaignCount', { count: rows?.total || 0 })}</p><div className="flex gap-4"><button disabled={page <= 1 || loading} onClick={() => setPage(p => p - 1)}>{t('ads.previous')}</button><span>{t('ads.pageOf', { page, last: rows?.last_page || 1 })}</span><button disabled={page >= (rows?.last_page || 1) || loading} onClick={() => setPage(p => p + 1)}>{t('ads.next')}</button></div></div>
  </div>;
}

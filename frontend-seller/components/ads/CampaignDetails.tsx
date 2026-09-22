'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { adService, browserTimezone, formatCampaignTime, money, label, terminal, adError, type Campaign, type Analytics, type BudgetTransaction, type Audit, type Metric, type Page } from '@/services/ad-service';
import { useLanguage } from '@/contexts/LanguageContext';

function MetricsTable({ rows, dimension }: { rows: Metric[]; dimension: 'day' | 'placement' | 'location' }) {
  const { t } = useLanguage();
  const dimensionLabel = dimension === 'day' ? t('ads.date') : dimension === 'placement' ? t('ads.byPlacement') : t('ads.byLocation');
  return <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr className="border-b text-slate-500">{[dimensionLabel, t('ads.impressions'), t('ads.clicksCtr'), t('ads.spend'), t('ads.conversions'), t('ads.attributedRevenue')].map(h => <th className="py-3 pr-4 capitalize" key={h}>{h}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={row[dimension]} className="border-b"><td className="py-3 pr-4 capitalize">{row[dimension]}</td><td>{row.impressions}</td><td>{row.clicks}</td><td>{money(row.spent_cents)}</td><td>{row.conversions}</td><td>{money(row.revenue_cents)}</td></tr>)}</tbody></table>{!rows.length && <p className="py-4 text-slate-500">{t('ads.noEvents')}</p>}</div>;
}

export default function CampaignDetails({ id, admin = false }: { id: number; admin?: boolean }) {
  const { t } = useLanguage();
  const copy = (key: string, fallback: string, variables?: Record<string, string | number>) => { const value = t(key, variables); return value === key ? fallback : value; };
  const valueLabel = (value?: string | null) => copy(`campaign.value.${value}`, label(value ?? '—'));
  const statusLabel = (value?: string | null) => copy(`ads.status.${value}`, valueLabel(value));
  const paymentLabel = (value?: string | null) => copy(`ads.payment.${value}`, valueLabel(value));
  const actionLabel = (value?: string | null) => copy(`ads.action.${value}`, valueLabel(value));
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
  if (!campaign) return <div><Link href={base}>← {t('ads.allCampaigns')}</Link><p className="p-6" role={error ? 'alert' : 'status'}>{error || t('ads.loadingCampaigns')}</p><button onClick={() => void load()}>{t('ads.retry')}</button></div>;
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
  const metricCards: [string, string | number][] = [
    [t('ads.campaignBudget'), money(c.budget_cents)], [t('ads.spent'), money(c.spent_cents)], [t('ads.remainingReservation'), money(c.remaining_cents)], [t('ads.returnedWallet'), money(c.released_cents)],
    [t('ads.budgetType'), money(c.budget_amount_cents) + (c.budget_type === 'daily' ? t('ads.perDay') : t('ads.total'))], [t('ads.cpcBid'), money(c.bid_cents)], [t('ads.impressions'), c.impressions], [t('ads.uniqueImpressions'), c.unique_impressions],
    [t('ads.clicksCtr'), c.clicks], [t('ads.conversionRate'), c.ctr + '%'], [t('ads.averageCpc'), money(c.average_cpc_cents)], [t('ads.productViews'), c.product_views],
    [t('ads.addToCarts'), c.add_to_carts], [t('ads.conversions'), c.conversions], [t('ads.conversionRate'), c.conversion_rate + '%'], [t('ads.attributedRevenue'), money(c.revenue_cents)], [t('ads.roas'), c.roas + '×'],
  ];
  return <div className="space-y-6 text-slate-900">
    <Link href={base} className="text-blue-700">← {t('ads.allCampaigns')}</Link>
    <div className="flex flex-wrap justify-between gap-4"><div><p className="text-sm text-slate-500">{t('ads.campaignNumber', { id: c.id })}{c.seller ? ' · ' + c.seller.name : ''}</p><h1 className="text-3xl font-bold">{c.name}</h1><p className="capitalize mt-2"><span className="inline-block bg-blue-100 text-blue-900 rounded-full px-3 py-1 mr-2">{statusLabel(c.status)}</span>{t('ads.paymentLabel', { status: paymentLabel(c.payment_status) })}</p></div>
      <div className="flex flex-wrap gap-2 items-start">{actions.map(action => <button key={action} disabled={busy} className="border border-slate-300 bg-white rounded-lg px-3 py-2 capitalize disabled:opacity-50" onClick={() => { setPendingAction(action); setReason(''); }}>{actionLabel(action)}</button>)}
        {!admin && terminal(c.status) && <Link className="bg-blue-700 text-white px-3 py-2 rounded-lg" href={'/boost-ads?duplicate=' + c.id}>{t('ads.duplicate')}</Link>}</div></div>
    {error && <p role="alert" className="bg-red-50 text-red-800 p-4 rounded-lg">{error}</p>}
    {pendingAction && <form className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3" onSubmit={e => { e.preventDefault(); void perform(pendingAction); }}>
      <h2 className="font-semibold capitalize">{t('ads.confirmAction', { action: actionLabel(pendingAction) })}</h2>
      <p className="text-sm">{pendingAction === 'pay' ? t('ads.confirmPay', { amount: money(c.budget_cents) }) : ['cancel', 'reject', 'terminate', 'refund'].includes(pendingAction) ? t('ads.confirmStop', { amount: money(c.remaining_cents) }) : pendingAction === 'pause' ? t('ads.confirmPause') : t('ads.confirmChecks')}</p>
      {admin && <label className="block text-sm">{t('ads.reason')}<textarea required minLength={3} maxLength={2000} value={reason} onChange={e => setReason(e.target.value)} className="block border rounded-lg p-2 mt-1 w-full" /></label>}
      <div className="flex gap-3"><button disabled={busy} className="bg-blue-700 text-white px-4 py-2 rounded-lg">{busy ? t('ads.processing') : t('ads.confirmAction', { action: actionLabel(pendingAction) })}</button><button type="button" disabled={busy} onClick={() => setPendingAction('')}>{t('ads.back')}</button></div>
    </form>}
    {c.rejection_reason && <p className="p-4 bg-red-50 rounded-lg">{t('ads.rejectionReason', { reason: c.rejection_reason })}</p>}
    {c.status === 'legacy_review' && <div className="p-4 bg-amber-50 rounded-lg"><p>{t('ads.legacyNotice')}</p>{admin && <pre className="text-xs overflow-auto mt-2">{JSON.stringify(c.legacy_snapshot, null, 2)}</pre>}</div>}
    {c.status === 'reconciliation_hold' && <p className="p-4 bg-amber-50 rounded-lg">{t('ads.reconciliationNotice')}</p>}
    <div className="grid md:grid-cols-3 gap-4 bg-white border rounded-xl p-5">
      <div><p className="text-slate-500 text-sm">{t('ads.product')}</p><p className="font-semibold">{c.product?.name || t('ads.unavailableProduct')} (#{c.product_id})</p><p className="text-sm">{c.product ? '€' + Number(c.product.price).toFixed(2) + ' · ' + t('ads.stock', { count: c.product.stock_quantity }) + ' · ' + (c.product.is_approved ? t('ads.approved') : t('ads.notApproved')) : ''}</p></div>
      <div><p className="text-slate-500 text-sm">{t('ads.campaignDates')}</p><p>{formatCampaignTime(c.starts_at)} → {formatCampaignTime(c.ends_at)}</p><p className="text-xs text-slate-500">{t('ads.scheduledIn', { timezone: c.schedule_timezone || 'UTC', browserTimezone: browserTimezone() })}</p></div>
      <div><p className="text-slate-500 text-sm">{t('ads.targetingPlacements')}</p><p>{c.locations.join(', ') || t('ads.unverified')}</p><p className="capitalize">{c.placements.map(valueLabel).join(', ') || t('ads.unverified')}</p></div>
      <div><p className="text-slate-500 text-sm">{t('ads.paymentSource')}</p><p className="font-semibold">{c.funding_source === 'seller_wallet' ? t('ads.sellerWallet') : t('ads.legacyWallet')}</p><p className="text-xs text-slate-500">{c.funding_source === 'seller_wallet' ? t('ads.walletDescription') : t('ads.legacyWalletDescription')}</p></div>
    </div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{metricCards.map(([key, value]) => <div key={key} className="bg-white rounded-xl border p-4"><p className="text-xs text-slate-500">{key}</p><p className="text-lg font-semibold mt-1">{value}</p></div>)}</div>
    <div className="flex gap-3 border-b">{['analytics', 'transactions', ...(admin ? ['audit history'] : [])].map(name => <button key={name} onClick={() => setTab(name)} className={'px-3 py-3 capitalize ' + (tab === name ? 'border-b-2 border-blue-700 text-blue-700' : '')}>{name === 'analytics' ? t('ads.analytics') : name === 'transactions' ? t('ads.transactions') : t('ads.auditHistory')}</button>)}</div>
    <div className="bg-white rounded-xl border p-5">
      {tab === 'analytics' && analytics && <div className="space-y-6"><p className="text-sm text-slate-500">{t('ads.lastClick', { days: analytics.attribution_window_days })}</p><div><h2 className="font-semibold">{t('ads.dailyPerformance')}</h2><MetricsTable rows={analytics.daily} dimension="day" /></div><div><h2 className="font-semibold">{t('ads.byPlacement')}</h2><MetricsTable rows={analytics.placements} dimension="placement" /></div><div><h2 className="font-semibold">{t('ads.byLocation')}</h2><MetricsTable rows={analytics.locations} dimension="location" /></div></div>}
      {tab === 'transactions' && <div className="overflow-auto"><table className="w-full text-sm text-left"><thead><tr>{[t('ads.date'), t('ads.type'), t('ads.amount'), t('ads.reserveAfter'), t('ads.wallet'), t('ads.destination')].map(h => <th key={h} className="pb-3 pr-4">{h}</th>)}</tr></thead><tbody>{transactions?.data.map(tx => <tr key={tx.id} className="border-t"><td className="py-3">{new Date(tx.created_at).toLocaleString()}</td><td className="capitalize">{valueLabel(tx.type)}</td><td>{money(tx.amount_cents)}</td><td>{money(tx.balance_after_cents)}</td><td className="text-xs">{tx.metadata?.wallet_balance_before_cents !== undefined && <>{t('ads.before')} {money(Number(tx.metadata.wallet_balance_before_cents))}<br /></>} {tx.metadata?.wallet_balance_after_cents !== undefined && <>{t('ads.after')} {money(Number(tx.metadata.wallet_balance_after_cents))}</>} {tx.metadata?.wallet_ad_reserve_after_cents !== undefined && <>{t('ads.adsReserve')} {money(Number(tx.metadata.wallet_ad_reserve_after_cents))}</>}</td><td className="text-xs">{String(tx.metadata?.funds_destination || tx.metadata?.funding_source || '—').replaceAll('_', ' ')}</td></tr>)}</tbody></table><div className="flex gap-4 pt-4"><button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>{t('ads.previousPage')}</button><span>{t('ads.page', { page, last: transactions?.last_page || 1 })}</span><button disabled={page >= (transactions?.last_page || 1)} onClick={() => setPage(p => p + 1)}>{t('ads.nextPage')}</button></div></div>}
      {tab === 'audit history' && <div className="space-y-3">{audits?.data.map(a => <div key={a.id} className="border-b pb-3"><p className="font-medium capitalize">{valueLabel(a.action)}: {valueLabel(a.from_status || 'new')} → {valueLabel(a.to_status)}</p><p className="text-sm">{a.reason || t('campaigns.noReason')}</p><p className="text-xs text-slate-500">{new Date(a.created_at).toLocaleString()} · {a.actor_id ? t('ads.userNumber', { id: a.actor_id }) : t('ads.system')}</p></div>)}<div className="flex gap-4"><button disabled={auditPage <= 1} onClick={() => setAuditPage(p => p - 1)}>{t('ads.previousPage')}</button><span>{t('ads.page', { page: auditPage, last: audits?.last_page || 1 })}</span><button disabled={auditPage >= (audits?.last_page || 1)} onClick={() => setAuditPage(p => p + 1)}>{t('ads.nextPage')}</button></div></div>}
    </div>
  </div>;
}

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '@/lib/api-client';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { statusKey, useLanguage } from '@/contexts/LanguageContext';

type Kind = 'discount' | 'banner';
type Creative = { desktop_url?: string; title?: string; description?: string; alt_text?: string; cta_text?: string };
type Campaign = { id: number; name: string; description?: string; status: string; approval_status?: string; rejection_reason?: string; scope?: string; discount_type?: string; discount_value?: number; starts_at: string; ends_at: string; schedule_timezone?: string; priority?: number; placement?: string; creatives?: Creative[]; analytics?: Record<string, number | string | null> };
type Audit = { id: number; action: string; reason?: string; created_at: string; snapshot: string };

const placements = ['homepage_hero', 'homepage_featured', 'category_page', 'store_page', 'sidebar'];
const browserTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

function instant(value: string | Date) {
  if (value instanceof Date) return value;
  const normalized = value.trim().replace(' ', 'T');
  return new Date(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized) ? normalized : `${normalized}Z`);
}

function schedule(value: string | undefined, timezone: string, locale: string) {
  if (!value) return '—';
  try {
    return `${new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: timezone }).format(instant(value))} (${timezone})`;
  } catch {
    return `${instant(value).toLocaleString(locale)} (${timezone})`;
  }
}

function Button({ children, onClick, tone = 'secondary', disabled = false }: { children: React.ReactNode; onClick?: () => void; tone?: 'primary' | 'secondary' | 'danger' | 'ghost'; disabled?: boolean }) {
  const styles = { primary: 'bg-blue-700 text-white hover:bg-blue-800', secondary: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50', danger: 'bg-rose-600 text-white hover:bg-rose-700', ghost: 'text-blue-700 hover:bg-blue-50' };
  return <button type="button" disabled={disabled} onClick={onClick} className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${styles[tone]}`}>{children}</button>;
}

function Modal({ title, children, onClose, closeLabel }: { title: string; children: React.ReactNode; onClose: () => void; closeLabel: string }) {
  return <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/45 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}><section className="max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"><header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-5 py-4 sm:px-7"><div><h2 className="text-xl font-bold text-slate-900">{title}</h2></div><Button tone="ghost" onClick={onClose}>{closeLabel}</Button></header><div className="p-5 sm:p-7">{children}</div></section></div>;
}

export default function CampaignManager({ kind }: { kind: Kind; role?: 'admin' }) {
  const { t, language } = useLanguage();
  const banner = kind === 'banner';
  const base = `/admin/${kind}-campaigns`;
  const locale = language === 'it' ? 'it-IT' : 'en-GB';
  const timezone = browserTimezone();
  const [rows, setRows] = useState<Campaign[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [status, setStatus] = useState('');
  const [approval, setApproval] = useState('');
  const [placement, setPlacement] = useState('');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [details, setDetails] = useState<Campaign | null>(null);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [usage, setUsage] = useState<{ id: number; order_id: number; units: number; revenue: number; discount_amount: number }[]>([]);
  const [reason, setReason] = useState('');

  const translateValue = (value?: string | null) => {
    if (!value) return t('notAvailable');
    const normalized = value.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const keys = [`action_${normalized}`, statusKey(value), `placement_${normalized}`, `campaignScope_${normalized}`, `discountType_${normalized}`, `metric_${normalized}`];
    for (const key of keys) {
      const translated = t(key);
      if (translated !== key) return translated;
    }
    return value.replaceAll('_', ' ').replace(/\b\w/g, character => character.toUpperCase());
  };

  const errorText = (requestError: unknown) => {
    const data = (requestError as { response?: { data?: { errors?: Record<string, string[]> } } })?.response?.data;
    return data?.errors ? Object.values(data.errors).flat().join(' ') : t('requestFailed');
  };

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const response = await api.get(base, { params: { page, status: status || undefined, approval_status: approval || undefined, placement: placement || undefined, search: search || undefined } });
      setRows(response.data.data.data);
      setLastPage(response.data.data.last_page);
      setError('');
    } catch (requestError) {
      setError(errorText(requestError));
    } finally {
      setBusy(false);
    }
  }, [approval, base, page, placement, search, status, language]);

  useEffect(() => { void load(); }, [load]);
  useLiveRefresh(load);

  const inspect = async (campaign: Campaign) => {
    setBusy(true); setError('');
    try {
      const [detail, audit, metric] = await Promise.all([api.get(`${base}/${campaign.id}`), api.get(`${base}/${campaign.id}/audits`), api.get(`${base}/${campaign.id}/analytics`)]);
      setDetails(detail.data.data); setAudits(audit.data.data.data); setUsage(metric.data.data.usage?.data ?? []); setReason('');
    } catch (requestError) { setError(errorText(requestError)); } finally { setBusy(false); }
  };

  const actions = useMemo(() => (campaign: Campaign) => {
    if (banner) {
      if (campaign.approval_status === 'pending') return campaign.status === 'paused' ? ['approve', 'reject', 'delete'] : ['approve', 'reject', 'pause', 'delete'];
      if (campaign.status === 'paused' && campaign.approval_status === 'approved') return ['resume', 'delete'];
      if (['active', 'scheduled'].includes(campaign.status)) return ['pause', 'delete'];
      return ['delete'];
    }
    if (campaign.status === 'paused') return ['resume', 'delete'];
    if (['active', 'scheduled'].includes(campaign.status)) return ['pause', 'delete'];
    return ['delete'];
  }, [banner]);

  const act = async (action: string) => {
    if (!details) return;
    setBusy(true); setError('');
    try { await api.post(`${base}/${details.id}/actions`, { action, reason }); setNotice(t('actionCompleted', { action: translateValue(action) })); setDetails(null); await load(); }
    catch (requestError) { setError(errorText(requestError)); } finally { setBusy(false); }
  };

  const quickAction = async (campaign: Campaign, action: string) => {
    const actionReason = action === 'reject' ? window.prompt(t('giveRejectionReason')) ?? '' : '';
    if (action === 'reject' && !actionReason.trim()) return;
    setBusy(true); setError('');
    try { await api.post(`${base}/${campaign.id}/actions`, { action, reason: actionReason }); setNotice(t('actionCompleted', { action: translateValue(action) })); await load(); }
    catch (requestError) { setError(errorText(requestError)); } finally { setBusy(false); }
  };

  const requiresReason = (action: string) => ['reject', 'terminate'].includes(action);
  const discountText = (campaign: Campaign) => campaign.discount_type === 'percentage' ? `${campaign.discount_value}% ${t('discount')}` : `€${campaign.discount_value} ${t('discount')}`;

  return <div className="space-y-6 text-slate-900">
    <section className="rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 p-6 text-white shadow-sm sm:p-8"><p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-200">{t('administration')}</p><h1 className="mt-2 text-3xl font-bold">{banner ? t('promotionalBannerReview') : t('discountCampaignControl')}</h1><p className="mt-2 max-w-2xl text-slate-300">{t('campaignReviewDescription')}</p></section>
    {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800">{error}</div>}
    {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">{notice}</div>}
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-wrap gap-3"><input aria-label={t('campaignSearch')} value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder={t('campaignSearch')} className="min-w-52 flex-1 rounded-lg border border-slate-300 px-3 py-2" /><select aria-label={t('status')} value={status} onChange={event => { setStatus(event.target.value); setPage(1); }} className="rounded-lg border border-slate-300 px-3 py-2"><option value="">{t('allStatuses')}</option>{['draft', 'scheduled', 'active', 'paused', 'expired', 'cancelled', 'completed'].map(value => <option key={value} value={value}>{translateValue(value)}</option>)}</select>{banner && <><select aria-label={t('approval')} value={approval} onChange={event => { setApproval(event.target.value); setPage(1); }} className="rounded-lg border border-slate-300 px-3 py-2"><option value="">{t('allApprovals')}</option>{['pending', 'approved', 'rejected'].map(value => <option key={value} value={value}>{translateValue(value)}</option>)}</select><select aria-label={t('placement')} value={placement} onChange={event => { setPlacement(event.target.value); setPage(1); }} className="rounded-lg border border-slate-300 px-3 py-2"><option value="">{t('allPlacements')}</option>{placements.map(value => <option key={value} value={value}>{translateValue(value)}</option>)}</select></>}</div></section>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-4">{t('campaign')}</th><th className="px-5 py-4">{t('scopePlacement')}</th><th className="px-5 py-4">{t('scheduledBrowserTimezone')}</th><th className="px-5 py-4">{t('status')}</th><th className="px-5 py-4">{t('performance')}</th><th className="px-5 py-4 text-right">{t('review')}</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map(campaign => <tr key={campaign.id} className="hover:bg-slate-50/70"><td className="px-5 py-4"><p className="font-semibold">{campaign.name}</p><p className="mt-1 max-w-xs truncate text-slate-500">{campaign.description || t('noDescription')}</p></td><td className="px-5 py-4"><p>{translateValue(campaign.scope || campaign.placement)}</p><p className="mt-1 text-xs text-slate-500">{banner ? t('approvalPrefix', { value: translateValue(campaign.approval_status) }) : discountText(campaign)}</p></td><td className="px-5 py-4 text-slate-600"><p>{schedule(campaign.starts_at, timezone, locale)}</p><p className="mt-1 text-xs">{t('campaignEnds')}: {schedule(campaign.ends_at, timezone, locale)}</p></td><td className="px-5 py-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold">{translateValue(campaign.status)}</span></td><td className="px-5 py-4 text-slate-600">{campaign.analytics?.orders ?? campaign.analytics?.impressions ?? 0} {t('eventCount')}</td><td className="px-5 py-4 text-right"><div className="flex flex-wrap justify-end gap-2"><Button tone="ghost" onClick={() => void inspect(campaign)}>{t('details')}</Button>{actions(campaign).map(action => <Button key={action} tone={action === 'delete' || action === 'cancel' ? 'danger' : action === 'approve' ? 'primary' : 'secondary'} disabled={busy} onClick={() => void quickAction(campaign, action)}>{translateValue(action)}</Button>)}</div></td></tr>)}</tbody></table></div>{!rows.length && <div className="p-10 text-center text-slate-500">{busy ? t('loadingCampaigns') : t('noCampaignsFilters')}</div>}<footer className="flex items-center justify-between border-t border-slate-100 px-5 py-4"><span className="text-sm text-slate-500">{t('pageLabel', { page, last: lastPage })}</span><div className="flex gap-2"><Button disabled={page <= 1 || busy} onClick={() => setPage(value => value - 1)}>{t('previous')}</Button><Button disabled={page >= lastPage || busy} onClick={() => setPage(value => value + 1)}>{t('next')}</Button></div></footer></section>
    {details && <Modal title={`${details.name} — ${t('campaignDetailsAnalyticsActions')}`} closeLabel={t('close')} onClose={() => setDetails(null)}><div className="space-y-6"><section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs uppercase text-slate-500">{t('campaignStatusLabel')}</p><p className="mt-1 font-semibold">{translateValue(details.status)}</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs uppercase text-slate-500">{t('campaignStarts')}</p><p className="mt-1 font-semibold">{schedule(details.starts_at, timezone, locale)}</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs uppercase text-slate-500">{t('campaignEnds')}</p><p className="mt-1 font-semibold">{schedule(details.ends_at, timezone, locale)}</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs uppercase text-slate-500">{banner ? t('campaignApproval') : t('campaignDiscount')}</p><p className="mt-1 font-semibold">{banner ? translateValue(details.approval_status) : `${discountText(details)} · ${t('priority')} ${details.priority}`}</p></div></section>{banner && details.creatives?.[0] && <section className="grid gap-4 sm:grid-cols-[240px_1fr]"><img src={details.creatives[0].desktop_url} className="max-h-48 w-full rounded-xl object-cover" alt={details.creatives[0].alt_text || ''} /><div><h3 className="font-bold">{details.creatives[0].title}</h3><p className="mt-2 text-slate-600">{details.creatives[0].description}</p><p className="mt-3 text-sm text-slate-500">{t('cta')}: {details.creatives[0].cta_text}</p></div></section>}<section><h3 className="mb-3 text-lg font-bold">{t('analytics')}</h3><div className="grid gap-3 sm:grid-cols-3">{Object.entries(details.analytics ?? {}).filter(([, value]) => typeof value === 'number').map(([key, value]) => <div key={key} className="rounded-xl border border-slate-200 p-4"><p className="text-xs uppercase text-slate-500">{translateValue(key)}</p><p className="mt-1 text-xl font-bold">{value ?? 0}</p></div>)}</div></section>{usage.length > 0 && <section><h3 className="mb-3 text-lg font-bold">{t('orderUsage')}</h3>{usage.map(item => <p className="border-b py-2 text-sm" key={item.id}>{t('order')} #{item.order_id} · {item.units} {t('units')} · €{item.revenue} {t('revenue').toLowerCase()} · €{item.discount_amount} {t('discount').toLowerCase()}</p>)}</section>}<section><h3 className="mb-3 text-lg font-bold">{t('auditHistory')}</h3><div className="space-y-2">{audits.map(audit => { let snapshot: Partial<Campaign> = {}; try { snapshot = JSON.parse(audit.snapshot); } catch { /* malformed historical snapshot */ } return <details className="rounded-xl border border-slate-200 p-3" key={audit.id}><summary className="cursor-pointer font-medium">{t('auditAction')}: {schedule(audit.created_at, timezone, locale)} · {translateValue(audit.action)}</summary><p className="mt-2 text-sm text-slate-600">{audit.reason || t('noReasonSupplied')}</p>{snapshot.starts_at && <p className="mt-1 text-sm text-slate-500">{t('campaignSchedule')}: {schedule(snapshot.starts_at, timezone, locale)} → {schedule(snapshot.ends_at, timezone, locale)}</p>}</details>; })}</div></section><section className="border-t pt-5"><label className="grid gap-1.5 text-sm font-medium text-slate-700">{t('reasonReviewActions')}<textarea value={reason} onChange={event => setReason(event.target.value)} placeholder={t('campaignReasonPlaceholder')} className="min-h-20 rounded-lg border border-slate-300 px-3 py-2.5" /></label><div className="mt-4 flex flex-wrap gap-2">{actions(details).map(action => <Button key={action} tone={action === 'delete' || action === 'cancel' || action === 'terminate' ? 'danger' : action === 'approve' ? 'primary' : 'secondary'} disabled={busy || (requiresReason(action) && !reason.trim())} onClick={() => void act(action)}>{translateValue(action)}</Button>)}</div></section></div></Modal>}
  </div>;
}

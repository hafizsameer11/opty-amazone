'use client';

import { useEffect, useRef, useState } from 'react';
import { adService, adError, browserTimezone, money, label, utcFromZonedInput, type CampaignDraft, type AdProduct, type AdOptions, type Campaign } from '@/services/ad-service';
import { getApiOrigin } from '@/lib/api-client';
import { useLanguage } from '@/contexts/LanguageContext';

const inputClass = 'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 bg-white';
const buttonClass = 'rounded-lg bg-blue-700 text-white px-4 py-2 disabled:opacity-50';
const localDate = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const toggle = (values: string[], value: string) => values.includes(value) ? values.filter(v => v !== value) : [...values, value];
export default function BoostWizard({ initial, onClose, onCreated }: {
  initial?: Partial<CampaignDraft>; onClose: () => void; onCreated: (campaign: Campaign) => void;
}) {
  const { t } = useLanguage();
  const copy = (key: string, fallback: string, variables?: Record<string, string | number>) => { const value = t(key, variables); return value === key ? fallback : value; };
  const placementLabel = (value: string) => copy(`campaign.value.${value}`, label(value));
  const dialog = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState(0); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const [options, setOptions] = useState<AdOptions | null>(null); const [search, setSearch] = useState(''); const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AdProduct | null>(null); const [confirmed, setConfirmed] = useState(false);
  const [timezone] = useState(browserTimezone);
  const [draft, setDraft] = useState<CampaignDraft>(() => ({ product_id: 0, name: '', starts_at: localDate(new Date(Date.now() + 300000)),
    ends_at: localDate(new Date(Date.now() + 7 * 86400000)), budget_type: 'total', budget_amount: '10.00',
    bid_type: 'cpc', bid_amount: '0.50', placements: ['homepage'], locations: ['global'], schedule_timezone: timezone, launch_mode: 'run_now', ...initial }));
  const pending = useRef<{ draft: CampaignDraft; key: string } | null>(null);
  const [locked, setLocked] = useState(false);
  useEffect(() => { dialog.current?.showModal(); }, []);
  useEffect(() => {
    let alive = true;
    const timer = setTimeout(() => {
      adService.options(search, page).then(data => { if (alive) { setOptions(data); setError(''); } }).catch(e => { if (alive) setError(adError(e)); });
    }, 200);
    return () => { alive = false; clearTimeout(timer); };
  }, [search, page]);
  const update = <K extends keyof CampaignDraft>(key: K, value: CampaignDraft[K]) => setDraft(d => ({ ...d, [key]: value }));
  const scheduledStart = utcFromZonedInput(draft.starts_at, timezone);
  const start = draft.launch_mode === 'run_now' ? new Date() : scheduledStart;
  const end = utcFromZonedInput(draft.ends_at, timezone);
  const dayCount = Number.isFinite(start.getTime()) && Number.isFinite(end.getTime()) ? Math.floor((end.getTime() - 1) / 86400000) - Math.floor(start.getTime() / 86400000) + 1 : 0;
  const amount = Math.round(Number(draft.budget_amount) * 100);
  const reserve = draft.budget_type === 'daily' ? amount * Math.max(0, dayCount) : amount;
  const available = options?.seller_wallet_available_cents || 0;
  const validDates = end > start && dayCount > 0 && dayCount <= 90;
  const close = () => { if (!busy) onClose(); };
  async function submit() {
    setBusy(true); setError(''); setLocked(true);
    if (!pending.current) pending.current = { draft: { ...draft, starts_at: scheduledStart.toISOString(), ends_at: end.toISOString(), schedule_timezone: timezone }, key: crypto.randomUUID() };
    try { onCreated(await adService.create(pending.current.draft, pending.current.key)); }
    catch (e) {
      setError(adError(e));
      const status = (e as { response?: { status?: number } }).response?.status;
      if (status && status >= 400 && status < 500) { pending.current = null; setLocked(false); }
    } finally { setBusy(false); }
  }
  const image = selected?.images?.[0];
  return <dialog ref={dialog} onCancel={e => { e.preventDefault(); close(); }} aria-labelledby="boost-title" className="seller-mobile-sheet fixed inset-x-0 bottom-0 top-auto m-0 h-fit max-h-[92dvh] w-full max-w-none rounded-t-3xl border-0 p-0 backdrop:bg-black/50 shadow-xl sm:inset-0 sm:m-auto sm:w-[min(95vw,760px)] sm:rounded-2xl">
    <div className="flex items-center justify-between border-b p-4 sm:p-5"><span className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-slate-200 sm:hidden" /><h2 id="boost-title" className="min-w-0 truncate text-lg font-bold sm:text-xl">{t('ads.wizardTitle')}</h2><button aria-label={t('ads.close')} disabled={busy} onClick={close} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100">✕</button></div>
    <div className="max-h-[calc(92dvh-4.5rem)] overflow-y-auto p-4 sm:max-h-[80vh] sm:p-5">
      <ol className="mb-5 grid grid-cols-4 gap-1 text-center text-[10px] sm:mb-6 sm:flex sm:gap-2 sm:text-xs">{['ads.stepProduct', 'ads.stepBudget', 'ads.stepTargeting', 'ads.stepReview'].map((key, i) => <li key={key} aria-current={step === i ? 'step' : undefined} className={`min-w-0 rounded-lg p-2 ${step === i ? 'bg-blue-700 text-white' : 'bg-slate-100'}`}><span className="font-bold">{i + 1}</span><span className="hidden sm:inline">. {t(key)}</span></li>)}</ol>
      {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-red-800">{error}</p>}
      {!options && !error && <p role="status">{t('ads.loadingOptions')}</p>}
      <form onSubmit={e => { e.preventDefault(); if (step === 3) { void submit(); } else setStep(s => s + 1); }}>
        {step === 0 && <div className="space-y-4">
          <p className="text-sm text-slate-600">{t('ads.chooseProduct')}</p>
          <label className="block text-sm">{t('ads.searchProducts')}<input aria-label={t('ads.searchProducts')} className={inputClass} value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /></label>
          <div className="max-h-72 overflow-auto space-y-2">{options?.products.data.map(p => <label key={p.id} className={`flex gap-3 items-center p-3 rounded-lg border cursor-pointer ${draft.product_id === p.id ? 'border-blue-600 bg-blue-50' : 'border-slate-200'}`}>
            <input type="radio" name="product" checked={draft.product_id === p.id} onChange={() => { update('product_id', p.id); setSelected(p); }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {p.images?.[0] && <img alt="" src={/^https?:/.test(p.images[0]) ? p.images[0] : getApiOrigin() + '/' + p.images[0].replace(/^\//, '')} className="h-14 w-16 object-contain bg-white rounded" />}
            <span><span className="font-semibold block">{p.name}</span><span className="text-xs text-slate-600">€{Number(p.price).toFixed(2)} · {t('ads.stock', { count: p.stock_quantity })} · {t('ads.approved')}</span></span>
          </label>)}</div>
          {options?.products.data.length === 0 && <p className="text-sm">{t('ads.noProducts')}</p>}
          <div className="flex gap-3"><button type="button" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>{t('ads.previous')}</button><span>{t('ads.pageOf', { page, last: options?.products.last_page || 1 })}</span><button type="button" disabled={page >= (options?.products.last_page || 1)} onClick={() => setPage(p => p + 1)}>{t('ads.next')}</button></div>
          {draft.product_id > 0 && <p className="text-sm text-blue-800">{t('ads.selectedProduct', { id: draft.product_id })}{selected ? ': ' + selected.name : ' — ' + t('ads.selectProductHint')}</p>}
        </div>}
        {step === 1 && <div className="grid sm:grid-cols-2 gap-4">
          <label className="sm:col-span-2 text-sm">{t('ads.campaignName')}<input className={inputClass} required maxLength={120} value={draft.name} onChange={e => update('name', e.target.value)} /></label>
          <fieldset className="sm:col-span-2 rounded-xl border border-blue-200 bg-blue-50 p-4"><legend className="px-1 font-semibold text-blue-950">{t('ads.whenStart')}</legend><div className="mt-2 flex flex-wrap gap-4"><label className="flex items-center gap-2 text-sm"><input type="radio" checked={draft.launch_mode === 'run_now'} onChange={() => update('launch_mode', 'run_now')} />{t('ads.runAfterApproval')}</label><label className="flex items-center gap-2 text-sm"><input type="radio" checked={draft.launch_mode === 'schedule'} onChange={() => update('launch_mode', 'schedule')} />{t('ads.scheduleStart')}</label></div><p className="mt-2 text-xs text-blue-900">{t('ads.runPaidHint')}</p></fieldset>
          {draft.launch_mode === 'schedule' && <label className="text-sm">{t('ads.startDateTime')}<input className={inputClass} type="datetime-local" required value={draft.starts_at} onChange={e => update('starts_at', e.target.value)} /></label>}
          <label className="text-sm">{t('ads.endDateTime')}<input className={inputClass} type="datetime-local" required min={draft.starts_at} value={draft.ends_at} onChange={e => update('ends_at', e.target.value)} /></label>
          <label className="text-sm">{t('ads.budgetTypeLabel')}<select className={inputClass} value={draft.budget_type} onChange={e => update('budget_type', e.target.value as 'daily' | 'total')}><option value="total">{t('ads.totalBudget')}</option><option value="daily">{t('ads.dailyBudget')}</option></select></label>
          <label className="text-sm">{t('ads.budgetAmount')}<input className={inputClass} required type="number" min="1" max="100000" step="0.01" value={draft.budget_amount} onChange={e => update('budget_amount', e.target.value)} /></label>
          <label className="text-sm">{t('ads.bidding')}<select className={inputClass} value="cpc" disabled><option value="cpc">{t('ads.cpcCost')}</option></select></label>
          <label className="text-sm">{t('ads.maxCpc')}<input className={inputClass} required type="number" min="0.01" max={draft.budget_amount} step="0.01" value={draft.bid_amount} onChange={e => update('bid_amount', e.target.value)} /></label>
          <p className="sm:col-span-2 text-sm text-slate-600"><strong>{t('ads.scheduleTimezone', { timezone })}</strong>. {t('ads.schedulerHint', { days: dayCount, reserve: money(reserve) })}</p>
          {(!validDates || reserve > 10000000) && <p className="text-sm text-red-700">{t('ads.validPeriod')}</p>}
        </div>}
        {step === 2 && <div className="space-y-5">
          <fieldset><legend className="font-semibold mb-2">{t('ads.locations')}</legend><label className="flex gap-2"><input type="checkbox" checked={draft.locations.includes('global')} onChange={e => update('locations', e.target.checked ? ['global'] : [])} />{t('ads.globalBuyers')}</label>
            <div className="grid grid-cols-2 gap-2 mt-3 max-h-48 overflow-auto">{options?.locations.map(l => <label key={l.code} className="flex gap-2 text-sm"><input type="checkbox" checked={draft.locations.includes(l.code)} onChange={() => update('locations', toggle(draft.locations.filter(v => v !== 'global'), l.code))} />{l.name}</label>)}</div>
            <p className="text-xs text-slate-500 mt-2">{t('ads.countryHint')}</p>
          </fieldset>
          <fieldset><legend className="font-semibold mb-2">{t('ads.placements')}</legend><div className="grid grid-cols-2 gap-3">{options?.placements.map(p => <label className="flex gap-2 capitalize" key={p}><input type="checkbox" checked={draft.placements.includes(p)} onChange={() => update('placements', toggle(draft.placements, p))} />{placementLabel(p)}</label>)}</div></fieldset>
        </div>}
        {step === 3 && <div className="space-y-4">
          {selected && <div className="flex gap-3 items-center bg-slate-50 p-3 rounded-lg">
            {image && <>
              {/* The eligible-product API allows seller-hosted image URLs. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="" src={/^https?:/.test(image) ? image : getApiOrigin() + '/' + image.replace(/^\//, '')} className="w-20 h-16 object-contain" />
            </>}
            <div><p className="font-semibold">{selected.name}</p><p className="text-sm">€{Number(selected.price).toFixed(2)} · {t('ads.stock', { count: selected.stock_quantity })} · {t('ads.approved')}</p></div>
          </div>}
          <dl className="grid grid-cols-2 gap-3 text-sm">{[
            [t('ads.campaignName'), draft.name], [t('ads.schedule'), draft.launch_mode === 'run_now' ? t('ads.immediateAfterApproval') : scheduledStart.toLocaleString() + ' → ' + end.toLocaleString()], [t('ads.endDateTime'), draft.launch_mode === 'run_now' ? end.toLocaleString() : t('ads.includedAbove')], [t('ads.budgetType'), money(amount) + (draft.budget_type === 'daily' ? t('ads.perUtcDay') : t('ads.total'))],
            [t('ads.costPerClick'), t('ads.upTo') + ' €' + Number(draft.bid_amount).toFixed(2)], [t('ads.locations'), draft.locations.map(value => value === 'global' ? t('ads.globalBuyers') : value).join(', ')], [t('ads.placements'), draft.placements.map(placementLabel).join(', ')],
            [t('ads.reserveNow'), money(reserve)], [t('ads.walletAvailable'), money(available)], [t('ads.adsReserved'), money(options?.seller_wallet_ad_reserved_cents || 0)],
            [t('ads.paymentSourceLabel'), t('ads.sellerWallet')],
          ].map(([k, v]) => <div key={String(k)}><dt className="text-slate-500">{k}</dt><dd className="font-medium break-words">{v}</dd></div>)}</dl>
          <p className="text-sm p-3 rounded bg-blue-50">{options?.review_required ? (draft.launch_mode === 'run_now' ? t('ads.afterReservationAdmin') : t('ads.afterReservationReview')) : (draft.launch_mode === 'run_now' ? t('ads.afterReservationImmediate') : t('ads.afterReservationScheduled'))} {t('ads.pauseHint')}</p>
          {reserve > available && <p className="text-sm text-amber-800 bg-amber-50 p-3">{t('ads.walletShort', { amount: money(reserve - available) })}</p>}
          <label className="flex gap-3 text-sm"><input type="checkbox" checked={confirmed} disabled={locked} onChange={e => setConfirmed(e.target.checked)} required /><span>{t('ads.authorize', { amount: money(reserve) })}</span></label>
          {locked && !busy && <p className="text-sm">{t('ads.retryHint')}</p>}
        </div>}
        <div className="mt-6 flex justify-between border-t pt-4"><button type="button" disabled={busy || locked} onClick={() => step ? setStep(s => s - 1) : close()}>{step ? t('ads.backButton') : t('ads.cancelButton')}</button>
          <button type="submit" className={buttonClass} disabled={busy || !options || (step === 0 && !selected) || (step === 1 && (!validDates || reserve > 10000000)) || (step === 2 && (!draft.locations.length || !draft.placements.length)) || (step === 3 && (!confirmed || reserve > available))}>
            {busy ? t('ads.reserving') : step === 3 ? (locked ? t('ads.retryReservation') : t('ads.confirmReserve', { amount: money(reserve) })) : t('ads.continue')}
          </button></div>
      </form>
    </div>
  </dialog>;
}

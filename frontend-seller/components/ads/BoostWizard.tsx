'use client';

import { useEffect, useRef, useState } from 'react';
import { adService, adError, browserTimezone, money, label, utcFromZonedInput, type CampaignDraft, type AdProduct, type AdOptions, type Campaign } from '@/services/ad-service';
import { getApiOrigin } from '@/lib/api-client';

const inputClass = 'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 bg-white';
const buttonClass = 'rounded-lg bg-blue-700 text-white px-4 py-2 disabled:opacity-50';
const localDate = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const toggle = (values: string[], value: string) => values.includes(value) ? values.filter(v => v !== value) : [...values, value];
export default function BoostWizard({ initial, onClose, onCreated }: {
  initial?: Partial<CampaignDraft>; onClose: () => void; onCreated: (campaign: Campaign) => void;
}) {
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
  return <dialog ref={dialog} onCancel={e => { e.preventDefault(); close(); }} aria-labelledby="boost-title" className="fixed inset-0 m-auto h-fit max-h-[90dvh] w-[min(95vw,760px)] rounded-2xl p-0 backdrop:bg-black/50 shadow-xl">
    <div className="p-5 border-b flex justify-between items-center"><h2 id="boost-title" className="text-xl font-bold">Boost Product</h2><button aria-label="Close campaign wizard" disabled={busy} onClick={close} className="p-2">✕</button></div>
    <div className="p-5 max-h-[80vh] overflow-y-auto">
      <ol className="flex gap-2 text-xs mb-6">{['Product', 'Budget & dates', 'Targeting', 'Review & pay'].map((name, i) => <li key={name} aria-current={step === i ? 'step' : undefined} className={`flex-1 rounded-lg p-2 ${step === i ? 'bg-blue-700 text-white' : 'bg-slate-100'}`}>{i + 1}. {name}</li>)}</ol>
      {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-red-800">{error}</p>}
      {!options && !error && <p role="status">Loading eligible products and wallet…</p>}
      <form onSubmit={e => { e.preventDefault(); if (step === 3) { void submit(); } else setStep(s => s + 1); }}>
        {step === 0 && <div className="space-y-4">
          <p className="text-sm text-slate-600">Choose an approved product with available stock. Products with an open campaign are excluded.</p>
          <label className="block text-sm">Search your eligible products<input className={inputClass} value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} /></label>
          <div className="max-h-72 overflow-auto space-y-2">{options?.products.data.map(p => <label key={p.id} className={`flex gap-3 items-center p-3 rounded-lg border cursor-pointer ${draft.product_id === p.id ? 'border-blue-600 bg-blue-50' : 'border-slate-200'}`}>
            <input type="radio" name="product" checked={draft.product_id === p.id} onChange={() => { update('product_id', p.id); setSelected(p); }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {p.images?.[0] && <img alt="" src={/^https?:/.test(p.images[0]) ? p.images[0] : getApiOrigin() + '/' + p.images[0].replace(/^\//, '')} className="h-14 w-16 object-contain bg-white rounded" />}
            <span><span className="font-semibold block">{p.name}</span><span className="text-xs text-slate-600">€{Number(p.price).toFixed(2)} · Stock: {p.stock_quantity} · Approved</span></span>
          </label>)}</div>
          {options?.products.data.length === 0 && <p className="text-sm">No eligible products found.</p>}
          <div className="flex gap-3"><button type="button" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button><span>Page {page} of {options?.products.last_page || 1}</span><button type="button" disabled={page >= (options?.products.last_page || 1)} onClick={() => setPage(p => p + 1)}>Next</button></div>
          {draft.product_id > 0 && <p className="text-sm text-blue-800">Selected product #{draft.product_id}{selected ? ': ' + selected.name : ' — select the product to confirm eligibility.'}</p>}
        </div>}
        {step === 1 && <div className="grid sm:grid-cols-2 gap-4">
          <label className="sm:col-span-2 text-sm">Campaign name<input className={inputClass} required maxLength={120} value={draft.name} onChange={e => update('name', e.target.value)} /></label>
          <fieldset className="sm:col-span-2 rounded-xl border border-blue-200 bg-blue-50 p-4"><legend className="px-1 font-semibold text-blue-950">When should this boost start?</legend><div className="mt-2 flex flex-wrap gap-4"><label className="flex items-center gap-2 text-sm"><input type="radio" checked={draft.launch_mode === 'run_now'} onChange={() => update('launch_mode', 'run_now')} />Run now after admin approval</label><label className="flex items-center gap-2 text-sm"><input type="radio" checked={draft.launch_mode === 'schedule'} onChange={() => update('launch_mode', 'schedule')} />Schedule a start time</label></div><p className="mt-2 text-xs text-blue-900">Run now activates as soon as the admin approves a paid campaign. Scheduled campaigns activate at the selected time.</p></fieldset>
          {draft.launch_mode === 'schedule' && <label className="text-sm">Start date and time<input className={inputClass} type="datetime-local" required value={draft.starts_at} onChange={e => update('starts_at', e.target.value)} /></label>}
          <label className="text-sm">End date and time<input className={inputClass} type="datetime-local" required min={draft.starts_at} value={draft.ends_at} onChange={e => update('ends_at', e.target.value)} /></label>
          <label className="text-sm">Budget type<select className={inputClass} value={draft.budget_type} onChange={e => update('budget_type', e.target.value as 'daily' | 'total')}><option value="total">Total campaign budget</option><option value="daily">Daily budget</option></select></label>
          <label className="text-sm">Budget amount (EUR)<input className={inputClass} required type="number" min="1" max="100000" step="0.01" value={draft.budget_amount} onChange={e => update('budget_amount', e.target.value)} /></label>
          <label className="text-sm">Bidding<select className={inputClass} value="cpc" disabled><option value="cpc">CPC — cost per click</option></select></label>
          <label className="text-sm">Maximum cost per click (EUR)<input className={inputClass} required type="number" min="0.01" max={draft.budget_amount} step="0.01" value={draft.bid_amount} onChange={e => update('bid_amount', e.target.value)} /></label>
          <p className="sm:col-span-2 text-sm text-slate-600"><strong>Schedule timezone: {timezone}</strong>. The selected local time is converted to UTC for the scheduler. Daily caps reset at midnight UTC. All {dayCount} UTC calendar days, including partial days, are reserved up front: <strong>{money(reserve)}</strong>. Unspent funds return when the campaign ends.</p>
          {(!validDates || reserve > 10000000) && <p className="text-sm text-red-700">Choose a valid period of up to 90 days and a total reservation of at most €100,000.</p>}
        </div>}
        {step === 2 && <div className="space-y-5">
          <fieldset><legend className="font-semibold mb-2">Locations</legend><label className="flex gap-2"><input type="checkbox" checked={draft.locations.includes('global')} onChange={e => update('locations', e.target.checked ? ['global'] : [])} />Global — all buyers, including guests</label>
            <div className="grid grid-cols-2 gap-2 mt-3 max-h-48 overflow-auto">{options?.locations.map(l => <label key={l.code} className="flex gap-2 text-sm"><input type="checkbox" checked={draft.locations.includes(l.code)} onChange={() => update('locations', toggle(draft.locations.filter(v => v !== 'global'), l.code))} />{l.name}</label>)}</div>
            <p className="text-xs text-slate-500 mt-2">Country targeting uses the buyer’s default address. Buyers without a known country see global campaigns only.</p>
          </fieldset>
          <fieldset><legend className="font-semibold mb-2">Placements</legend><div className="grid grid-cols-2 gap-3">{options?.placements.map(p => <label className="flex gap-2 capitalize" key={p}><input type="checkbox" checked={draft.placements.includes(p)} onChange={() => update('placements', toggle(draft.placements, p))} />{label(p)}</label>)}</div></fieldset>
        </div>}
        {step === 3 && <div className="space-y-4">
          {selected && <div className="flex gap-3 items-center bg-slate-50 p-3 rounded-lg">
            {image && <>
              {/* The eligible-product API allows seller-hosted image URLs. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="" src={/^https?:/.test(image) ? image : getApiOrigin() + '/' + image.replace(/^\//, '')} className="w-20 h-16 object-contain" />
            </>}
            <div><p className="font-semibold">{selected.name}</p><p className="text-sm">€{Number(selected.price).toFixed(2)} · {selected.stock_quantity} in stock · Approved</p></div>
          </div>}
          <dl className="grid grid-cols-2 gap-3 text-sm">{[
            ['Campaign', draft.name], ['Schedule', draft.launch_mode === 'run_now' ? 'Run immediately after admin approval' : scheduledStart.toLocaleString() + ' → ' + end.toLocaleString()], ['End time', draft.launch_mode === 'run_now' ? end.toLocaleString() : 'Included above'], ['Budget', money(amount) + (draft.budget_type === 'daily' ? ' per UTC day' : ' total')],
            ['Cost per click', 'Up to €' + Number(draft.bid_amount).toFixed(2)], ['Locations', draft.locations.join(', ')], ['Placements', draft.placements.map(label).join(', ')],
            ['Reserve now', money(reserve)], ['Seller Wallet available', money(available)], ['Already reserved for ads', money(options?.seller_wallet_ad_reserved_cents || 0)],
            ['Payment source', 'Seller Wallet'],
          ].map(([k, v]) => <div key={k}><dt className="text-slate-500">{k}</dt><dd className="font-medium break-words">{v}</dd></div>)}</dl>
          <p className="text-sm p-3 rounded bg-blue-50">{options?.review_required ? (draft.launch_mode === 'run_now' ? 'After successful reservation, admin approval starts this campaign immediately.' : 'After successful reservation, your campaign goes to admin review and starts only after approval and the selected local time.') : (draft.launch_mode === 'run_now' ? 'After successful reservation, this campaign starts immediately.' : 'After successful reservation, this campaign starts at the selected local time.')} Pausing stops new charges. Cancelling returns the unused reservation.</p>
          {reserve > available && <p className="text-sm text-amber-800 bg-amber-50 p-3">Your Seller Wallet needs {money(reserve - available)} more. Add funds from this page before confirming.</p>}
          <label className="flex gap-3 text-sm"><input type="checkbox" checked={confirmed} disabled={locked} onChange={e => setConfirmed(e.target.checked)} required /><span>I authorize reserving {money(reserve)} from my wallet for this campaign.</span></label>
          {locked && !busy && <p className="text-sm">Retrying uses the same payment request. If you close this window, check your campaigns before creating another.</p>}
        </div>}
        <div className="flex justify-between mt-6 pt-4 border-t"><button type="button" disabled={busy || locked} onClick={() => step ? setStep(s => s - 1) : close()}>{step ? 'Back' : 'Cancel'}</button>
          <button type="submit" className={buttonClass} disabled={busy || !options || (step === 0 && !selected) || (step === 1 && (!validDates || reserve > 10000000)) || (step === 2 && (!draft.locations.length || !draft.placements.length)) || (step === 3 && (!confirmed || reserve > available))}>
            {busy ? 'Reserving funds…' : step === 3 ? (locked ? 'Retry reservation' : 'Confirm & reserve ' + money(reserve)) : 'Continue'}
          </button></div>
      </form>
    </div>
  </dialog>;
}

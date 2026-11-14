'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import GlassCard from '@/components/ui/GlassCard';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Vista360TranslationScope from '@/components/vista360/Vista360TranslationScope';
import { useToast } from '@/components/ui/Toast';
import { getAxiosErrorMessage } from '@/lib/api-client';
import {
  type Vista360Duration,
  type Vista360PaymentRow,
  type Vista360Plan,
  type Vista360PlanFeature,
  type Vista360PlanInput,
  type Vista360SubscriptionDetail,
  type Vista360SubscriptionRow,
  vista360AdminService,
} from '@/services/vista360-service';

const DURATIONS: Array<{ value: Vista360Duration; label: string }> = [
  { value: 1, label: 'Monthly (1 month)' },
  { value: 6, label: 'Semi-annual (6 months)' },
  { value: 12, label: 'Annual (12 months)' },
];

type PlanDraft = Vista360PlanInput;
type SubscriptionAction = 'extend' | 'activate' | 'suspend' | 'cancel';

const money = (cents: number, currency = 'EUR') => new Intl.NumberFormat('en-IE', {
  style: 'currency', currency,
}).format((Number(cents) || 0) / 100);
const date = (value?: string | null) => value ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';
const statusVariant = (status: string): 'success' | 'error' | 'warning' | 'info' | 'default' => {
  if (status === 'active' || status === 'paid') return 'success';
  if (status === 'suspended' || status === 'cancelled' || status === 'failed' || status === 'payment_failed' || status === 'expired') return 'error';
  if (status === 'pending' || status === 'scheduled') return 'warning';
  return 'default';
};

function emptyPlan(): PlanDraft {
  return {
    name: '', slug: '', description: '', is_active: true, sort_order: 0,
    prices: DURATIONS.map(({ value }) => ({ duration_months: value, amount_cents: 0, currency: 'EUR', is_active: true })),
    features: [{ feature_key: 'crm.access', title: 'Vista Express 360 CRM access', description: 'Secure access to the connected physical shop workspace.', is_active: true, sort_order: 0 }],
  };
}

function planToDraft(plan: Vista360Plan): PlanDraft {
  const visiblePrices = DURATIONS.map(({ value }) => {
    const active = plan.prices.find((price) => price.duration_months === value && price.is_active) ?? plan.prices.find((price) => price.duration_months === value);
    return active
      ? { duration_months: value, amount_cents: active.amount_cents, currency: active.currency, is_active: active.is_active }
      : { duration_months: value, amount_cents: 0, currency: 'EUR', is_active: false };
  });
  return {
    name: plan.name, slug: plan.slug, description: plan.description || '', is_active: plan.is_active, sort_order: plan.sort_order,
    display_details: plan.display_details || undefined,
    prices: visiblePrices,
    features: plan.features.map((feature) => ({
      feature_key: feature.feature_key, title: feature.title, description: feature.description || '', value: feature.value,
      is_active: feature.is_active, sort_order: feature.sort_order,
    })),
  };
}

export default function VistaExpress360AdminPage() {
  const { showToast } = useToast();
  const [plans, setPlans] = useState<Vista360Plan[]>([]);
  const [subscriptions, setSubscriptions] = useState<Vista360SubscriptionRow[]>([]);
  const [payments, setPayments] = useState<Vista360PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [planModal, setPlanModal] = useState<{ plan?: Vista360Plan; draft: PlanDraft } | null>(null);
  const [grantOpen, setGrantOpen] = useState(false);
  const [actionTarget, setActionTarget] = useState<Vista360SubscriptionRow | null>(null);
  const [historyTarget, setHistoryTarget] = useState<Vista360SubscriptionRow | null>(null);
  const [history, setHistory] = useState<Vista360SubscriptionDetail | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [subscriptionPage, setSubscriptionPage] = useState(1);
  const [subscriptionLastPage, setSubscriptionLastPage] = useState(1);
  const [paymentPage, setPaymentPage] = useState(1);
  const [paymentLastPage, setPaymentLastPage] = useState(1);

  const loadPlans = useCallback(async () => setPlans(await vista360AdminService.plans()), []);
  const loadSubscriptions = useCallback(async (page = subscriptionPage) => {
    const result = await vista360AdminService.subscriptions({ page, per_page: 15, search: search || undefined, status: status || undefined });
    setSubscriptions(result.data);
    setSubscriptionPage(result.current_page);
    setSubscriptionLastPage(result.last_page);
  }, [search, status, subscriptionPage]);
  const loadPayments = useCallback(async (page = paymentPage) => {
    const result = await vista360AdminService.payments({ page, per_page: 12 });
    setPayments(result.data);
    setPaymentPage(result.current_page);
    setPaymentLastPage(result.last_page);
  }, [paymentPage]);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { await Promise.all([loadPlans(), loadSubscriptions(1), loadPayments(1)]); }
    catch (cause) { setError(getAxiosErrorMessage(cause)); }
    finally { setLoading(false); }
  }, [loadPlans, loadSubscriptions, loadPayments]);

  useEffect(() => { void load(); }, [load]);

  const refreshSubscriptions = async (page = 1) => {
    try { await loadSubscriptions(page); }
    catch (cause) { showToast('error', getAxiosErrorMessage(cause)); }
  };

  const togglePlan = async (plan: Vista360Plan) => {
    setBusy(true);
    try {
      await vista360AdminService.setPlanAvailability(plan.id, !plan.is_active);
      showToast('success', `${plan.name} is now ${plan.is_active ? 'hidden from new purchases' : 'available for purchase'}.`);
      await loadPlans();
    } catch (cause) { showToast('error', getAxiosErrorMessage(cause)); }
    finally { setBusy(false); }
  };

  const savePlan = async (draft: PlanDraft) => {
    if (!planModal) return;
    setBusy(true);
    try {
      if (planModal.plan) await vista360AdminService.updatePlan(planModal.plan.id, draft);
      else await vista360AdminService.createPlan(draft);
      showToast('success', planModal.plan ? 'Plan updated. Existing subscriptions keep their saved terms.' : 'Plan created.');
      setPlanModal(null);
      await loadPlans();
    } catch (cause) { showToast('error', getAxiosErrorMessage(cause)); }
    finally { setBusy(false); }
  };

  const runAction = async (action: SubscriptionAction, months?: Vista360Duration, reason?: string) => {
    if (!actionTarget) return;
    setBusy(true);
    try {
      await vista360AdminService.act(actionTarget.uuid, { action, months, reason: reason || undefined });
      showToast('success', `Subscription ${action}d.`);
      setActionTarget(null);
      await Promise.all([refreshSubscriptions(subscriptionPage), loadPayments(paymentPage)]);
    } catch (cause) { showToast('error', getAxiosErrorMessage(cause)); }
    finally { setBusy(false); }
  };

  const openHistory = async (row: Vista360SubscriptionRow) => {
    setHistoryTarget(row); setHistory(null); setHistoryLoading(true);
    try { setHistory(await vista360AdminService.subscription(row.uuid)); }
    catch (cause) { showToast('error', getAxiosErrorMessage(cause)); setHistoryTarget(null); }
    finally { setHistoryLoading(false); }
  };

  const visiblePlanCount = useMemo(() => plans.filter((plan) => plan.is_active).length, [plans]);

  return <AdminLayout><Vista360TranslationScope><div className="space-y-6">
    <header className="rounded-2xl bg-gradient-to-r from-[#041f4b] via-[#0066CC] to-[#008c73] p-6 text-white shadow-lg sm:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-100">Vista Express 360</p><h1 className="mt-2 text-3xl font-extrabold">CRM subscription management</h1><p className="mt-2 max-w-3xl text-sm text-blue-50">Manage seller access without changing the marketplace’s existing subscription product. Plan changes only affect new purchases; every paid subscription retains its own saved price and feature snapshot.</p></div><Button className="bg-white !text-[#0066CC] hover:!bg-blue-50" onClick={() => setPlanModal({ draft: emptyPlan() })}>Create plan</Button></div>
    </header>

    {error && <div className="flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><span>{error}</span><Button size="sm" variant="outline" onClick={() => void load()}>Retry</Button></div>}

    <section className="grid gap-4 sm:grid-cols-3"><Metric label="Available plans" value={visiblePlanCount} hint={`${plans.length} configured`} /><Metric label="Active subscriptions" value={subscriptions.filter((row) => row.status === 'active').length} hint="Current result page" /><Metric label="Recent payments" value={payments.filter((row) => row.status === 'paid').length} hint="Current result page" /></section>

    <GlassCard><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold text-slate-900">Plans and access permissions</h2><p className="mt-1 text-sm text-slate-500">Each feature key is enforced by the CRM backend. Keep <code className="rounded bg-slate-100 px-1">crm.access</code> enabled for any plan that may open the CRM.</p></div><Button variant="outline" size="sm" onClick={() => void loadPlans()} disabled={loading || busy}>Refresh plans</Button></div>
      {loading ? <p className="py-8 text-center text-sm text-slate-500">Loading subscription configuration…</p> : <div className="grid gap-4 xl:grid-cols-3">{plans.map((plan) => <article key={plan.id} className="flex min-h-[24rem] flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><h3 className="text-xl font-extrabold text-slate-900">{plan.name}</h3><p className="mt-1 text-xs font-semibold uppercase tracking-wider text-[#0066CC]">{plan.slug}</p></div><Badge variant={plan.is_active ? 'success' : 'default'}>{plan.is_active ? 'Available' : 'Disabled'}</Badge></div><p className="mt-3 min-h-12 text-sm leading-6 text-slate-600">{plan.description || 'No plan description has been added.'}</p><div className="my-4 grid grid-cols-3 gap-2 border-y border-slate-100 py-4">{DURATIONS.map(({ value }) => { const price = plan.prices.find((item) => item.duration_months === value && item.is_active) ?? plan.prices.find((item) => item.duration_months === value); return <div key={value}><p className="text-[11px] font-semibold uppercase text-slate-500">{value} mo</p><p className="mt-1 text-sm font-bold text-slate-900">{price && price.is_active ? money(price.amount_cents, price.currency) : '—'}</p></div>; })}</div><ul className="flex-1 space-y-2 text-sm text-slate-700">{plan.features.filter((feature) => feature.is_active).slice(0, 7).map((feature) => <li key={feature.feature_key} className="flex gap-2"><span className="font-bold text-emerald-600">✓</span><span>{feature.title}</span></li>)}{!plan.features.some((feature) => feature.is_active) && <li className="text-slate-400">No active features</li>}</ul><div className="mt-5 flex gap-2"><Button size="sm" className="flex-1" variant="outline" onClick={() => setPlanModal({ plan, draft: planToDraft(plan) })}>Edit</Button><Button size="sm" className="flex-1" variant={plan.is_active ? 'danger' : 'secondary'} onClick={() => void togglePlan(plan)} disabled={busy}>{plan.is_active ? 'Disable' : 'Enable'}</Button></div></article>)}</div>}</GlassCard>

    <GlassCard><div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"><div><h2 className="text-xl font-bold text-slate-900">Seller subscriptions</h2><p className="mt-1 text-sm text-slate-500">Suspend or cancel stops CRM APIs as well as the user interface. Manual grants are fully audited.</p></div><div className="flex flex-wrap gap-2"><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Seller, shop, or subscription ID" className="w-64" /><select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800"><option value="">All statuses</option>{['active', 'scheduled', 'pending', 'expired', 'suspended', 'cancelled', 'payment_failed'].map((item) => <option key={item} value={item}>{item.replace('_', ' ')}</option>)}</select><Button variant="outline" onClick={() => void refreshSubscriptions(1)}>Filter</Button><Button onClick={() => setGrantOpen(true)}>Manual grant</Button></div></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="border-y border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-3">Seller / shop</th><th className="px-3 py-3">Plan</th><th className="px-3 py-3">Term</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Source</th><th className="px-3 py-3">Actions</th></tr></thead><tbody>{subscriptions.map((row) => <tr key={row.uuid} className="border-b border-slate-100 align-top"><td className="px-3 py-4"><p className="font-semibold text-slate-900">{row.seller?.name || `Seller #${row.seller_id}`}</p><p className="text-xs text-slate-500">{row.store?.name || `Shop #${row.store_id}`} · {row.seller?.email || '—'}</p><p className="mt-1 max-w-[15rem] truncate font-mono text-[10px] text-slate-400">{row.uuid}</p></td><td className="px-3 py-4 font-medium text-slate-800">{row.plan_snapshot?.name || row.plan?.name || '—'}</td><td className="px-3 py-4 text-slate-600"><p>{date(row.starts_at)}</p><p className="text-xs">to {date(row.expires_at)}</p></td><td className="px-3 py-4"><Badge variant={statusVariant(row.status)}>{row.status.replace('_', ' ')}</Badge>{row.status_reason && <p className="mt-1 max-w-[15rem] text-xs text-slate-500">{row.status_reason}</p>}</td><td className="px-3 py-4 capitalize text-slate-600">{row.source}</td><td className="px-3 py-4"><div className="flex flex-wrap gap-2">{row.status !== 'active' && <Button size="sm" variant="secondary" disabled={busy} onClick={() => setActionTarget(row)}>Activate</Button>}<Button size="sm" variant="outline" disabled={busy} onClick={() => void openHistory(row)}>History</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => { setActionTarget(row); }}>Manage</Button></div></td></tr>)}{!loading && subscriptions.length === 0 && <tr><td colSpan={6} className="px-3 py-10 text-center text-slate-500">No subscriptions match this filter.</td></tr>}</tbody></table></div><Pager page={subscriptionPage} last={subscriptionLastPage} disabled={busy || loading} onChange={(next) => void refreshSubscriptions(next)} /></GlassCard>

    <GlassCard><div className="mb-5 flex items-center justify-between"><div><h2 className="text-xl font-bold text-slate-900">Payment history</h2><p className="mt-1 text-sm text-slate-500">Provider amounts and statuses are retained with the subscription; admin grants are recorded as zero-value manual payments.</p></div><Button size="sm" variant="outline" onClick={() => void loadPayments(1)} disabled={busy}>Refresh</Button></div><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="border-y border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-3">Subscription</th><th className="px-3 py-3">Seller / shop</th><th className="px-3 py-3">Provider</th><th className="px-3 py-3">Amount</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Recorded</th></tr></thead><tbody>{payments.map((payment) => <tr key={payment.uuid} className="border-b border-slate-100"><td className="px-3 py-3 font-mono text-xs text-slate-600">{payment.subscription?.uuid?.slice(0, 12) || '—'}</td><td className="px-3 py-3"><p className="font-medium text-slate-800">{payment.subscription?.seller?.name || '—'}</p><p className="text-xs text-slate-500">{payment.subscription?.store?.name || '—'}</p></td><td className="px-3 py-3 capitalize text-slate-600">{payment.provider}</td><td className="px-3 py-3 font-semibold text-slate-800">{money(payment.amount_cents, payment.currency)}</td><td className="px-3 py-3"><Badge variant={statusVariant(payment.status)}>{payment.status}</Badge></td><td className="px-3 py-3 text-slate-500">{date(payment.paid_at || payment.created_at)}</td></tr>)}{!loading && payments.length === 0 && <tr><td colSpan={6} className="px-3 py-10 text-center text-slate-500">No subscription payments yet.</td></tr>}</tbody></table></div><Pager page={paymentPage} last={paymentLastPage} disabled={busy || loading} onChange={(next) => void loadPayments(next)} /></GlassCard>

    {planModal && <PlanModal plan={planModal.plan} draft={planModal.draft} busy={busy} onClose={() => setPlanModal(null)} onSave={savePlan} />}
    {grantOpen && <ManualGrantModal plans={plans.filter((plan) => plan.is_active)} busy={busy} onClose={() => setGrantOpen(false)} onSubmit={async (data) => { setBusy(true); try { await vista360AdminService.manualGrant(data); showToast('success', 'Subscription granted.'); setGrantOpen(false); await refreshSubscriptions(1); } catch (cause) { showToast('error', getAxiosErrorMessage(cause)); } finally { setBusy(false); } }} />}
    {actionTarget && <SubscriptionActionModal subscription={actionTarget} busy={busy} onClose={() => setActionTarget(null)} onSubmit={runAction} />}
    {historyTarget && <SubscriptionHistoryModal subscription={historyTarget} detail={history} loading={historyLoading} onClose={() => { setHistoryTarget(null); setHistory(null); }} />}
  </div></Vista360TranslationScope></AdminLayout>;
}

function Metric({ label, value, hint }: { label: string; value: number; hint: string }) { return <GlassCard className="!p-5"><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-2 text-3xl font-extrabold text-slate-900">{value}</p><p className="mt-1 text-xs text-slate-400">{hint}</p></GlassCard>; }
function Pager({ page, last, disabled, onChange }: { page: number; last: number; disabled: boolean; onChange: (page: number) => void }) { return last > 1 ? <div className="mt-4 flex items-center justify-end gap-3 text-sm text-slate-500"><span>Page {page} of {last}</span><Button size="sm" variant="outline" disabled={disabled || page <= 1} onClick={() => onChange(page - 1)}>Previous</Button><Button size="sm" variant="outline" disabled={disabled || page >= last} onClick={() => onChange(page + 1)}>Next</Button></div> : null; }

function PlanModal({ plan, draft, busy, onClose, onSave }: { plan?: Vista360Plan; draft: PlanDraft; busy: boolean; onClose: () => void; onSave: (draft: PlanDraft) => Promise<void> }) {
  const [form, setForm] = useState<PlanDraft>(draft);
  const setPrice = (duration: Vista360Duration, key: 'amount_cents' | 'currency' | 'is_active', value: number | string | boolean) => setForm((previous) => ({ ...previous, prices: previous.prices.map((price) => price.duration_months === duration ? { ...price, [key]: value } : price) }));
  const setFeature = (index: number, key: keyof Vista360PlanFeature, value: string | number | boolean) => setForm((previous) => ({ ...previous, features: previous.features.map((feature, current) => current === index ? { ...feature, [key]: value } : feature) }));
  const submit = (event: FormEvent) => { event.preventDefault(); void onSave({ ...form, slug: form.slug.trim().toLowerCase(), features: form.features.map((feature, index) => ({ ...feature, feature_key: feature.feature_key.trim(), title: feature.title.trim(), sort_order: index })) }); };
  return <Modal isOpen onClose={onClose} title={plan ? `Edit ${plan.name}` : 'Create Vista Express 360 plan'} size="xl"><form onSubmit={submit} className="space-y-6"><p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">Prices are stored in cents and versioned automatically. Changing a price never changes an already purchased subscription.</p><div className="grid gap-4 sm:grid-cols-2"><Input label="Plan name" value={form.name} required onChange={(event) => setForm({ ...form, name: event.target.value })} /><Input label="Stable slug" pattern="[a-z0-9-]+" title="Use lower-case letters, numbers and hyphens." value={form.slug} required onChange={(event) => setForm({ ...form, slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} /><div className="sm:col-span-2"><label className="mb-2 block text-sm font-semibold text-slate-700">Seller-facing description</label><textarea className="min-h-24 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900" value={form.description || ''} onChange={(event) => setForm({ ...form, description: event.target.value })} /></div><Input label="Display order" type="number" min="0" value={form.sort_order} onChange={(event) => setForm({ ...form, sort_order: Number(event.target.value) || 0 })} /><label className="mt-7 flex items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} /> Available for new purchases</label></div><div><h3 className="font-bold text-slate-900">Billing terms</h3><div className="mt-3 grid gap-3 md:grid-cols-3">{DURATIONS.map(({ value, label }) => { const price = form.prices.find((entry) => entry.duration_months === value)!; return <div key={value} className="rounded-xl border border-slate-200 p-4"><p className="mb-3 text-sm font-semibold text-slate-800">{label}</p><Input label="Price in cents" type="number" min="0" value={price.amount_cents} required onChange={(event) => setPrice(value, 'amount_cents', Math.max(0, Number(event.target.value) || 0))} /><div className="mt-3"><Input label="Currency" maxLength={3} value={price.currency} required onChange={(event) => setPrice(value, 'currency', event.target.value.toUpperCase())} /></div><label className="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-600"><input type="checkbox" checked={price.is_active} onChange={(event) => setPrice(value, 'is_active', event.target.checked)} /> Offer this term</label></div>; })}</div></div><div><div className="flex items-center justify-between gap-4"><div><h3 className="font-bold text-slate-900">CRM features and permissions</h3><p className="mt-1 text-xs text-slate-500">Feature keys become backend permission checks in Vista Express 360.</p></div><Button type="button" size="sm" variant="outline" onClick={() => setForm((previous) => ({ ...previous, features: [...previous.features, { feature_key: '', title: '', description: '', is_active: true, sort_order: previous.features.length }] }))}>Add feature</Button></div><div className="mt-3 space-y-3">{form.features.map((feature, index) => <div key={`${feature.feature_key}-${index}`} className="grid gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-[1fr_1fr_1.4fr_auto_auto]"><Input label="Feature key" required value={feature.feature_key} pattern="[a-zA-Z0-9._-]+" onChange={(event) => setFeature(index, 'feature_key', event.target.value)} /><Input label="Visible label" required value={feature.title} onChange={(event) => setFeature(index, 'title', event.target.value)} /><Input label="Description" value={feature.description || ''} onChange={(event) => setFeature(index, 'description', event.target.value)} /><label className="mt-7 flex items-center gap-2 text-xs font-semibold text-slate-600"><input type="checkbox" checked={feature.is_active} onChange={(event) => setFeature(index, 'is_active', event.target.checked)} /> Enabled</label><Button type="button" size="sm" variant="danger" className="mt-5" onClick={() => setForm((previous) => ({ ...previous, features: previous.features.filter((_, current) => current !== index) }))} disabled={feature.feature_key === 'crm.access'}>Remove</Button></div>)}</div></div><div className="flex justify-end gap-3 border-t border-slate-100 pt-5"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" isLoading={busy}>{plan ? 'Save changes' : 'Create plan'}</Button></div></form></Modal>;
}

function ManualGrantModal({ plans, busy, onClose, onSubmit }: { plans: Vista360Plan[]; busy: boolean; onClose: () => void; onSubmit: (data: { seller_id: number; store_id: number; plan_id: number; duration_months: Vista360Duration; reason?: string }) => Promise<void> }) {
  const [sellerId, setSellerId] = useState(''); const [storeId, setStoreId] = useState(''); const [planId, setPlanId] = useState(String(plans[0]?.id || '')); const [duration, setDuration] = useState<Vista360Duration>(12); const [reason, setReason] = useState('');
  return <Modal isOpen onClose={onClose} title="Grant seller CRM access" size="lg"><form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void onSubmit({ seller_id: Number(sellerId), store_id: Number(storeId), plan_id: Number(planId), duration_months: duration, reason: reason || undefined }); }}><p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Use the marketplace seller ID and the store ID belonging to that seller. This creates an auditable manual subscription and does not charge the seller.</p><div className="grid gap-4 sm:grid-cols-2"><Input label="Seller ID" type="number" min="1" value={sellerId} required onChange={(event) => setSellerId(event.target.value)} /><Input label="Store ID" type="number" min="1" value={storeId} required onChange={(event) => setStoreId(event.target.value)} /><div><label className="mb-2 block text-sm font-semibold text-slate-700">Plan</label><select required value={planId} onChange={(event) => setPlanId(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900">{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select></div><div><label className="mb-2 block text-sm font-semibold text-slate-700">Access term</label><select value={duration} onChange={(event) => setDuration(Number(event.target.value) as Vista360Duration)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900">{DURATIONS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}</select></div></div><div><label className="mb-2 block text-sm font-semibold text-slate-700">Reason / internal note</label><textarea className="min-h-24 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900" value={reason} maxLength={1000} onChange={(event) => setReason(event.target.value)} /></div><div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" isLoading={busy}>Grant access</Button></div></form></Modal>;
}

function SubscriptionHistoryModal({ subscription, detail, loading, onClose }: { subscription: Vista360SubscriptionRow; detail: Vista360SubscriptionDetail | null; loading: boolean; onClose: () => void }) {
  const payments = detail?.payments || [];
  const events = detail?.history || [];
  return <Modal isOpen onClose={onClose} title="Subscription history" size="xl"><div className="space-y-5"><div className="rounded-xl bg-slate-50 p-4"><p className="font-semibold text-slate-900">{subscription.seller?.name || `Seller #${subscription.seller_id}`} · {subscription.store?.name || `Shop #${subscription.store_id}`}</p><p className="mt-1 text-sm text-slate-600">{detail?.plan?.name || subscription.plan_snapshot?.name || subscription.plan?.name || 'Plan'} · {date(detail?.starts_at || subscription.starts_at)} to {date(detail?.expires_at || subscription.expires_at)}</p></div>{loading ? <p className="py-10 text-center text-sm text-slate-500">Loading payment and audit history…</p> : <><section><h3 className="text-sm font-bold text-slate-900">Payment records</h3>{payments.length ? <div className="mt-2 overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[560px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-3 py-2">Provider</th><th className="px-3 py-2">Amount</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Recorded</th></tr></thead><tbody>{payments.map((payment) => <tr key={payment.id} className="border-t border-slate-100"><td className="px-3 py-3 capitalize">{payment.provider}</td><td className="px-3 py-3 font-semibold">{money(payment.amount_cents, payment.currency)}</td><td className="px-3 py-3"><Badge variant={statusVariant(payment.status)}>{payment.status}</Badge></td><td className="px-3 py-3 text-slate-500">{date(payment.paid_at || payment.created_at)}</td></tr>)}</tbody></table></div> : <p className="mt-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-500">No payment records are available for this subscription.</p>}</section><section><h3 className="text-sm font-bold text-slate-900">Audited status changes</h3>{events.length ? <ol className="mt-2 overflow-hidden rounded-xl border border-slate-200">{events.map((event, index) => <li key={`${event.event}-${event.occurred_at || index}`} className="flex items-start justify-between gap-4 border-b border-slate-100 px-4 py-3 last:border-b-0"><div><p className="font-medium capitalize text-slate-800">{event.event.replace(/[._]/g, ' ')}</p>{event.data && Object.keys(event.data).length > 0 && <p className="mt-1 max-w-xl break-words text-xs text-slate-500">{Object.entries(event.data).map(([key, value]) => `${key}: ${String(value)}`).join(' · ')}</p>}</div><time className="shrink-0 text-xs text-slate-500">{date(event.occurred_at)}</time></li>)}</ol> : <p className="mt-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-500">No subscription events have been recorded yet.</p>}</section></>}<div className="flex justify-end"><Button variant="outline" onClick={onClose}>Close</Button></div></div></Modal>;
}

function SubscriptionActionModal({ subscription, busy, onClose, onSubmit }: { subscription: Vista360SubscriptionRow; busy: boolean; onClose: () => void; onSubmit: (action: SubscriptionAction, months?: Vista360Duration, reason?: string) => Promise<void> }) {
  const [action, setAction] = useState<SubscriptionAction>(subscription.status === 'active' ? 'extend' : 'activate'); const [months, setMonths] = useState<Vista360Duration>(1); const [reason, setReason] = useState('');
  return <Modal isOpen onClose={onClose} title="Manage subscription" size="lg"><form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void onSubmit(action, action === 'extend' ? months : undefined, reason || undefined); }}><div className="rounded-xl bg-slate-50 p-4"><p className="font-semibold text-slate-900">{subscription.seller?.name || `Seller #${subscription.seller_id}`} · {subscription.store?.name || `Shop #${subscription.store_id}`}</p><p className="mt-1 text-sm text-slate-600">{subscription.plan_snapshot?.name || subscription.plan?.name || 'Plan'} · {date(subscription.starts_at)} to {date(subscription.expires_at)}</p></div><div><label className="mb-2 block text-sm font-semibold text-slate-700">Authorized action</label><select value={action} onChange={(event) => setAction(event.target.value as SubscriptionAction)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900"><option value="extend">Extend current term</option><option value="activate">Activate / restore</option><option value="suspend">Suspend immediately</option><option value="cancel">Cancel immediately</option></select></div>{action === 'extend' && <div><label className="mb-2 block text-sm font-semibold text-slate-700">Extension</label><select value={months} onChange={(event) => setMonths(Number(event.target.value) as Vista360Duration)} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900">{DURATIONS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}</select></div>}<div><label className="mb-2 block text-sm font-semibold text-slate-700">Reason / internal note</label><textarea className="min-h-24 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900" value={reason} maxLength={1000} onChange={(event) => setReason(event.target.value)} /></div><p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Suspension and cancellation immediately deny Vista Express 360 CRM backend APIs. Seller marketplace data is preserved.</p><div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" variant={action === 'suspend' || action === 'cancel' ? 'danger' : 'primary'} isLoading={busy}>{action === 'extend' ? 'Extend term' : action === 'activate' ? 'Activate access' : `${action[0].toUpperCase()}${action.slice(1)} access`}</Button></div></form></Modal>;
}

'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Alert from '@/components/ui/Alert';
import { vista360Service, type Vista360Plan, type Vista360Subscription } from '@/services/vista360-service';

const durations: Array<{ value: 1 | 6 | 12; label: string; note: string }> = [
  { value: 1, label: 'Monthly', note: '1 month' },
  { value: 6, label: 'Semi-annual', note: '6 months' },
  { value: 12, label: 'Annual', note: '12 months' },
];
const money = (cents: number, currency = 'EUR') => new Intl.NumberFormat('en-IE', { style: 'currency', currency }).format(cents / 100);
const date = (value?: string | null) => value ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(new Date(value)) : '—';

export default function VistaExpress360Page() {
  // Next statically evaluates route shells during production builds. The
  // checkout return query uses useSearchParams, so keep it inside Suspense to
  // retain a normal server-rendered route shell and avoid a CSR bailout.
  return <Suspense fallback={<VistaExpress360PageFallback />}><VistaExpress360PageContent /></Suspense>;
}

function VistaExpress360PageContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [plans, setPlans] = useState<Vista360Plan[]>([]);
  const [subscription, setSubscription] = useState<Vista360Subscription | null>(null);
  const [futureSubscriptions, setFutureSubscriptions] = useState<Vista360Subscription[]>([]);
  const [duration, setDuration] = useState<1 | 6 | 12>(12);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [nextPlans, current] = await Promise.all([vista360Service.plans(), vista360Service.subscription()]);
      setPlans(nextPlans);
      setSubscription(current.subscription);
      setFutureSubscriptions(current.future_subscriptions || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Unable to load Vista Express 360 plans. Please try again.');
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);
  useEffect(() => {
    const session = params.get('session_id');
    if (params.get('checkout') !== 'success' || !session) return;
    setBusy(true);
    void vista360Service.confirm(session).then((result) => {
      setSubscription(result.subscription);
      const planId = result.subscription.plan.id;
      const term = result.subscription.price.duration_months;
      if (planId && term) window.sessionStorage.removeItem(`vista360.checkout.${planId}.${term}`);
      setNotice(result.subscription.status === 'scheduled' ? 'Payment received. Your new term is scheduled after the current paid term.' : 'Payment received. Vista Express 360 access is now active.');
      router.replace('/vista-express-360');
      void load();
    }).catch((e: any) => setError(e?.response?.data?.message || 'We could not verify the checkout yet. Please refresh this page in a moment.')).finally(() => setBusy(false));
  }, [params, router]);

  const currentFeatures = useMemo(() => new Set(subscription?.features?.map((feature) => feature.key) ?? []), [subscription]);
  const checkout = async (plan: Vista360Plan) => {
    setError(''); setBusy(true);
    try {
      const origin = window.location.origin;
      const storageKey = `vista360.checkout.${plan.id}.${duration}`;
      let idempotencyKey = window.sessionStorage.getItem(storageKey);
      if (!idempotencyKey) {
        idempotencyKey = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        window.sessionStorage.setItem(storageKey, idempotencyKey);
      }
      const result = await vista360Service.checkout({ plan_id: plan.id, duration_months: duration, success_url: `${origin}/vista-express-360?checkout=success&session_id={CHECKOUT_SESSION_ID}`, cancel_url: `${origin}/vista-express-360?checkout=cancelled`, idempotency_key: idempotencyKey });
      window.location.assign(result.checkout.url);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Checkout could not be opened.');
      setBusy(false);
    }
  };
  const openCrm = async () => {
    setBusy(true); setError('');
    try { window.location.assign((await vista360Service.crmLink()).url); }
    catch (e: any) { setError(e?.response?.data?.message || 'CRM access is not currently available.'); setBusy(false); }
  };
  const cancelFuture = async () => {
    if (!window.confirm('Cancel any future Vista Express 360 renewal terms? Your current paid period remains active until its expiry.')) return;
    setBusy(true); setError('');
    try { await vista360Service.cancelFuture(); setNotice('Future renewal terms were cancelled.'); await load(); }
    catch (e: any) { setError(e?.response?.data?.message || 'Unable to cancel the future renewal.'); }
    finally { setBusy(false); }
  };

  return <div className="min-h-screen bg-slate-50 pb-20 lg:pb-0"><Header /><div className="flex min-h-[calc(100vh-72px)]"><Sidebar /><main className="flex-1 px-4 py-6 sm:px-7 lg:px-10">
    <div className="mb-8 rounded-3xl bg-gradient-to-r from-[#05245a] via-[#0066CC] to-[#00a983] p-6 text-white shadow-xl sm:p-8"><p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-100">Vista Express 360</p><h1 className="mt-2 text-3xl font-extrabold">One secure workspace for your physical shop and online business.</h1><p className="mt-3 max-w-3xl text-blue-50">Your subscription protects access to the connected CRM without changing your existing Vista Express seller account or marketplace tools.</p></div>
    {error && <Alert type="error" message={error} />}{notice && <Alert type="success" message={notice} />}
    {subscription && <Card className="mb-7 border border-blue-100 bg-white"><div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-[#0066CC]">My subscription</p><h2 className="mt-1 text-2xl font-bold text-slate-900">{subscription.plan.name} <span className="ml-2 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-[#0066CC]">{subscription.status.replace('_', ' ')}</span></h2><p className="mt-2 text-sm text-slate-600">{subscription.price.duration_months}-month term · Active from {date(subscription.starts_at)} · {subscription.status === 'scheduled' ? 'Starts' : 'Expires'} {date(subscription.expires_at)}</p></div><div className="flex flex-wrap gap-3"><Button disabled={busy || subscription.status !== 'active'} onClick={() => void openCrm()}>Open Vista Express 360 CRM</Button><Button variant="outline" disabled={busy} onClick={() => void cancelFuture()}>Manage renewal</Button></div></div>
      <div className="mt-5 grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-3"><div><p className="text-xs text-slate-500">Paid access</p><p className="font-semibold text-slate-900">{subscription.status === 'active' ? 'Available' : subscription.status}</p></div><div><p className="text-xs text-slate-500">Payment history</p><p className="font-semibold text-slate-900">{subscription.payments?.length ?? 0} record(s)</p></div><div><p className="text-xs text-slate-500">Current term</p><p className="font-semibold text-slate-900">{money(subscription.price.amount_cents, subscription.price.currency)}</p></div></div>
    </Card>}
    <section><div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-2xl font-bold text-slate-900">Choose a plan</h2><p className="mt-1 text-sm text-slate-600">Plans, prices and included CRM access are managed by Vista Express administrators.</p></div><div className="flex rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200">{durations.map((item) => <button key={item.value} type="button" disabled={busy} onClick={() => setDuration(item.value)} className={`rounded-lg px-3 py-2 text-xs font-bold transition sm:px-4 ${duration === item.value ? 'bg-[#0066CC] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>{item.label}<span className="ml-1 opacity-75">{item.note}</span></button>)}</div></div>
      {loading ? <div className="py-16 text-center text-slate-500">Loading subscription options…</div> : <div className="grid gap-5 xl:grid-cols-3">{plans.map((plan) => { const price = plan.prices.find((item) => item.duration_months === duration); const current = subscription?.plan.slug === plan.slug && subscription.status === 'active'; const scheduled = futureSubscriptions.find((item) => item.plan.slug === plan.slug && item.price.duration_months === duration); return <Card key={plan.id} className={`relative flex flex-col border ${current ? 'border-[#0066CC] ring-2 ring-blue-100' : 'border-slate-200'} bg-white p-6`}><div className="absolute right-5 top-5 text-2xl">{plan.slug === 'go' ? '✦' : plan.slug === 'pro' ? '◈' : '✹'}</div><p className="text-sm font-bold uppercase tracking-widest text-[#0066CC]">Vista Express 360</p><h3 className="mt-2 text-2xl font-extrabold text-slate-900">{plan.name}</h3><p className="mt-2 min-h-12 text-sm leading-6 text-slate-600">{plan.description}</p><div className="my-6 border-y border-slate-100 py-5"><span className="text-3xl font-black text-slate-900">{price ? money(price.amount_cents, price.currency) : '—'}</span><span className="ml-2 text-sm text-slate-500">for {duration} month{duration > 1 ? 's' : ''}</span></div><ul className="flex-1 space-y-3 text-sm text-slate-700">{plan.features.map((feature) => <li key={feature.feature_key ?? feature.key} className="flex gap-2"><span className="font-bold text-emerald-600">✓</span><span>{feature.title}</span></li>)}</ul><Button className="mt-7 w-full" disabled={busy || !price || Boolean(scheduled)} onClick={() => void checkout(plan)}>{scheduled ? `Scheduled from ${date(scheduled.starts_at)}` : current ? `Renew ${plan.name}` : subscription?.status === 'active' ? `Schedule ${plan.name}` : `Choose ${plan.name}`}</Button></Card>; })}</div>}
    </section>
    {futureSubscriptions.length > 0 && <section className="mt-9"><h2 className="text-lg font-bold text-slate-900">Scheduled renewals and upgrades</h2><div className="mt-3 grid gap-3 md:grid-cols-2">{futureSubscriptions.map((future) => <Card key={future.id} className="border border-blue-100 bg-blue-50/40 p-5"><div className="flex items-start justify-between gap-3"><div><p className="font-bold text-slate-900">{future.plan.name}</p><p className="mt-1 text-sm text-slate-600">{future.price.duration_months}-month term · starts {date(future.starts_at)}</p></div><span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold capitalize text-[#0066CC]">{future.status}</span></div><p className="mt-3 text-sm font-semibold text-slate-800">{money(future.price.amount_cents, future.price.currency)} · expires {date(future.expires_at)}</p></Card>)}</div></section>}
    {subscription && <section className="mt-9"><h2 className="text-lg font-bold text-slate-900">Subscription history</h2><div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white">{subscription.history?.length ? subscription.history.map((entry, index) => <div key={`${entry.event}-${index}`} className="flex justify-between gap-4 border-b border-slate-100 px-5 py-4 last:border-0"><span className="font-medium capitalize text-slate-800">{entry.event.replace(/[._]/g, ' ')}</span><span className="text-sm text-slate-500">{date(entry.occurred_at)}</span></div>) : <p className="p-5 text-sm text-slate-500">No subscription events yet.</p>}</div></section>}
  </main></div><BottomNav /></div>;
}

function VistaExpress360PageFallback() {
  return <div className="min-h-screen bg-slate-50 pb-20 lg:pb-0"><Header /><div className="flex min-h-[calc(100vh-72px)]"><Sidebar /><main className="flex flex-1 items-center justify-center px-4 py-16 text-sm text-slate-500">Loading Vista Express 360…</main></div><BottomNav /></div>;
}

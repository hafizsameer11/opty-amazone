'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Alert from '@/components/ui/Alert';
import { vista360Service, type Vista360Plan, type Vista360Subscription } from '@/services/vista360-service';
import { useLanguage } from '@/contexts/LanguageContext';

const durations: Array<1 | 6 | 12> = [
  1, 6, 12,
];

export default function VistaExpress360Page() {
  const { language, t } = useLanguage();
  const money = (cents: number, currency = 'EUR') => new Intl.NumberFormat(language === 'it' ? 'it-IT' : 'en-IE', { style: 'currency', currency }).format(cents / 100);
  const date = (value?: string | null) => value ? new Intl.DateTimeFormat(language === 'it' ? 'it-IT' : 'en-GB', { dateStyle: 'medium' }).format(new Date(value)) : '—';
  const monthUnit = (months: number) => language === 'it' ? (months === 1 ? 'mese' : 'mesi') : (months === 1 ? 'month' : 'months');
  const status = (value: string) => {
    const key = `vista360.status.${value}`;
    const translated = t(key);
    return translated === key ? value.replaceAll('_', ' ') : translated;
  };
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
      setError(e?.response?.data?.message || t('vista360.loadFailed'));
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const activate = async (plan: Vista360Plan) => {
    setError(''); setBusy(true);
    try {
      const storageKey = `vista360.activate.${plan.id}.${duration}`;
      let idempotencyKey = window.sessionStorage.getItem(storageKey);
      if (!idempotencyKey) {
        idempotencyKey = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        window.sessionStorage.setItem(storageKey, idempotencyKey);
      }
      const result = await vista360Service.activate({ plan_id: plan.id, duration_months: duration, idempotency_key: idempotencyKey });
      window.sessionStorage.removeItem(storageKey);
      setSubscription(result.subscription);
      setNotice(result.subscription.status === 'scheduled'
        ? t('vista360.nextTermScheduled')
        : t('vista360.activated'));
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message || t('vista360.activationFailed'));
    } finally { setBusy(false); }
  };
  const openCrm = async () => {
    setBusy(true); setError('');
    try { window.location.assign((await vista360Service.crmLink()).url); }
    catch (e: any) { setError(e?.response?.data?.message || t('vista360.crmUnavailable')); setBusy(false); }
  };
  const cancelFuture = async () => {
    if (!window.confirm(t('vista360.confirmCancelFuture'))) return;
    setBusy(true); setError('');
    try { await vista360Service.cancelFuture(); setNotice(t('vista360.futureCancelled')); await load(); }
    catch (e: any) { setError(e?.response?.data?.message || t('vista360.futureCancelFailed')); }
    finally { setBusy(false); }
  };

  return <div className="min-h-screen bg-slate-50 pb-20 lg:pb-0"><Header /><div className="flex min-h-[calc(100vh-72px)]"><Sidebar /><main className="flex-1 px-4 py-6 sm:px-7 lg:px-10">
    <div className="mb-8 rounded-3xl bg-gradient-to-r from-[#05245a] via-[#0066CC] to-[#00a983] p-6 text-white shadow-xl sm:p-8"><p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-100">Vista Express 360</p><h1 className="mt-2 text-3xl font-extrabold">{t('vista360.pageTitle')}</h1><p className="mt-3 max-w-3xl text-blue-50">{t('vista360.pageDescription')}</p></div>
    {error && <Alert type="error" message={error} />}{notice && <Alert type="success" message={notice} />}
    {subscription && <Card className="mb-7 border border-blue-100 bg-white"><div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-[#0066CC]">{t('vista360.mySubscription')}</p><h2 className="mt-1 text-2xl font-bold text-slate-900">{subscription.plan.name} <span className="ml-2 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-[#0066CC]">{status(subscription.status)}</span></h2><p className="mt-2 text-sm text-slate-600">{t('vista360.term', { months: subscription.price.duration_months, unit: monthUnit(subscription.price.duration_months) })} · {t('vista360.activeFrom', { date: date(subscription.starts_at) })} · {subscription.status === 'scheduled' ? t('vista360.starts', { date: date(subscription.expires_at) }) : t('vista360.expires', { date: date(subscription.expires_at) })}</p></div><div className="flex flex-wrap gap-3"><Button disabled={busy || subscription.status !== 'active'} onClick={() => void openCrm()}>{t('vista360.openCrm')}</Button><Button variant="outline" disabled={busy} onClick={() => void cancelFuture()}>{t('vista360.manageRenewal')}</Button></div></div>
      <div className="mt-5 grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-3"><div><p className="text-xs text-slate-500">{t('vista360.crmAccess')}</p><p className="font-semibold text-slate-900">{subscription.status === 'active' ? t('vista360.available') : status(subscription.status)}</p></div><div><p className="text-xs text-slate-500">{t('vista360.activationHistory')}</p><p className="font-semibold text-slate-900">{t('vista360.records', { count: subscription.payments?.length ?? 0 })}</p></div><div><p className="text-xs text-slate-500">{t('vista360.planReferencePrice')}</p><p className="font-semibold text-slate-900">{money(subscription.price.amount_cents, subscription.price.currency)}</p></div></div>
    </Card>}
    <section><div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-2xl font-bold text-slate-900">{t('vista360.choosePlan')}</h2><p className="mt-1 text-sm text-slate-600">{t('vista360.choosePlanDescription')}</p></div><div className="flex rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200">{durations.map((item) => <button key={item} type="button" disabled={busy} onClick={() => setDuration(item)} className={`rounded-lg px-3 py-2 text-xs font-bold transition sm:px-4 ${duration === item ? 'bg-[#0066CC] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>{t(`vista360.duration.${item}`)}<span className="ml-1 opacity-75">{t(`vista360.durationNote.${item}`)}</span></button>)}</div></div>
      {loading ? <div className="py-16 text-center text-slate-500">{t('vista360.loadingOptions')}</div> : <div className="grid gap-5 xl:grid-cols-3">{plans.map((plan) => { const price = plan.prices.find((item) => item.duration_months === duration); const current = subscription?.plan.slug === plan.slug && subscription.status === 'active'; const scheduled = futureSubscriptions.find((item) => item.plan.slug === plan.slug && item.price.duration_months === duration); return <Card key={plan.id} className={`relative flex flex-col border ${current ? 'border-[#0066CC] ring-2 ring-blue-100' : 'border-slate-200'} bg-white p-6`}><div className="absolute right-5 top-5 text-2xl">{plan.slug === 'go' ? '✦' : plan.slug === 'pro' ? '◈' : '✹'}</div><p className="text-sm font-bold uppercase tracking-widest text-[#0066CC]">Vista Express 360</p><h3 className="mt-2 text-2xl font-extrabold text-slate-900">{plan.name}</h3><p className="mt-2 min-h-12 text-sm leading-6 text-slate-600">{plan.description}</p><div className="my-6 border-y border-slate-100 py-5"><span className="text-3xl font-black text-slate-900">{price ? money(price.amount_cents, price.currency) : '—'}</span><span className="ml-2 text-sm text-slate-500">{t('vista360.referencePrice', { months: duration, unit: monthUnit(duration) })}</span></div><ul className="flex-1 space-y-3 text-sm text-slate-700">{plan.features.map((feature) => <li key={feature.feature_key ?? feature.key} className="flex gap-2"><span className="font-bold text-emerald-600">✓</span><span>{feature.title}</span></li>)}</ul><Button className="mt-7 w-full" disabled={busy || !price || Boolean(scheduled)} onClick={() => void activate(plan)}>{scheduled ? t('vista360.scheduledFrom', { date: date(scheduled.starts_at) }) : current ? t('vista360.extendPlan', { plan: plan.name }) : subscription?.status === 'active' ? t('vista360.schedulePlan', { plan: plan.name }) : t('vista360.activatePlan', { plan: plan.name })}</Button></Card>; })}</div>}
    </section>
    {futureSubscriptions.length > 0 && <section className="mt-9"><h2 className="text-lg font-bold text-slate-900">{t('vista360.scheduledRenewals')}</h2><div className="mt-3 grid gap-3 md:grid-cols-2">{futureSubscriptions.map((future) => <Card key={future.id} className="border border-blue-100 bg-blue-50/40 p-5"><div className="flex items-start justify-between gap-3"><div><p className="font-bold text-slate-900">{future.plan.name}</p><p className="mt-1 text-sm text-slate-600">{t('vista360.term', { months: future.price.duration_months, unit: monthUnit(future.price.duration_months) })} · {t('vista360.startsLower', { date: date(future.starts_at) })}</p></div><span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold capitalize text-[#0066CC]">{status(future.status)}</span></div><p className="mt-3 text-sm font-semibold text-slate-800">{money(future.price.amount_cents, future.price.currency)} · {t('vista360.expiresLower', { date: date(future.expires_at) })}</p></Card>)}</div></section>}
    {subscription && <section className="mt-9"><h2 className="text-lg font-bold text-slate-900">{t('vista360.subscriptionHistory')}</h2><div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white">{subscription.history?.length ? subscription.history.map((entry, index) => <div key={`${entry.event}-${index}`} className="flex justify-between gap-4 border-b border-slate-100 px-5 py-4 last:border-0"><span className="font-medium capitalize text-slate-800">{entry.event.replace(/[._]/g, ' ')}</span><span className="text-sm text-slate-500">{date(entry.occurred_at)}</span></div>) : <p className="p-5 text-sm text-slate-500">{t('vista360.noEvents')}</p>}</div></section>}
  </main></div><BottomNav /></div>;
}

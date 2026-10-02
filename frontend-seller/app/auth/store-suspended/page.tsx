'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import SellerAuthShell, { AuthFeedback } from '@/components/auth/SellerAuthShell';
import Button from '@/components/ui/Button';
import { StoreService } from '@/services/store-service';
import { getSellerGateState } from '@/lib/seller-profile-gate';

type RequestRow = { id: number; reason: string; status: string; admin_notes?: string | null; created_at?: string | null };

export default function StoreSuspendedPage() {
  const router = useRouter();
  const { isAuthenticated, loading, logout } = useAuth();
  const { t } = useLanguage();
  const [reason, setReason] = useState('');
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(false);
  const pending = requests.some((item) => item.status === 'pending');

  const load = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const [requestsResponse, storeResponse] = await Promise.all([StoreService.reinstatementRequests(), StoreService.getStore()]);
      setRequests(requestsResponse.data?.requests || []);
      if (getSellerGateState(storeResponse.data?.store) === 'ok') router.replace('/dashboard');
    } catch (requestError: any) {
      setError(requestError?.response?.data?.message || t('storeSuspended.submitFailed'));
    }
  }, [isAuthenticated, router, t]);

  useEffect(() => { if (!loading && !isAuthenticated) router.replace('/auth/login'); }, [isAuthenticated, loading, router]);
  useEffect(() => { void load(); }, [load]);

  const submit = async () => {
    if (reason.trim().length < 10) { setError(t('storeSuspended.minimumReason')); return; }
    try {
      setSubmitting(true); setError('');
      await StoreService.requestReinstatement(reason.trim());
      setReason(''); setNotice(t('storeSuspended.submitted'));
      await load();
    } catch (submitError: any) {
      setError(submitError?.response?.data?.message || t('storeSuspended.submitFailed'));
    } finally { setSubmitting(false); }
  };
  const checkStatus = async () => { setChecking(true); setError(''); try { await load(); } finally { setChecking(false); } };
  if (loading || !isAuthenticated) return null;
  return <SellerAuthShell eyebrow={t('storeSuspended.eyebrow')} title={t('storeSuspended.title')} description={t('storeSuspended.description')} sideTitle={t('storeSuspended.title')} sideDescription={t('storeSuspended.description')}>
    <div className="space-y-5"><div className="flex items-start gap-4 rounded-2xl border border-red-200 bg-red-50 p-5"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-xl text-red-700" aria-hidden="true">!</span><div><p className="font-bold text-slate-950">{t('storeSuspended.title')}</p><p className="mt-1 text-sm leading-6 text-slate-600">{t('storeSuspended.description')}</p></div></div>{notice && <AuthFeedback type="success" message={notice} onClose={() => setNotice('')} />}{error && <AuthFeedback type="error" message={error} onClose={() => setError('')} />}{pending ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{t('storeSuspended.pending')}</div> : <><label className="block text-sm font-bold text-slate-800">{t('storeSuspended.reasonLabel')}</label><textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={5} placeholder={t('storeSuspended.reasonPlaceholder')} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none ring-[#0789c5] focus:ring-2" /><Button type="button" variant="primary" size="lg" isLoading={submitting} onClick={() => void submit()} className="w-full">{t('storeSuspended.submit')}</Button></>}{requests.length ? <div className="border-t border-slate-100 pt-5"><p className="mb-3 text-sm font-bold text-slate-800">{t('storeSuspended.history')}</p><div className="space-y-2">{requests.map((request) => <div key={request.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-slate-800">{request.status}</p><p className="text-xs text-slate-500">{request.created_at ? new Date(request.created_at).toLocaleDateString() : ''}</p></div>{request.admin_notes && <p className="mt-2 text-xs leading-5 text-slate-600">{request.admin_notes}</p>}</div>)}</div></div> : null}<div className="flex flex-wrap gap-3"><Button type="button" variant="outline" isLoading={checking} onClick={() => void checkStatus()}>{t('storeSuspended.checkStatus')}</Button><Button type="button" variant="outline" onClick={() => void logout()}>{t('storeSuspended.signOut')}</Button></div></div>
  </SellerAuthShell>;
}

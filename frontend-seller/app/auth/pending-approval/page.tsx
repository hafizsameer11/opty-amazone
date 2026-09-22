'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { StoreService } from '@/services/store-service';
import { getSellerGateState } from '@/lib/seller-profile-gate';
import SellerAuthShell, { AuthFeedback } from '@/components/auth/SellerAuthShell';
import Button from '@/components/ui/Button';
import { useLanguage } from '@/contexts/LanguageContext';

export default function PendingApprovalPage() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();
  const { t } = useLanguage();
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  const checkStatus = useCallback(async () => {
    if (!isAuthenticated) return;
    setChecking(true);
    setError('');
    try {
      const response = await StoreService.getStore();
      const state = getSellerGateState(response.data?.store);
      if (state === 'ok') {
        router.replace('/dashboard');
      } else if (state === 'needs_store_setup') {
        router.replace('/dashboard?setup=1');
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || t('auth.statusCheckFailed'));
    } finally {
      setChecking(false);
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (!loading && !isAuthenticated) router.replace('/auth/login');
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    void checkStatus();
    const timer = window.setInterval(() => void checkStatus(), 15000);
    return () => window.clearInterval(timer);
  }, [checkStatus, isAuthenticated]);

  if (loading || !isAuthenticated) return null;

  return (
    <SellerAuthShell
      eyebrow={t('auth.applicationStatus')}
      title={t('auth.applicationReview')}
      description={t('auth.applicationDescription')}
      sideTitle={t('auth.reviewSideTitle')}
      sideDescription={t('auth.reviewSideDescription')}
      highlights={[t('auth.reviewBenefit1'), t('auth.reviewBenefit2'), t('auth.reviewBenefit3')]}
    >
      <div className="space-y-6">
        <div className="flex items-start gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-xl text-amber-700" aria-hidden="true">⌛</span>
          <div>
            <p className="font-bold text-slate-950">{t('auth.pendingApproval')}</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">{t('auth.pendingApprovalDescription')}</p>
          </div>
        </div>

        {error && <AuthFeedback type="error" message={error} onClose={() => setError('')} />}

        <div className="grid gap-3 sm:grid-cols-3">
          {[t('auth.applicationSubmitted'), t('auth.adminReview'), t('auth.storeActivation')].map((step, index) => (
            <div key={step} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${index === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-400 ring-1 ring-slate-200'}`}>{index === 0 ? '✓' : index + 1}</span>
              <p className="mt-3 text-sm font-semibold text-slate-800">{step}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{index === 0 ? t('auth.complete') : index === 1 ? t('auth.inProgress') : t('common.next')}</p>
            </div>
          ))}
        </div>

        <Button type="button" variant="primary" size="lg" isLoading={checking} onClick={() => void checkStatus()} className="w-full !rounded-xl !py-3.5">
          {t('auth.checkApproval')}
        </Button>
        <p className="text-center text-sm text-slate-500">{t('auth.updateSomething')} <Link href="/profile" className="font-bold text-[#0789c5] hover:text-[#006b99]">{t('auth.openProfile')}</Link></p>
      </div>
    </SellerAuthShell>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
import apiClient from '@/lib/api-client';
import SellerAuthShell, { AuthFeedback } from '@/components/auth/SellerAuthShell';
import SellerAuthInput from '@/components/auth/SellerAuthInput';
import { useLanguage } from '@/contexts/LanguageContext';

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

/** Narrows an Axios failure to the fields the API actually returns. */
type ApiFailure = {
  response?: {
    data?: { message?: string; errors?: Record<string, string[]> };
  };
};

const errorMessage = (cause: unknown, fallback: string): string => {
  const data = (cause as ApiFailure)?.response?.data;
  return data?.message ?? Object.values(data?.errors ?? {}).flat()[0] ?? fallback;
};

export default function VerifyEmailPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading, updateSessionUser } = useAuth();
  const { t } = useLanguage();
  const [code, setCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!loading && !isAuthenticated) router.replace('/auth/login');
  }, [isAuthenticated, loading, router]);

  // Someone who already confirmed their email has no reason to sit on this page.
  useEffect(() => {
    if (!loading && isAuthenticated && user?.email_verified_at) router.replace('/auth/verification');
  }, [isAuthenticated, loading, router, user?.email_verified_at]);

  useEffect(() => () => { if (cooldownTimer.current) clearInterval(cooldownTimer.current); }, []);

  const startCooldown = () => {
    setCooldown(RESEND_COOLDOWN_SECONDS);
    if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    cooldownTimer.current = setInterval(() => {
      setCooldown((seconds) => {
        if (seconds <= 1 && cooldownTimer.current) clearInterval(cooldownTimer.current);
        return Math.max(0, seconds - 1);
      });
    }, 1000);
  };

  const handleVerify = async (event: React.FormEvent) => {
    event.preventDefault();
    if (code.length !== CODE_LENGTH) return;
    setSaving(true);
    setError('');
    try {
      const response = await apiClient.post('/seller/profile/verify-email', { code });
      const verified = response.data?.data?.user as typeof user;
      if (verified) updateSessionUser(verified);
      router.push('/auth/verification');
    } catch (cause) {
      setError(errorMessage(cause, t('auth.verifyEmailFailed')));
      setCode('');
    } finally {
      setSaving(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError('');
    try {
      await apiClient.post('/seller/profile/verify-email/send');
      setCode('');
      setSuccess(t('auth.verificationCodeSent'));
      startCooldown();
    } catch (cause) {
      setError(errorMessage(cause, t('auth.resendCodeFailed')));
    } finally {
      setResending(false);
    }
  };

  if (loading || !isAuthenticated) return null;

  return (
    <SellerAuthShell
      eyebrow={t('auth.verifyEmailEyebrow')}
      title={t('auth.verifyEmailTitle')}
      description={t('auth.verifyEmailDescription')}
      sideTitle={t('auth.verifyEmailSideTitle')}
      sideDescription={t('auth.verifyEmailSideDescription')}
      steps={[t('auth.stepCreateAccount'), t('auth.stepVerifyEmail'), t('auth.stepBusinessDetails'), t('auth.stepStoreSetup')]}
      activeStep={1}
      wideForm
    >
      <div className="mb-7 flex items-start gap-4 rounded-2xl border border-cyan-100 bg-cyan-50/70 p-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-lg text-[#0789c5] shadow-sm">✉</span>
        <div className="min-w-0">
          <p className="font-bold text-slate-900">{t('auth.accountCreated')}</p>
          <p className="mt-1 text-sm leading-5 text-slate-600">{user?.email ? t('auth.codeSentTo', { email: user.email }) : t('auth.accountCreatedHint')}</p>
        </div>
      </div>

      {error && <div className="mb-5"><AuthFeedback type="error" message={error} onClose={() => setError('')} /></div>}
      {success && <div className="mb-5"><AuthFeedback type="success" message={success} onClose={() => setSuccess('')} /></div>}

      <form onSubmit={handleVerify} className="space-y-5" noValidate>
        <SellerAuthInput
          id="verify-email-code"
          label={t('auth.verificationCode')}
          type="text"
          icon="shield"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={CODE_LENGTH}
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH))}
          placeholder="000000"
          hint={t('auth.verificationCodeHint')}
          error={error ? '' : undefined}
          required
        />

        <div className="flex items-start gap-3 rounded-xl bg-slate-50 px-4 py-3.5 text-xs leading-5 text-slate-500">
          <span className="mt-0.5 text-[#0789c5]" aria-hidden="true">●</span>
          <p>{t('auth.verificationNotice')}</p>
        </div>

        <Button type="submit" variant="primary" size="lg" isLoading={saving} disabled={code.length !== CODE_LENGTH} className="w-full !rounded-xl !py-3.5">
          {t('auth.confirmEmail')}
        </Button>
      </form>

      <div className="mt-5 text-center">
        <button
          type="button"
          onClick={handleResend}
          disabled={resending || cooldown > 0}
          className="text-sm font-bold text-[#0789c5] transition hover:text-[#006b99] disabled:cursor-not-allowed disabled:text-slate-400"
        >
          {cooldown > 0 ? t('auth.resendCodeIn', { seconds: cooldown }) : t('auth.resendCode')}
        </button>
      </div>

      <div className="mt-7 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-slate-100 pt-6 text-sm text-slate-500">
        <Link href="/auth/login" className="font-bold text-[#0789c5] hover:text-[#006b99]">{t('auth.backToSignIn')}</Link>
        <span className="text-slate-300" aria-hidden="true">·</span>
        <Link href="/auth/pending-approval" className="font-bold text-[#0789c5] hover:text-[#006b99]">{t('auth.applicationStatus')}</Link>
      </div>
    </SellerAuthShell>
  );
}
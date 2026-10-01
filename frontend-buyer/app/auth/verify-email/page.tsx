'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import BuyerAuthShell, { BuyerAuthFeedback } from '@/components/auth/BuyerAuthShell';
import Button from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { userService } from '@/services/user-service';

type ApiFailure = { response?: { data?: { errors?: Record<string, string[]>; message?: string } } };

export default function VerifyBuyerEmailPage() {
  const router = useRouter();
  const { user, loading, completeEmailVerification } = useAuth();
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('We sent a 6-digit code to your registered email address.');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [seconds, setSeconds] = useState(60);

  useEffect(() => {
    if (!loading && !user) router.replace('/auth/login');
    if (!loading && user?.email_verified_at) router.replace('/');
  }, [loading, router, user]);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = window.setInterval(() => setSeconds((current) => Math.max(0, current - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [seconds]);

  const maskedEmail = useMemo(() => {
    if (!user?.email) return '';
    const [local, domain] = user.email.split('@');
    return `${local.slice(0, 2)}${'•'.repeat(Math.max(2, local.length - 2))}@${domain}`;
  }, [user?.email]);

  const readError = (value: unknown, fallback: string) => {
    const failure = value as ApiFailure;
    const errors = failure.response?.data?.errors;
    return errors?.code?.[0] || errors?.email?.[0] || Object.values(errors || {}).flat()[0] || failure.response?.data?.message || fallback;
  };

  const verify = async (event: React.FormEvent) => {
    event.preventDefault();
    if (code.length !== 6) { setError('Enter the complete 6-digit verification code.'); return; }
    try {
      setSubmitting(true); setError('');
      const verifiedUser = await userService.verifyEmail(code);
      completeEmailVerification(verifiedUser);
      router.replace('/');
    } catch (failure) { setError(readError(failure, 'We could not verify that code. Please try again.')); }
    finally { setSubmitting(false); }
  };

  const resend = async () => {
    try {
      setSubmitting(true); setError('');
      await userService.sendEmailVerification();
      setSeconds(60); setMessage('A fresh verification code has been sent.');
    } catch (failure) { setError(readError(failure, 'We could not send a new code. Please try again.')); }
    finally { setSubmitting(false); }
  };

  if (loading || !user) return <main className="flex h-[100dvh] items-center justify-center bg-[#f2f7f8] text-slate-500">Loading verification…</main>;

  return <BuyerAuthShell eyebrow="Account security" title="Verify your email" description={<>Enter the code sent to <strong className="font-semibold text-slate-700">{maskedEmail}</strong> to activate your buyer account.</>} visualTitle="One quick step to start shopping." visualDescription="Email verification keeps your account, order updates, and wallet notifications secure.">
    <form onSubmit={verify} className="space-y-5" noValidate>
      {error && <BuyerAuthFeedback type="error" message={error} onClose={() => setError('')} />}
      {message && <BuyerAuthFeedback type="info" message={message} onClose={() => setMessage('')} />}
      <div>
        <label htmlFor="email-verification-code" className="mb-2 block text-sm font-semibold text-slate-800">Verification code</label>
        <input id="email-verification-code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" autoFocus placeholder="000000" className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-center text-2xl font-bold tracking-[0.45em] text-slate-900 outline-none transition focus:border-[#087f8c] focus:bg-white focus:ring-4 focus:ring-cyan-100" />
        <p className="mt-2 text-xs leading-5 text-slate-500">Codes expire after 15 minutes. For your security, do not share this code.</p>
      </div>
      <Button type="submit" variant="primary" size="lg" isLoading={submitting} className="w-full !rounded-2xl !bg-[#087f8c] !py-3.5 hover:!bg-[#05616b]">Verify email and continue</Button>
      <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-5 text-sm">
        <span className="text-slate-500">Didn’t receive it?</span>
        <button type="button" disabled={seconds > 0 || submitting} onClick={resend} className="font-bold text-[#087f8c] disabled:cursor-not-allowed disabled:text-slate-400">{seconds > 0 ? `Resend in ${seconds}s` : 'Resend code'}</button>
      </div>
    </form>
  </BuyerAuthShell>;
}

'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AuthService } from '@/services/auth-service';
import Button from '@/components/ui/Button';
import Link from 'next/link';
import BuyerAuthShell, { BuyerAuthFeedback } from '@/components/auth/BuyerAuthShell';
import BuyerAuthInput from '@/components/auth/BuyerAuthInput';

function apiError(error: any, fallback: string) {
  return error?.response?.data?.errors?.code?.[0]
    || error?.response?.data?.errors?.email?.[0]
    || error?.response?.data?.errors?.password?.[0]
    || error?.response?.data?.message
    || fallback;
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [code, setCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const verifyCode = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true); setError(''); setNotice('');
    try {
      const response = await AuthService.verifyPasswordResetCode(email.trim(), code);
      setResetToken(response.reset_token);
      setNotice('Code confirmed. Choose a new password.');
    } catch (err: any) {
      setError(apiError(err, 'We could not verify that code. Please try again.'));
    } finally { setIsLoading(false); }
  };

  const resetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirmation) { setError('Passwords do not match.'); return; }
    setIsLoading(true); setError(''); setNotice('');
    try {
      await AuthService.resetPassword({
        email: email.trim(),
        reset_token: resetToken,
        password,
        password_confirmation: confirmation,
      });
      window.location.assign('/auth/login?reset=success');
    } catch (err: any) {
      setError(apiError(err, 'We could not update your password. Please try again.'));
    } finally { setIsLoading(false); }
  };

  const resendCode = async () => {
    setIsLoading(true); setError(''); setNotice('');
    try {
      await AuthService.forgotPassword({ email: email.trim() });
      setCode('');
      setNotice('If that email belongs to an account, a new verification code has been sent.');
    } catch (err: any) {
      setError(apiError(err, 'We could not send a new code. Please try again.'));
    } finally { setIsLoading(false); }
  };

  return (
    <BuyerAuthShell
      eyebrow="Secure account recovery"
      title={resetToken ? 'Choose a new password' : 'Check your inbox'}
      description={resetToken ? 'Your code is confirmed. Create a new password to keep your account, orders, and preferences protected.' : 'Enter the six-digit verification code sent to your registered VistaExpress email.'}
      visualTitle="Your account, protected."
      visualDescription="A short-lived verification code keeps your saved items, order history, and preferences private."
    >
      {error && <BuyerAuthFeedback type="error" message={error} onClose={() => setError('')} />}
      {notice && <div className="mb-5"><BuyerAuthFeedback type="success" message={notice} onClose={() => setNotice('')} /></div>}
      {!resetToken ? (
        <form onSubmit={verifyCode} className="space-y-5" noValidate>
          <BuyerAuthInput id="reset-email" label="Email address" type="email" icon="mail" value={email} onChange={(event) => setEmail(event.target.value)} error={!email ? 'Enter the email on your account.' : undefined} placeholder="you@example.com" autoComplete="email" required />
          <BuyerAuthInput id="reset-code" label="Verification code" inputMode="numeric" icon="lock" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Six-digit code" autoComplete="one-time-code" maxLength={6} required />
          <Button type="submit" variant="primary" size="lg" isLoading={isLoading} disabled={code.length !== 6} className="w-full !rounded-2xl !bg-[#087f8c] !py-3.5 hover:!bg-[#05616b]">Verify code</Button>
          <button type="button" disabled={isLoading} onClick={() => void resendCode()} className="w-full text-sm font-bold text-[#087f8c] disabled:opacity-60 hover:text-[#05616b]">Resend code</button>
        </form>
      ) : (
        <form onSubmit={resetPassword} className="space-y-5" noValidate>
          <BuyerAuthInput id="reset-email-confirmed" label="Email address" type="email" icon="mail" value={email} disabled required />
          <BuyerAuthInput id="reset-password" label="New password" type="password" icon="lock" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" autoComplete="new-password" required />
          <BuyerAuthInput id="reset-password-confirmation" label="Confirm new password" type="password" icon="lock" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Repeat your password" autoComplete="new-password" required />
          <Button type="submit" variant="primary" size="lg" isLoading={isLoading} className="w-full !rounded-2xl !bg-[#087f8c] !py-3.5 hover:!bg-[#05616b]">Set new password</Button>
        </form>
      )}
      <div className="mt-7 border-t border-slate-100 pt-6 text-center text-sm text-slate-500"><Link href="/auth/login" className="font-bold text-[#087f8c] hover:text-[#05616b]">Back to sign in</Link></div>
    </BuyerAuthShell>
  );
}

export default function ResetPasswordPage() {
  return <Suspense fallback={<main className="flex h-[100dvh] items-center justify-center bg-[#f2f7f8] text-slate-500">Loading secure reset…</main>}><ResetPasswordForm /></Suspense>;
}
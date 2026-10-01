'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import Button from '@/components/ui/Button';
import SellerAuthShell, { AuthFeedback } from '@/components/auth/SellerAuthShell';
import SellerAuthInput from '@/components/auth/SellerAuthInput';
import { AuthService } from '@/services/auth-service';

function apiError(error: any, fallback: string) {
  return error?.response?.data?.errors?.code?.[0]
    || error?.response?.data?.errors?.email?.[0]
    || error?.response?.data?.errors?.password?.[0]
    || error?.response?.data?.message
    || fallback;
}

function ResetPasswordPageContent() {
  const search = useSearchParams();
  const [email, setEmail] = useState(search.get('email') || '');
  const [code, setCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const verify = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await AuthService.verifyPasswordResetCode(email.trim(), code);
      setResetToken(response.reset_token);
      setNotice('Code confirmed. Choose a new password.');
    } catch (cause) { setError(apiError(cause, 'We could not verify that code.')); } finally { setBusy(false); }
  };

  const reset = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirmation) { setError('Passwords do not match.'); return; }
    setBusy(true); setError('');
    try {
      await AuthService.resetPassword(email.trim(), resetToken, password, confirmation);
      window.location.assign('/auth/login?reset=success');
    } catch (cause) { setError(apiError(cause, 'We could not update your password.')); } finally { setBusy(false); }
  };

  const resend = async () => {
    setBusy(true); setError(''); setNotice('');
    try { await AuthService.forgotPassword({ email: email.trim() }); setCode(''); setNotice('A new verification code has been sent if that email belongs to a seller account.'); } catch (cause) { setError(apiError(cause, 'We could not send a new code.')); } finally { setBusy(false); }
  };

  return (
    <SellerAuthShell eyebrow="Account recovery" title={resetToken ? 'Choose a new password.' : 'Check your inbox.'} description={resetToken ? 'Your code is confirmed. Create a new password to secure your Seller Hub account.' : 'Enter the six-digit verification code sent to your registered seller email.'} sideTitle="Back in control, quickly." sideDescription="A short-lived verification code keeps your Seller Hub account protected.">
      {error && <AuthFeedback type="error" message={error} onClose={() => setError('')} />}
      {notice && <div className="mb-5"><AuthFeedback type="success" message={notice} onClose={() => setNotice('')} /></div>}
      {!resetToken ? <form onSubmit={verify} className="space-y-5" noValidate>
        <SellerAuthInput id="reset-email" label="Seller email address" type="email" icon="mail" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@store.com" autoComplete="email" required />
        <SellerAuthInput id="reset-code" label="Verification code" inputMode="numeric" icon="lock" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Six-digit code" autoComplete="one-time-code" maxLength={6} required />
        <Button type="submit" variant="primary" size="lg" isLoading={busy} disabled={code.length !== 6} className="w-full !rounded-xl !py-3.5">Verify code</Button>
        <button type="button" disabled={busy} onClick={() => void resend()} className="w-full text-sm font-bold text-[#0789c5] disabled:opacity-60">Resend code</button>
      </form> : <form onSubmit={reset} className="space-y-5" noValidate>
        <SellerAuthInput id="reset-email" label="Seller email address" type="email" icon="mail" value={email} disabled />
        <SellerAuthInput id="new-password" label="New password" type="password" icon="lock" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" autoComplete="new-password" required />
        <SellerAuthInput id="confirm-password" label="Confirm new password" type="password" icon="lock" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Repeat your password" autoComplete="new-password" required />
        <Button type="submit" variant="primary" size="lg" isLoading={busy} className="w-full !rounded-xl !py-3.5">Save new password</Button>
      </form>}
      <div className="mt-7 border-t border-slate-100 pt-6 text-center text-sm text-slate-500">Remembered your password? <Link href="/auth/login" className="font-bold text-[#0789c5] hover:text-[#006b99]">Back to sign in</Link></div>
    </SellerAuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <ResetPasswordPageContent />
    </Suspense>
  );
}

'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AuthService } from '@/services/auth-service';
import Button from '@/components/ui/Button';
import Link from 'next/link';
import BuyerAuthShell, { BuyerAuthFeedback } from '@/components/auth/BuyerAuthShell';
import BuyerAuthInput from '@/components/auth/BuyerAuthInput';

const resetPasswordSchema = z.object({ email: z.string().email('Enter a valid email address'), password: z.string().min(8, 'Password must be at least 8 characters'), password_confirmation: z.string(), token: z.string().min(1, 'Token is required') }).refine((data) => data.password === data.password_confirmation, { message: "Passwords don't match", path: ['password_confirmation'] });
type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState('');
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<ResetPasswordFormData>({ resolver: zodResolver(resetPasswordSchema) });

  useEffect(() => {
    const tokenParam = searchParams.get('token') || '';
    const emailParam = searchParams.get('email') || '';
    setToken(tokenParam);
    if (tokenParam) setValue('token', tokenParam);
    if (emailParam) setValue('email', emailParam);
    if (!tokenParam || !emailParam) setError('This reset link is incomplete or expired. Please request a new one.');
  }, [searchParams, setValue]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    try {
      setIsLoading(true); setError(''); setSuccess('');
      const response = await AuthService.resetPassword(data);
      setSuccess(response.message || 'Password reset successful.');
      setTimeout(() => router.push('/auth/login'), 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.errors?.email?.[0] || 'Password reset failed. Please try again.');
    } finally { setIsLoading(false); }
  };

  return (
    <BuyerAuthShell eyebrow="Secure account recovery" title="Choose a new password" description="Create a fresh password and return to shopping with confidence." visualTitle="Your account, protected." visualDescription="A secure reset keeps your saved items, order history, and preferences private." >
      <div className="mb-7 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fff0dc] text-2xl text-[#c26d3e]">⌑</div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {error && <BuyerAuthFeedback type="error" message={error} onClose={() => setError('')} />}
        {success && <BuyerAuthFeedback type="success" message={success} />}
        <BuyerAuthInput id="reset-email" label="Email address" type="email" icon="mail" {...register('email')} error={errors.email?.message} placeholder="you@example.com" disabled={Boolean(searchParams.get('email'))} required />
        <input type="hidden" {...register('token')} />
        <BuyerAuthInput id="reset-password" label="New password" type="password" icon="lock" {...register('password')} error={errors.password?.message} placeholder="At least 8 characters" autoComplete="new-password" required />
        <BuyerAuthInput id="reset-password-confirmation" label="Confirm new password" type="password" icon="lock" {...register('password_confirmation')} error={errors.password_confirmation?.message} placeholder="Repeat your password" autoComplete="new-password" required />
        <Button type="submit" variant="primary" size="lg" isLoading={isLoading} disabled={!token} className="w-full !rounded-2xl !bg-[#087f8c] !py-3.5 hover:!bg-[#05616b]">Set new password</Button>
      </form>
      <div className="mt-7 border-t border-slate-100 pt-6 text-center text-sm text-slate-500"><Link href="/auth/login" className="font-bold text-[#087f8c] hover:text-[#05616b]">Back to sign in</Link></div>
    </BuyerAuthShell>
  );
}

export default function ResetPasswordPage() {
  return <Suspense fallback={<main className="flex h-[100dvh] items-center justify-center bg-[#f2f7f8] text-slate-500">Loading secure reset…</main>}><ResetPasswordForm /></Suspense>;
}

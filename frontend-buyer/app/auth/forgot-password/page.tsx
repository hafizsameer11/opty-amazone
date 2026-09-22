'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AuthService } from '@/services/auth-service';
import Button from '@/components/ui/Button';
import Link from 'next/link';
import BuyerAuthShell, { BuyerAuthFeedback } from '@/components/auth/BuyerAuthShell';
import BuyerAuthInput from '@/components/auth/BuyerAuthInput';

const forgotPasswordSchema = z.object({ email: z.string().email('Enter a valid email address') });
type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordFormData>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      setIsLoading(true); setError(''); setSuccess('');
      const response = await AuthService.forgotPassword(data);
      setSuccess(response.message || 'Password reset link sent to your email.');
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.errors?.email?.[0] || 'Failed to send the reset link. Please try again.');
    } finally { setIsLoading(false); }
  };

  return (
    <BuyerAuthShell eyebrow="Account recovery" title="Get back to your shopping" description="Enter the email on your VistaExpress account and we’ll send you a secure password reset link." visualTitle="Your favorites are still here." visualDescription="We’ll help you get back to the products, stores, and orders you care about.">
      <div className="mb-7 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e5f7f4] text-2xl text-[#087f8c]">⌁</div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {error && <BuyerAuthFeedback type="error" message={error} onClose={() => setError('')} />}
        {success && <BuyerAuthFeedback type="success" message={success} onClose={() => setSuccess('')} />}
        <BuyerAuthInput id="forgot-email" label="Email address" type="email" icon="mail" {...register('email')} error={errors.email?.message} placeholder="you@example.com" autoComplete="email" required />
        <Button type="submit" variant="primary" size="lg" isLoading={isLoading} className="w-full !rounded-2xl !bg-[#087f8c] !py-3.5 hover:!bg-[#05616b]">Send reset link</Button>
      </form>
      <div className="mt-7 border-t border-slate-100 pt-6 text-center text-sm text-slate-500">Remembered your password? <Link href="/auth/login" className="font-bold text-[#087f8c] hover:text-[#05616b]">Back to sign in</Link></div>
    </BuyerAuthShell>
  );
}

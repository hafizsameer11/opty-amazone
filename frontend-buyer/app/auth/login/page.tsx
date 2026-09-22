'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
import Link from 'next/link';
import BuyerAuthShell, { BuyerAuthFeedback } from '@/components/auth/BuyerAuthShell';
import BuyerAuthInput from '@/components/auth/BuyerAuthInput';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsLoading(true);
      setError('');
      await login(data);
      router.push(searchParams.get('redirect') || '/');
    } catch (err: any) {
      setError(err.response?.data?.errors?.email?.[0] || err.response?.data?.errors?.password?.[0] || err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BuyerAuthShell eyebrow="Welcome back" title="See what’s waiting for you" description="Sign in to discover your saved items, follow your favorite stores, and keep every order within reach.">
      <div className="mb-7 flex items-start justify-between gap-4">
        <div><p className="text-lg font-bold text-slate-950">Sign in to your account</p><p className="mt-1 text-sm text-slate-500">Use the email linked to your VistaExpress account.</p></div>
        <span className="hidden shrink-0 rounded-full bg-[#e5f7f4] px-3 py-1 text-xs font-bold text-[#087f8c] sm:inline-flex">Shop smarter</span>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {error && <BuyerAuthFeedback type="error" message={error} onClose={() => setError('')} />}
        <BuyerAuthInput id="buyer-email" label="Email address" type="email" icon="mail" {...register('email')} error={errors.email?.message} placeholder="you@example.com" autoComplete="email" required />
        <BuyerAuthInput id="buyer-password" label="Password" type="password" icon="lock" {...register('password')} error={errors.password?.message} placeholder="Enter your password" autoComplete="current-password" required />
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-600"><input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-[#087f8c] focus:ring-cyan-200" />Remember me</label>
          <Link href="/auth/forgot-password" className="text-sm font-bold text-[#087f8c] hover:text-[#05616b]">Forgot password?</Link>
        </div>
        <Button type="submit" variant="primary" size="lg" isLoading={isLoading} className="mt-2 w-full !rounded-2xl !bg-[#087f8c] !py-3.5 hover:!bg-[#05616b]">Sign in</Button>
      </form>
      <div className="mt-7 border-t border-slate-100 pt-6 text-center text-sm text-slate-500">New to VistaExpress? <Link href="/auth/choose" className="font-bold text-[#087f8c] hover:text-[#05616b]">Create an account</Link></div>
    </BuyerAuthShell>
  );
}

export default function LoginPage() {
  return <Suspense fallback={<main className="flex h-[100dvh] items-center justify-center bg-[#f2f7f8] text-slate-500">Loading your account…</main>}><LoginForm /></Suspense>;
}

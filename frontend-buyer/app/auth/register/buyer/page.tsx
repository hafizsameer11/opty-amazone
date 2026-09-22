'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
import Link from 'next/link';
import BuyerAuthShell, { BuyerAuthFeedback } from '@/components/auth/BuyerAuthShell';
import BuyerAuthInput from '@/components/auth/BuyerAuthInput';
import { clearReferralAttribution, readReferralAttribution, referralService, storeReferralAttribution } from '@/services/referral-service';

const registerSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  email: z.string().email('Enter a valid email address'),
  phone_country_code: z.string().min(1, 'Select a country code'),
  phone: z.string().min(5, 'Enter a valid phone number'),
  verification_code: z.string().max(12, 'Verification code is too long').optional().or(z.literal('')),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  password_confirmation: z.string(),
  referral_code: z.string().max(48).optional(),
  referral_attribution_token: z.string().max(64).optional(),
}).refine((data) => data.password === data.password_confirmation, { message: "Passwords don't match", path: ['password_confirmation'] });

type RegisterFormData = z.infer<typeof registerSchema>;
type ApiFailure = { response?: { data?: { errors?: Record<string, string[]>; message?: string } } };

const PHONE_COUNTRIES = [
  ['+1', 'United States / Canada'],
  ['+44', 'United Kingdom'],
  ['+33', 'France'],
  ['+39', 'Italy'],
  ['+49', 'Germany'],
  ['+34', 'Spain'],
  ['+31', 'Netherlands'],
  ['+32', 'Belgium'],
  ['+41', 'Switzerland'],
  ['+43', 'Austria'],
  ['+45', 'Denmark'],
  ['+46', 'Sweden'],
  ['+47', 'Norway'],
  ['+48', 'Poland'],
  ['+351', 'Portugal'],
  ['+30', 'Greece'],
  ['+90', 'Turkey'],
  ['+91', 'India'],
  ['+92', 'Pakistan'],
  ['+971', 'United Arab Emirates'],
  ['+966', 'Saudi Arabia'],
  ['+20', 'Egypt'],
  ['+27', 'South Africa'],
  ['+61', 'Australia'],
  ['+64', 'New Zealand'],
  ['+81', 'Japan'],
  ['+82', 'South Korea'],
  ['+86', 'China'],
  ['+55', 'Brazil'],
  ['+52', 'Mexico'],
] as const;

function BuyerRegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register: registerUser } = useAuth();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register, handleSubmit, formState: { errors }, setValue } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { phone_country_code: '+39' },
  });

  useEffect(() => {
    const code = searchParams.get('ref')?.trim().toUpperCase();
    const savedToken = readReferralAttribution();
    if (savedToken) setValue('referral_attribution_token', savedToken);
    if (!code) return;
    setValue('referral_code', code);
    referralService.track(code).then(({ token }) => { storeReferralAttribution(token); setValue('referral_attribution_token', token); }).catch(() => {});
  }, [searchParams, setValue]);

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setIsLoading(true);
      setError('');
      const localPhone = data.phone.replace(/[^0-9]/g, '');
      await registerUser({
        name: data.name,
        email: data.email,
        phone: `${data.phone_country_code}${localPhone}`,
        verification_code: data.verification_code?.trim() || undefined,
        password: data.password,
        password_confirmation: data.password_confirmation,
        referral_code: data.referral_code,
        referral_attribution_token: data.referral_attribution_token,
      });
      clearReferralAttribution();
      router.push('/');
    } catch (err: unknown) {
      const failure = err as ApiFailure;
      const errors = failure.response?.data?.errors;
      const firstError = errors ? Object.values(errors).find((value) => Array.isArray(value) && value.length)?.[0] : undefined;
      setError(errors?.email?.[0] || errors?.password?.[0] || errors?.name?.[0] || errors?.phone?.[0] || errors?.verification_code?.[0] || firstError || failure.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BuyerAuthShell eyebrow="Join the marketplace" title="Create your buyer account" description="Save your favorites, follow optical stores, and make your next pair easier to find." wideForm>
      <div className="mb-7 flex items-start justify-between gap-4"><div><p className="text-lg font-bold text-slate-950">Your shopping profile</p><p className="mt-1 text-sm text-slate-500">A few details and you’re ready to explore.</p></div><span className="hidden shrink-0 rounded-full bg-[#fff0dc] px-3 py-1 text-xs font-bold text-[#b76332] sm:inline-flex">Free to join</span></div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {error && <BuyerAuthFeedback type="error" message={error} onClose={() => setError('')} />}
        <div className="grid min-w-0 grid-cols-1 gap-5 sm:grid-cols-2">
          <BuyerAuthInput id="buyer-name" label="Full name" type="text" icon="user" {...register('name')} error={errors.name?.message} placeholder="Your full name" autoComplete="name" required />
          <div className="min-w-0">
            <label htmlFor="buyer-phone" className="mb-2 flex items-center justify-between gap-3 text-sm font-semibold text-slate-800">
              <span>Phone number<span className="ml-1 text-[#087f8c]">*</span></span>
              <span className="text-xs font-medium text-slate-400">Required</span>
            </label>
            <div className="flex min-w-0 gap-2">
              <select
                aria-label="Phone country code"
                {...register('phone_country_code')}
                className="h-[3.3rem] w-[7.6rem] shrink-0 rounded-2xl border border-slate-200 bg-slate-50/70 px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#087f8c] focus:bg-white focus:ring-4 focus:ring-cyan-100"
              >
                {PHONE_COUNTRIES.map(([code, country]) => <option key={code} value={code}>{code} · {country}</option>)}
              </select>
              <BuyerAuthInput id="buyer-phone" label="" type="tel" icon="phone" {...register('phone')} error={errors.phone?.message} placeholder="20 1234 5678" autoComplete="tel-national" className="min-w-0" />
            </div>
            {errors.phone_country_code?.message && <p className="mt-1.5 text-xs font-medium text-red-600">{errors.phone_country_code.message}</p>}
          </div>
        </div>
        <BuyerAuthInput id="buyer-register-email" label="Email address" type="email" icon="mail" {...register('email')} error={errors.email?.message} placeholder="you@example.com" autoComplete="email" required />
        <BuyerAuthInput id="buyer-verification-code" label="Verification code" type="text" icon="key" {...register('verification_code')} error={errors.verification_code?.message} placeholder="Enter your email or SMS code" inputMode="numeric" hint="If provided" />
        <BuyerAuthInput id="buyer-referral-code" label="Referral code" type="text" icon="gift" {...register('referral_code')} error={errors.referral_code?.message} placeholder="Enter a code if you have one" hint="Optional" />
        <div className="grid min-w-0 grid-cols-1 gap-5 sm:grid-cols-2">
          <BuyerAuthInput id="buyer-password" label="Create password" type="password" icon="lock" {...register('password')} error={errors.password?.message} placeholder="At least 8 characters" autoComplete="new-password" required />
          <BuyerAuthInput id="buyer-password-confirmation" label="Confirm password" type="password" icon="lock" {...register('password_confirmation')} error={errors.password_confirmation?.message} placeholder="Repeat your password" autoComplete="new-password" required />
        </div>
        <input type="hidden" {...register('referral_attribution_token')} />
        <div className="flex items-start gap-3 rounded-2xl bg-[#f2f7f8] px-4 py-3.5 text-xs leading-5 text-slate-500"><span className="mt-0.5 text-[#f29b66]" aria-hidden="true">✦</span><p>Create a profile once and keep your saved items, followed stores, orders, and rewards together.</p></div>
        <Button type="submit" variant="primary" size="lg" isLoading={isLoading} className="w-full !rounded-2xl !bg-[#087f8c] !py-3.5 hover:!bg-[#05616b]">Create buyer account</Button>
        <p className="text-center text-xs leading-5 text-slate-400">By continuing, you agree to our Terms of Service and Privacy Policy.</p>
      </form>
      <div className="mt-7 border-t border-slate-100 pt-6 text-center text-sm text-slate-500"><Link href="/auth/choose" className="font-bold text-[#087f8c] hover:text-[#05616b]">← Choose another account type</Link><span className="mx-2 text-slate-300">·</span>Already registered? <Link href="/auth/login" className="font-bold text-[#087f8c] hover:text-[#05616b]">Sign in</Link></div>
    </BuyerAuthShell>
  );
}

export default function BuyerRegisterPage() {
  return <Suspense fallback={<main className="flex h-[100dvh] items-center justify-center bg-[#f2f7f8] text-slate-500">Preparing your account…</main>}><BuyerRegisterContent /></Suspense>;
}

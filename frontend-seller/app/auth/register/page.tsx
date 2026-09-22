'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
import Link from 'next/link';
import SellerAuthShell, { AuthFeedback } from '@/components/auth/SellerAuthShell';
import SellerAuthInput from '@/components/auth/SellerAuthInput';
import { useLanguage } from '@/contexts/LanguageContext';

type RegisterFormData = { name: string; email: string; phone_country_code: string; phone: string; password: string; password_confirmation: string };

const PHONE_COUNTRIES = [
  ['+1', 'United States / Canada'], ['+44', 'United Kingdom'], ['+33', 'France'],
  ['+39', 'Italy'], ['+49', 'Germany'], ['+34', 'Spain'], ['+31', 'Netherlands'],
  ['+32', 'Belgium'], ['+41', 'Switzerland'], ['+43', 'Austria'], ['+45', 'Denmark'],
  ['+46', 'Sweden'], ['+47', 'Norway'], ['+48', 'Poland'], ['+351', 'Portugal'],
  ['+30', 'Greece'], ['+90', 'Turkey'], ['+91', 'India'], ['+971', 'United Arab Emirates'],
  ['+966', 'Saudi Arabia'], ['+20', 'Egypt'], ['+27', 'South Africa'], ['+61', 'Australia'],
  ['+64', 'New Zealand'], ['+81', 'Japan'], ['+82', 'South Korea'], ['+86', 'China'],
  ['+55', 'Brazil'], ['+52', 'Mexico'],
] as const;

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser } = useAuth();
  const { t } = useLanguage();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const registerSchema = z.object({
    name: z.string().min(3, t('auth.storeNameMin')), email: z.string().email(t('auth.validEmail')),
    phone_country_code: z.string().min(1, t('auth.countryCodeRequired')), phone: z.string().min(5, t('auth.validPhone')),
    password: z.string().min(8, t('auth.passwordMin')), password_confirmation: z.string(),
  }).refine((data) => data.password === data.password_confirmation, { message: t('auth.passwordsMismatch'), path: ['password_confirmation'] });
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormData>({ resolver: zodResolver(registerSchema), defaultValues: { phone_country_code: '+39' } });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setIsLoading(true);
      setError('');
      const localPhone = data.phone.replace(/[^0-9]/g, '');
      await registerUser({ ...data, phone: `${data.phone_country_code}${localPhone}` });
      router.push('/auth/verification');
    } catch (err: any) {
      const apiErrors = err.response?.data?.errors as Record<string, string[]> | undefined;
      const firstFieldError = apiErrors ? Object.values(apiErrors).find((value) => Array.isArray(value) && value.length)?.[0] : undefined;
      setError(apiErrors?.email?.[0] || apiErrors?.password?.[0] || apiErrors?.name?.[0] || apiErrors?.phone?.[0] || firstFieldError || err.response?.data?.message || t('auth.registrationFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SellerAuthShell
      eyebrow={t('auth.registerEyebrow')}
      title={t('auth.createAccount')}
      description={t('auth.registerDescription')}
      sideTitle={t('auth.registerSideTitle')}
      sideDescription={t('auth.registerSideDescription')}
      steps={[t('auth.stepCreateAccount'), t('auth.stepBusinessDetails'), t('auth.stepStoreSetup')]}
      activeStep={0}
      stepsLayout="grid"
      wideForm
    >
      <div className="mb-7 flex items-start justify-between gap-4">
        <div>
          <p className="text-lg font-bold text-slate-950">{t('auth.sellerRegistration')}</p>
          <p className="mt-1 text-sm text-slate-500">{t('auth.registerHint')}</p>
        </div>
        <span className="hidden shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500 sm:inline-flex">{t('auth.stepOf', { current: 1, total: 3 })}</span>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {error && <AuthFeedback type="error" message={error} onClose={() => setError('')} />}
        <div className="grid min-w-0 grid-cols-1 gap-5 sm:grid-cols-2">
          <SellerAuthInput id="store-name" label={t('auth.storeName')} type="text" icon="store" {...register('name')} error={errors.name?.message} placeholder={t('auth.storeNamePlaceholder')} autoComplete="organization" required />
          <div className="min-w-0">
            <label htmlFor="seller-phone" className="mb-2 flex items-center justify-between gap-3 text-sm font-semibold text-slate-800">
              <span>{t('auth.phoneNumber')}<span className="ml-1 text-[#0789c5]">*</span></span>
              <span className="text-xs font-medium text-slate-400">{t('common.required')}</span>
            </label>
            <div className="flex min-w-0 gap-2">
              <select aria-label={t('auth.phoneCountryCode')} {...register('phone_country_code')} className="h-[3.25rem] w-[7.5rem] shrink-0 rounded-xl border border-slate-200 bg-slate-50/70 px-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-[#0795ce] focus:bg-white focus:ring-4 focus:ring-cyan-100">
                {PHONE_COUNTRIES.map(([code, country]) => <option key={code} value={code}>{code} · {country}</option>)}
              </select>
              <SellerAuthInput id="seller-phone" label="" type="tel" icon="phone" {...register('phone')} error={errors.phone?.message} placeholder="20 1234 5678" autoComplete="tel-national" className="min-w-0" />
            </div>
            {errors.phone_country_code?.message && <p className="mt-1.5 text-xs font-medium text-red-600">{errors.phone_country_code.message}</p>}
          </div>
        </div>
        <SellerAuthInput id="seller-register-email" label={t('auth.businessEmail')} type="email" icon="mail" {...register('email')} error={errors.email?.message} placeholder={t('auth.businessEmailPlaceholder')} autoComplete="email" required />
        <div className="grid min-w-0 grid-cols-1 gap-5 sm:grid-cols-2">
          <SellerAuthInput id="seller-register-password" label={t('auth.createPassword')} type="password" icon="lock" {...register('password')} error={errors.password?.message} placeholder={t('auth.passwordMinPlaceholder')} autoComplete="new-password" required />
          <SellerAuthInput id="seller-register-password-confirmation" label={t('auth.confirmPassword')} type="password" icon="lock" {...register('password_confirmation')} error={errors.password_confirmation?.message} placeholder={t('auth.repeatPassword')} autoComplete="new-password" required />
        </div>

        <div className="flex items-start gap-3 rounded-xl bg-slate-50 px-4 py-3.5 text-xs leading-5 text-slate-500">
          <span className="mt-0.5 text-[#0789c5]" aria-hidden="true">●</span>
          <p>{t('auth.businessEmailNotice')}</p>
        </div>

        <Button type="submit" variant="primary" size="lg" isLoading={isLoading} className="w-full !rounded-xl !py-3.5">{t('auth.createSellerSubmit')}</Button>
        <p className="text-center text-xs leading-5 text-slate-400">{t('auth.termsNotice')}</p>
      </form>

      <div className="mt-7 border-t border-slate-100 pt-6 text-center text-sm text-slate-500">
        {t('auth.alreadyAccount')} <Link href="/auth/login" className="font-bold text-[#0789c5] hover:text-[#006b99]">{t('auth.signIn')}</Link>
        <span className="mx-2 text-slate-300">·</span>
        <a href="https://buyer.vistaexpress.it/auth/choose" className="font-bold text-[#0789c5] hover:text-[#006b99]">{t('auth.shopBuyer')}</a>
      </div>
    </SellerAuthShell>
  );
}

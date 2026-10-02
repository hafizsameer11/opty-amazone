'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
import Link from 'next/link';
import SellerAuthShell, { AuthFeedback } from '@/components/auth/SellerAuthShell';
import SellerAuthInput from '@/components/auth/SellerAuthInput';
import CountryCodeSelect from '@/components/auth/CountryCodeSelect';
import { useLanguage } from '@/contexts/LanguageContext';
import { DEFAULT_COUNTRY_ISO, findPhoneCountry, nationalNumberMaxLength, toE164 } from '@/lib/phone-countries';

type RegisterFormData = { name: string; email: string; phone_country_iso: string; phone: string; password: string; password_confirmation: string };

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser } = useAuth();
  const { t } = useLanguage();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const registerSchema = z.object({
    name: z.string().min(3, t('auth.storeNameMin')), email: z.string().email(t('auth.validEmail')),
    phone_country_iso: z.string().min(1, t('auth.countryCodeRequired')),
    phone: z.string().min(6, t('auth.validPhone')),
    password: z.string().min(8, t('auth.passwordMin')), password_confirmation: z.string(),
  }).refine((data) => data.password === data.password_confirmation, { message: t('auth.passwordsMismatch'), path: ['password_confirmation'] });
  const { register, control, handleSubmit, watch, formState: { errors } } = useForm<RegisterFormData>({ resolver: zodResolver(registerSchema), defaultValues: { phone_country_iso: DEFAULT_COUNTRY_ISO } });
  // Cap the national part so the combined E.164 value stays inside the API's 20 character limit.
  const phoneMaxLength = nationalNumberMaxLength(findPhoneCountry(watch('phone_country_iso')).dial);

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setIsLoading(true);
      setError('');
      const country = findPhoneCountry(data.phone_country_iso);
      await registerUser({
        name: data.name,
        email: data.email,
        phone: toE164(country.dial, data.phone),
        password: data.password,
        password_confirmation: data.password_confirmation,
      });
      router.push('/auth/verify-email');
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
      steps={[t('auth.stepCreateAccount'), t('auth.stepVerifyEmail'), t('auth.stepBusinessDetails'), t('auth.stepStoreSetup')]}
      activeStep={0}
      stepsLayout="grid"
      wideForm
    >
      <div className="mb-7 flex items-start justify-between gap-4">
        <div>
          <p className="text-lg font-bold text-slate-950">{t('auth.sellerRegistration')}</p>
          <p className="mt-1 text-sm text-slate-500">{t('auth.registerHint')}</p>
        </div>
        <span className="hidden shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500 sm:inline-flex">{t('auth.stepOf', { current: 1, total: 4 })}</span>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {error && <AuthFeedback type="error" message={error} onClose={() => setError('')} />}
        <SellerAuthInput id="store-name" label={t('auth.storeName')} type="text" icon="store" {...register('name')} error={errors.name?.message} placeholder={t('auth.storeNamePlaceholder')} autoComplete="organization" required />
        <div className="grid min-w-0 grid-cols-1 items-start gap-5 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]">
          <Controller
            control={control}
            name="phone_country_iso"
            render={({ field }) => (
              <CountryCodeSelect
                id="seller-phone-country"
                value={field.value}
                onChange={field.onChange}
                label={t('auth.phoneCountryCode')}
                searchPlaceholder={t('auth.phoneCountrySearch')}
                emptyLabel={t('auth.phoneCountryEmpty')}
                requiredLabel={t('common.required')}
                ariaLabel={t('auth.phoneCountryCode')}
                invalid={Boolean(errors.phone_country_iso)}
              />
            )}
          />
          <SellerAuthInput
            id="seller-phone"
            label={t('auth.phoneNumber')}
            type="tel"
            icon="phone"
            {...register('phone', { maxLength: phoneMaxLength })}
            error={errors.phone?.message}
            placeholder="20 1234 5678"
            autoComplete="tel-national"
            className="min-w-0"
            required
          />
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

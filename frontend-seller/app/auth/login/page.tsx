'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { AuthService } from '@/services/auth-service';
import { isSellerProfileComplete } from '@/lib/seller-profile-gate';
import Button from '@/components/ui/Button';
import Link from 'next/link';
import SellerAuthShell, { AuthFeedback } from '@/components/auth/SellerAuthShell';
import SellerAuthInput from '@/components/auth/SellerAuthInput';
import { useLanguage } from '@/contexts/LanguageContext';

type LoginFormData = { email: string; password: string };

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { t } = useLanguage();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const loginSchema = z.object({ email: z.string().email(t('auth.validEmail')), password: z.string().min(1, t('auth.passwordRequired')) });
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsLoading(true);
      setError('');
      await login(data);
      const user = AuthService.getUser();
      router.push(user && !isSellerProfileComplete(user) ? '/profile?setup=1' : '/');
    } catch (err: any) {
      setError(
        err.response?.data?.errors?.email?.[0] ||
        err.response?.data?.errors?.password?.[0] ||
        err.response?.data?.message ||
        t('auth.loginFailed')
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SellerAuthShell
      eyebrow={t('auth.loginEyebrow')}
      title={t('auth.welcomeBack')}
      description={t('auth.loginDescription')}
      highlights={[t('auth.sideIllustrationDescription'), t('auth.registerSideTitle'), t('auth.secureAccess')]}
    >
      <div className="mb-7 flex items-start justify-between gap-4">
        <div>
          <p className="text-lg font-bold text-slate-950">{t('auth.loginWorkspace')}</p>
          <p className="mt-1 text-sm text-slate-500">{t('auth.loginHint')}</p>
        </div>
        <span className="hidden shrink-0 rounded-full bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-700 sm:inline-flex">{t('auth.sellerAccess')}</span>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {error && <AuthFeedback type="error" message={error} onClose={() => setError('')} />}
        <SellerAuthInput id="seller-email" label={t('auth.emailAddress')} type="email" icon="mail" {...register('email')} error={errors.email?.message} placeholder={t('auth.emailPlaceholder')} autoComplete="email" required />
        <SellerAuthInput id="seller-password" label={t('auth.password')} type="password" icon="lock" {...register('password')} error={errors.password?.message} placeholder={t('auth.passwordPlaceholder')} autoComplete="current-password" required />

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-[#0789c5] focus:ring-cyan-200" />
            {t('auth.rememberMe')}
          </label>
          <Link href="/auth/forgot-password" className="text-sm font-bold text-[#0789c5] hover:text-[#006b99]">{t('auth.forgotPassword')}</Link>
        </div>

        <Button type="submit" variant="primary" size="lg" isLoading={isLoading} className="mt-2 w-full !rounded-xl !py-3.5">
          {t('auth.signInDashboard')}
        </Button>
      </form>

      <div className="mt-7 border-t border-slate-100 pt-6 text-center text-sm text-slate-500">
        {t('auth.newToVista')} <Link href="/auth/register" className="font-bold text-[#0789c5] hover:text-[#006b99]">{t('auth.createSellerAccount')}</Link>
      </div>
    </SellerAuthShell>
  );
}

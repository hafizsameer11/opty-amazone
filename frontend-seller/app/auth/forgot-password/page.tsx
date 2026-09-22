'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AuthService } from '@/services/auth-service';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import SellerAuthShell, { AuthFeedback } from '@/components/auth/SellerAuthShell';
import SellerAuthInput from '@/components/auth/SellerAuthInput';
import { useLanguage } from '@/contexts/LanguageContext';

type ForgotPasswordFormData = { email: string };

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const forgotPasswordSchema = z.object({ email: z.string().email(t('auth.validEmail')) });
  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordFormData>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      setIsLoading(true);
      setError('');
      setSuccess('');
      const response = await AuthService.forgotPassword(data);
      setSuccess(response.message || t('auth.resetEmailSent'));
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.errors?.email?.[0] || t('auth.resetFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SellerAuthShell
      eyebrow={t('auth.recoveryEyebrow')}
      title={t('auth.resetPassword')}
      description={t('auth.resetDescription')}
      sideTitle={t('auth.resetSideTitle')}
      sideDescription={t('auth.resetSideDescription')}
    >
      <div className="mb-7 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-50 text-2xl text-[#0789c5]">⌁</div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {error && <AuthFeedback type="error" message={error} onClose={() => setError('')} />}
        {success && <AuthFeedback type="success" message={success} onClose={() => setSuccess('')} />}
        <SellerAuthInput id="reset-email" label={t('auth.businessEmail')} type="email" icon="mail" {...register('email')} error={errors.email?.message} placeholder={t('auth.emailPlaceholder')} autoComplete="email" required />
        <Button type="submit" variant="primary" size="lg" isLoading={isLoading} className="w-full !rounded-xl !py-3.5">{t('auth.sendResetLink')}</Button>
      </form>
      <div className="mt-7 border-t border-slate-100 pt-6 text-center text-sm text-slate-500">
        {t('auth.rememberedPassword')} <Link href="/auth/login" className="font-bold text-[#0789c5] hover:text-[#006b99]">{t('auth.backToSignIn')}</Link>
      </div>
    </SellerAuthShell>
  );
}

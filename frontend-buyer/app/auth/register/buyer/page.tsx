'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Alert from '@/components/ui/Alert';
import Link from 'next/link';
import Image from 'next/image';
import { clearReferralAttribution, readReferralAttribution, referralService, storeReferralAttribution } from '@/services/referral-service';

const registerSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  password_confirmation: z.string(),
  referral_code: z.string().max(48).optional(),
  referral_attribution_token: z.string().max(64).optional(),
}).refine((data) => data.password === data.password_confirmation, {
  message: "Passwords don't match",
  path: ['password_confirmation'],
});

type RegisterFormData = z.infer<typeof registerSchema>;
type ApiFailure = { response?: { data?: { errors?: Record<string, string[]>; message?: string } } };

export default function BuyerRegisterPage() {
  return <Suspense fallback={<main className="min-h-screen bg-blue-50" />}><BuyerRegisterPageContent /></Suspense>;
}

function BuyerRegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register: registerUser } = useAuth();
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors }, setValue,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  useEffect(() => {
    const code = searchParams.get('ref')?.trim().toUpperCase();
    const savedToken = readReferralAttribution();
    if (savedToken) setValue('referral_attribution_token', savedToken);
    if (!code) return;
    setValue('referral_code', code);
    // Keep a server-issued token as the browser attribution record, while the
    // code remains a resilient/manual fallback if storage is unavailable.
    referralService.track(code).then(({ token }) => {
      storeReferralAttribution(token);
      setValue('referral_attribution_token', token);
    }).catch(() => {});
  }, [searchParams, setValue]);

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setIsLoading(true);
      setError('');
      await registerUser(data);
      clearReferralAttribution();
      router.push('/');
    } catch (err: unknown) {
      const failure = err as ApiFailure;
      const errors = failure.response?.data?.errors;
      const errorValues = errors ? Object.values(errors) : [];
      const firstError = errorValues.length > 0 ? (errorValues[0] as string[])?.[0] : undefined;
      const errorMessage =
        errors?.email?.[0] ||
        errors?.password?.[0] ||
        errors?.name?.[0] ||
        errors?.phone?.[0] ||
        firstError ||
        failure.response?.data?.message ||
        'Registration failed. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Image src="/vistaexpress-logo.png" alt="VistaExpress" width={300} height={150} className="mx-auto mb-2 h-20 w-auto object-contain" priority />
          <p className="text-gray-600">Buyer account</p>
        </div>

        <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Create buyer account</h2>
            <p className="text-sm text-gray-600">
              <Link href="/auth/choose" className="text-[#0066CC] hover:underline">
                ← Choose a different account type
              </Link>
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
            {error && <Alert type="error" message={error} onClose={() => setError('')} />}

            <div className="space-y-4">
              <Input label="Full Name" type="text" {...register('name')} error={errors.name?.message} required />
              <Input label="Email Address" type="email" {...register('email')} error={errors.email?.message} required />
              <Input label="Phone Number (Optional)" type="tel" {...register('phone')} error={errors.phone?.message} />
              <Input label="Referral Code (Optional)" type="text" {...register('referral_code')} error={errors.referral_code?.message} />
              <Input label="Password" type="password" {...register('password')} error={errors.password?.message} required />
              <Input label="Confirm Password" type="password" {...register('password_confirmation')} error={errors.password_confirmation?.message} required />
            </div>

            <Button type="submit" variant="primary" size="lg" isLoading={isLoading} className="w-full">
              Create Account
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

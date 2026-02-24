'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AuthService } from '@/services/auth-service';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Alert from '@/components/ui/Alert';
import Link from 'next/link';

const resetPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  password_confirmation: z.string(),
  token: z.string().min(1, 'Token is required'),
}).refine((data) => data.password === data.password_confirmation, {
  message: "Passwords don't match",
  path: ['password_confirmation'],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState<string>('');

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    const emailParam = searchParams.get('email');
    
    if (tokenParam) {
      setToken(tokenParam);
    }
    
    if (!tokenParam || !emailParam) {
      setError('Invalid reset link. Please request a new password reset.');
    }
  }, [searchParams]);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  useEffect(() => {
    if (token) {
      setValue('token', token);
    }
    const email = searchParams.get('email');
    if (email) {
      setValue('email', email);
    }
  }, [token, searchParams, setValue]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    try {
      setIsLoading(true);
      setError('');
      setSuccess('');
      const response = await AuthService.resetPassword(data);
      setSuccess(response.message || 'Password reset successful');
      setTimeout(() => {
        router.push('/auth/login');
      }, 2000);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
        err.response?.data?.errors?.email?.[0] ||
        'Password reset failed. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[#0066CC] mb-2">OpticalMarket</h1>
          <p className="text-gray-600">Your trusted optical marketplace</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Reset your password
            </h2>
            <p className="text-sm text-gray-600">
              Enter your new password below.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
            {error && (
              <Alert type="error" message={error} onClose={() => setError('')} />
            )}

            {success && (
              <Alert type="success" message={success} />
            )}

            <div className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                {...register('email')}
                error={errors.email?.message}
                placeholder="john@example.com"
                disabled={!!searchParams.get('email')}
                required
              />

              <input
                type="hidden"
                {...register('token')}
              />

              <Input
                label="New Password"
                type="password"
                {...register('password')}
                error={errors.password?.message}
                placeholder="••••••••"
                required
              />

              <Input
                label="Confirm New Password"
                type="password"
                {...register('password_confirmation')}
                error={errors.password_confirmation?.message}
                placeholder="••••••••"
                required
              />
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isLoading}
                className="w-full"
                disabled={!token}
              >
                Reset Password
              </Button>
            </div>

            <div className="text-center">
              <Link href="/auth/login" className="font-semibold text-[#0066CC] hover:text-[#0052a3] transition-colors text-sm">
                Back to login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0066CC] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AuthService } from '@/services/auth-service';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Alert from '@/components/ui/Alert';
import Link from 'next/link';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      setIsLoading(true);
      setError('');
      setSuccess('');
      const response = await AuthService.forgotPassword(data);
      setSuccess(response.message || 'Password reset link sent to your email');
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
        err.response?.data?.errors?.email?.[0] ||
        'Failed to send password reset link. Please try again.'
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
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
            {error && (
              <Alert type="error" message={error} onClose={() => setError('')} />
            )}

            {success && (
              <Alert type="success" message={success} onClose={() => setSuccess('')} />
            )}

            <div>
              <Input
                label="Email Address"
                type="email"
                {...register('email')}
                error={errors.email?.message}
                placeholder="john@example.com"
                autoComplete="email"
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
              >
                Send Reset Link
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

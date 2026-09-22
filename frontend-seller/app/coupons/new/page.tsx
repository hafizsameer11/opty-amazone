'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import Sidebar from '@/components/layout/Sidebar';
import { couponService, type CreateCouponData } from '@/services/coupon-service';
import { getAxiosErrorMessage } from '@/lib/api-client';
import CouponForm from '@/components/coupons/CouponForm';
import Alert from '@/components/ui/Alert';
import SectionBackLink from '@/components/ui/SectionBackLink';
import { useLanguage } from '@/contexts/LanguageContext';

export default function NewCouponPage() {
  const { isAuthenticated, loading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0066CC] mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('Loading…')}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    router.push('/auth/login');
    return null;
  }

  const handleSubmit = async (data: CreateCouponData) => {
    setSubmitting(true);
    setError('');
    try {
      await couponService.create(data);
      router.push('/coupons');
    } catch (err: unknown) {
      setError(getAxiosErrorMessage(err) || t('Failed to create coupon'));
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/coupons');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header />
          <main className="flex-1 p-4 sm:p-6 xl:p-8">
            <div className="mx-auto w-full max-w-5xl">
              <div className="mb-6">
                <SectionBackLink href="/coupons" className="mb-3">
                  {t('Back to Coupons')}
                </SectionBackLink>
                <h1 className="text-3xl font-bold text-gray-900">{t('Create New Coupon')}</h1>
                <p className="text-gray-600 mt-1">{t('Create a discount coupon for your customers')}</p>
              </div>

              {error && (
                <div className="mb-6">
                  <Alert type="error" message={error} onClose={() => setError('')} />
                </div>
              )}

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                <CouponForm
                  onSubmit={handleSubmit}
                  onCancel={handleCancel}
                  loading={submitting}
                />
              </div>
            </div>
          </main>
          <BottomNav />
        </div>
      </div>
    </div>
  );
}

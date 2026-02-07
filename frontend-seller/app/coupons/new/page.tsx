'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import Sidebar from '@/components/layout/Sidebar';
import { couponService, type CreateCouponData } from '@/services/coupon-service';
import CouponForm from '@/components/coupons/CouponForm';
import Alert from '@/components/ui/Alert';

export default function NewCouponPage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0066CC] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
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
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create coupon');
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/coupons');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <Sidebar />
        <div className="flex-1 lg:ml-64">
          <Header />
          <main className="p-4 lg:p-8">
            <div className="max-w-4xl mx-auto">
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Create New Coupon</h1>
                <p className="text-gray-600 mt-1">Create a discount coupon for your customers</p>
              </div>

              {error && (
                <Alert variant="error" className="mb-6" onClose={() => setError('')}>
                  {error}
                </Alert>
              )}

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
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

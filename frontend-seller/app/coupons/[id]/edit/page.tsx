'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import Sidebar from '@/components/layout/Sidebar';
import { couponService, type Coupon, type CreateCouponData } from '@/services/coupon-service';
import CouponForm from '@/components/coupons/CouponForm';
import Alert from '@/components/ui/Alert';

export default function EditCouponPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [loadingCoupon, setLoadingCoupon] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    if (isAuthenticated && params.id) {
      loadCoupon();
    }
  }, [isAuthenticated, params.id]);

  const loadCoupon = async () => {
    try {
      setLoadingCoupon(true);
      const data = await couponService.getOne(Number(params.id));
      setCoupon(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load coupon');
    } finally {
      setLoadingCoupon(false);
    }
  };

  if (loading || loadingCoupon) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0066CC] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !coupon) {
    return null;
  }

  const handleSubmit = async (data: CreateCouponData) => {
    setSubmitting(true);
    setError('');
    try {
      await couponService.update(coupon.id, data);
      router.push('/coupons');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update coupon');
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
                <h1 className="text-3xl font-bold text-gray-900">Edit Coupon</h1>
                <p className="text-gray-600 mt-1">Update coupon details</p>
              </div>

              {error && (
                <Alert variant="error" className="mb-6" onClose={() => setError('')}>
                  {error}
                </Alert>
              )}

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <CouponForm
                  coupon={coupon}
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

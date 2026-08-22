'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AdminLayout from '@/components/layout/AdminLayout';
import GlassCard from '@/components/ui/GlassCard';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Button from '@/components/ui/Button';
import { sellerService } from '@/services/seller-service';
import { useToast } from '@/components/ui/Toast';

export default function SellerDetailsPage() {
  const params = useParams();
  const { showToast } = useToast();
  const [seller, setSeller] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      loadSeller();
    }
  }, [params.id]);

  const loadSeller = async () => {
    try {
      setLoading(true);
      const data = await sellerService.getOne(Number(params.id));
      setSeller(data);
    } catch (error) {
      console.error('Failed to load seller:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      await sellerService.approve(Number(params.id));
      showToast('success', 'Store approved successfully');
      loadSeller();
    } catch (error: any) {
      showToast('error', error.response?.data?.message || 'Failed to approve store');
    }
  };

  const handleReject = async () => {
    const reason = prompt('Rejection reason:');
    if (!reason) return;
    try {
      await sellerService.reject(Number(params.id), reason);
      showToast('success', 'Store rejected successfully');
      loadSeller();
    } catch (error: any) {
      showToast('error', error.response?.data?.message || 'Failed to reject store');
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner size="lg" />
        </div>
      </AdminLayout>
    );
  }

  if (!seller) {
    return (
      <AdminLayout>
        <div className="text-center text-slate-500 py-12">Seller not found</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">{seller.name}</h1>
            <p className="text-slate-500">Store Details</p>
          </div>
          <div className="flex gap-3">
            <Button variant="primary" onClick={handleApprove}>Approve</Button>
            <Button variant="danger" onClick={handleReject}>Reject</Button>
          </div>
        </div>

        <GlassCard>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-slate-500 mb-1">Owner</p>
              <p className="text-slate-900">{seller.user?.name}</p>
              <p className="text-sm text-slate-500">{seller.user?.email}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-500 mb-1">Products</p>
                <p className="text-slate-900 font-bold text-xl">{seller.products_count || 0}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Orders</p>
                <p className="text-slate-900 font-bold text-xl">{seller.orders_count || 0}</p>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    </AdminLayout>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AdminLayout from '@/components/layout/AdminLayout';
import GlassCard from '@/components/ui/GlassCard';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Button from '@/components/ui/Button';
import RejectReasonModal from '@/components/admin/RejectReasonModal';
import { productService } from '@/services/product-service';
import { useToast } from '@/components/ui/Toast';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ProductDetailsPage() {
  const { t } = useLanguage();
  const params = useParams();
  const { showToast } = useToast();
  const [product, setProduct] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);

  useEffect(() => {
    if (params.id) {
      loadProduct();
    }
  }, [params.id]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      setProduct(null);
      const data = await productService.getOne(Number(params.id));
      setProduct(data as Record<string, unknown>);
    } catch {
      setLoadError(t('failedLoadProducts'));
    } finally {
      setLoading(false);
    }
  };

  useLiveRefresh(loadProduct, Boolean(params.id));

  const handleApprove = async () => {
    try {
      await productService.approve(Number(params.id));
      showToast('success', t('productApproved'));
      loadProduct();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      showToast('error', t('failedApproveProduct'));
    }
  };

  const handleRejectConfirm = async (reason: string) => {
    await productService.reject(Number(params.id), reason);
    showToast('success', t('productRejected'));
    loadProduct();
  };

  const handleToggleActive = async () => {
    try {
      await productService.toggleActive(Number(params.id));
      showToast('success', t('visibilityUpdated'));
      loadProduct();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      showToast('error', t('failedToggleProduct'));
    }
  };

  const handleDelete = async () => {
    if (!confirm(t('confirmDeleteProduct'))) return;
    try {
      await productService.delete(Number(params.id));
      showToast('success', t('productDeleted'));
      window.location.href = '/products';
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      showToast('error', t('failedDeleteProduct'));
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

  if (loadError || !product) {
    return (
      <AdminLayout>
        <div className="space-y-4 max-w-lg mx-auto text-center py-12">
          <p className="text-slate-600">{loadError || t('productNotFound')}</p>
          <Button variant="outline" onClick={() => loadProduct()}>{t('retry')}</Button>
        </div>
      </AdminLayout>
    );
  }

  const store = product.store as { name?: string } | undefined;
  const category = product.category as { name?: string } | undefined;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">{String(product.name)}</h1>
            <p className="text-slate-500">{t('productDetails')}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="primary" onClick={handleApprove}>{t('approve')}</Button>
            <Button variant="danger" onClick={() => setRejectOpen(true)}>{t('reject')}</Button>
            <Button variant="outline" onClick={handleToggleActive}>{t('toggleVisible')}</Button>
            <a className="border rounded-lg px-4 py-2 text-blue-700" href={'/ad-campaigns?product_id=' + product.id}>{t('viewAdCampaigns')}</a>
            <Button variant="danger" onClick={handleDelete}>{t('delete')}</Button>
          </div>
        </div>

        <GlassCard>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-500 mb-1">{t('store')}</p>
                <p className="text-slate-900">{store?.name}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">{t('category')}</p>
                <p className="text-slate-900">{category?.name}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">{t('price')}</p>
                <p className="text-slate-900 font-bold">€{Number(product.price || 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">{t('status')}</p>
                <Badge variant={product.is_active ? 'success' : 'default'}>
                  {product.is_active ? t('active') : t('inactive')}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">{t('approvalStatus')}</p>
                <Badge variant={product.is_approved ? 'success' : 'warning'}>
                  {product.is_approved ? t('approved') : t('pending')}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">{t('productAdvertising')}</p>
                <a className="text-blue-700 underline" href={'/ad-campaigns?product_id=' + product.id}>{t('campaignStatusPayments')}</a>
              </div>
            </div>
          </div>
        </GlassCard>

        <RejectReasonModal
          isOpen={rejectOpen}
          title={t('rejectProduct')}
          description={t('rejectProductDescription')}
          onClose={() => setRejectOpen(false)}
          onConfirm={handleRejectConfirm}
          confirmLabel={t('rejectProduct')}
        />
      </div>
    </AdminLayout>
  );
}

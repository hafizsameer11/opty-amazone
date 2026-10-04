'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AdminLayout from '@/components/layout/AdminLayout';
import GlassCard from '@/components/ui/GlassCard';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Button from '@/components/ui/Button';
import RejectReasonModal from '@/components/admin/RejectReasonModal';
import DeleteStoreModal from '@/components/admin/DeleteStoreModal';
import {
  sellerService,
  type StoreDetail,
  type StoreDetailResponse,
  type StoreStatus,
} from '@/services/seller-service';
import { useToast } from '@/components/ui/Toast';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { getAxiosErrorMessage } from '@/lib/api-client';
import { describeFinancialHistory } from '@/lib/store-financial-history';
import { statusKey, useLanguage } from '@/contexts/LanguageContext';

const STATUS_BADGE: Record<StoreStatus, { variant: 'success' | 'error' | 'warning' | 'info'; labelKey: string }> = {
  pending: { variant: 'warning', labelKey: 'storeStatusPending' },
  active: { variant: 'success', labelKey: 'storeStatusApproved' },
  rejected: { variant: 'error', labelKey: 'storeStatusRejected' },
  suspended: { variant: 'info', labelKey: 'storeStatusSuspended' },
};

/** Same rule as the list: decide only while the registration is pending. */
function actionsFor(status: StoreStatus): Array<'approve' | 'reject' | 'delete'> {
  switch (status) {
    case 'pending':
      return ['approve', 'reject'];
    case 'active':
      return ['delete'];
    default:
      return ['approve'];
  }
}

export default function SellerDetailsPage() {
  const { t } = useLanguage();
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const storeId = Number(params.id);

  const [data, setData] = useState<StoreDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const loadSeller = useCallback(async () => {
    try {
      setLoading(true);
      const response = await sellerService.getOne(storeId);
      setData(response);
    } catch {
      showToast('error', t('failedLoadSellers'));
    } finally {
      setLoading(false);
    }
  }, [storeId, showToast, t]);

  useEffect(() => {
    if (Number.isFinite(storeId)) void loadSeller();
  }, [loadSeller, storeId]);

  useLiveRefresh(loadSeller, Number.isFinite(storeId));

  const runAction = async (action: 'approve' | 'reject' | 'delete', reason?: string) => {
    setBusy(true);
    try {
      if (action === 'approve') {
        await sellerService.approve(storeId);
        showToast('success', t('storeApproved'));
      } else if (action === 'reject') {
        await sellerService.reject(storeId, reason || '');
        showToast('success', t('storeRejected'));
      } else {
        await sellerService.remove(storeId);
        showToast('success', t('storeDeleted'));
        router.push('/sellers');
        return;
      }
      await loadSeller();
    } catch (error) {
      showToast('error', getAxiosErrorMessage(error) || t('requestFailed'));
    } finally {
      setBusy(false);
    }
  };

  if (loading && !data) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner size="lg" />
        </div>
      </AdminLayout>
    );
  }

  if (!data?.store) {
    return (
      <AdminLayout>
        <div className="text-center text-slate-500 py-12">{t('sellerNotFound')}</div>
      </AdminLayout>
    );
  }

  const store: StoreDetail = data.store;
  const badge = STATUS_BADGE[store.status] ?? STATUS_BADGE.pending;
  const stats = store.statistics;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <h1 className="text-3xl font-bold text-slate-900">{store.name}</h1>
              <Badge variant={badge.variant}>{t(badge.labelKey)}</Badge>
            </div>
            <p className="text-slate-500">{t('storeDetails')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {actionsFor(store.status).map((action) => {
              if (action === 'approve') {
                return (
                  <Button key="approve" variant="primary" isLoading={busy} onClick={() => void runAction('approve')}>
                    {store.status === 'pending' ? t('approve') : t('storeApproveAgain')}
                  </Button>
                );
              }
              if (action === 'reject') {
                return (
                  <Button key="reject" variant="danger" onClick={() => setRejectOpen(true)}>
                    {t('reject')}
                  </Button>
                );
              }
              return (
                <Button key="delete" variant="danger" onClick={() => setDeleteOpen(true)}>
                  {t('delete')}
                </Button>
              );
            })}
          </div>
        </div>

        {store.rejection_reason && (
          <GlassCard>
            <p className="text-sm font-semibold text-red-700">{t('storeRejectionReasonTitle')}</p>
            <p className="mt-1 text-sm text-slate-700">{store.rejection_reason}</p>
          </GlassCard>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <GlassCard>
            <p className="mb-3 text-lg font-bold text-slate-900">{t('storeOwner')}</p>
            <div className="space-y-2 text-sm">
              <div>
                <p className="text-slate-500">{t('owner')}</p>
                <p className="text-slate-900">{store.user?.name || '—'}</p>
              </div>
              <div>
                <p className="text-slate-500">{t('auth.email')}</p>
                <p className="text-slate-900">{store.user?.email || '—'}</p>
              </div>
              <div>
                <p className="text-slate-500">{t('storePhone')}</p>
                <p className="text-slate-900">{store.phone || store.user?.phone || '—'}</p>
              </div>
              <div>
                <p className="text-slate-500">{t('storeSlug')}</p>
                <p className="text-slate-900">{store.slug || '—'}</p>
              </div>
              <div>
                <p className="text-slate-500">{t('storeRegisteredOn')}</p>
                <p className="text-slate-900">
                  {store.created_at ? new Date(store.created_at).toLocaleDateString() : '—'}
                </p>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <p className="mb-3 text-lg font-bold text-slate-900">{t('storePerformance')}</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                ['storeViews', stats?.total_views],
                ['storeClicks', stats?.total_clicks],
                ['storeFollowers', stats?.total_followers],
                ['storeReviews', stats?.total_reviews],
              ].map(([labelKey, value]) => (
                <div key={String(labelKey)}>
                  <p className="text-slate-500">{t(String(labelKey))}</p>
                  <p className="text-xl font-bold text-slate-900">{value ?? 0}</p>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard>
            <p className="mb-3 text-lg font-bold text-slate-900">{t('storeContent')}</p>
            <div className="space-y-3 text-sm">
              <Link
                href={`/products?store_id=${store.id}`}
                className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 hover:border-[#0066CC]"
              >
                <span className="text-slate-600">{t('products')}</span>
                <span className="font-bold text-slate-900">{store.products_count ?? 0}</span>
              </Link>
              <Link
                href={`/orders?store_id=${store.id}`}
                className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 hover:border-[#0066CC]"
              >
                <span className="text-slate-600">{t('orders')}</span>
                <span className="font-bold text-slate-900">{store.orders_count ?? 0}</span>
              </Link>
              <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                <span className="text-slate-600">{t('storeCategories')}</span>
                <span className="font-bold text-slate-900">{store.categories?.length ?? 0}</span>
              </div>
            </div>
          </GlassCard>
        </div>

        <GlassCard>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-lg font-bold text-slate-900">{t('storeProducts', { count: data.products.length })}</p>
            {store.products_count !== undefined && store.products_count > data.products.length && (
              <Link href={`/products?store_id=${store.id}`} className="text-sm font-semibold text-[#0066CC] hover:underline">
                {t('viewAll')}
              </Link>
            )}
          </div>
          {data.products.length === 0 ? (
            <p className="text-sm text-slate-500">{t('storeNoProducts')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="py-2 pr-4">{t('product')}</th>
                    <th className="py-2 pr-4">SKU</th>
                    <th className="py-2 pr-4">{t('price')}</th>
                    <th className="py-2 pr-4">{t('status')}</th>
                    <th className="py-2">{t('approval')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.products.map((product) => (
                    <tr key={product.id} className="border-b border-slate-100 last:border-0">
                      <td className="py-2 pr-4">
                        <Link href={`/products/${product.id}`} className="font-medium text-slate-900 hover:underline">
                          {product.name}
                        </Link>
                      </td>
                      <td className="py-2 pr-4 text-slate-500">{product.sku || '—'}</td>
                      <td className="py-2 pr-4 text-slate-900">{product.price ?? '—'}</td>
                      <td className="py-2 pr-4">
                        <Badge size="sm" variant={product.is_active ? 'success' : 'default'}>
                          {product.is_active ? t('active') : t('inactive')}
                        </Badge>
                      </td>
                      <td className="py-2">
                        <Badge size="sm" variant={product.is_approved ? 'success' : 'warning'}>
                          {product.is_approved ? t('approved') : t('pending')}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>

        <GlassCard>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-lg font-bold text-slate-900">{t('storeOrders', { count: data.orders.length })}</p>
            {store.orders_count !== undefined && store.orders_count > data.orders.length && (
              <Link href={`/orders?store_id=${store.id}`} className="text-sm font-semibold text-[#0066CC] hover:underline">
                {t('viewAll')}
              </Link>
            )}
          </div>
          {data.orders.length === 0 ? (
            <p className="text-sm text-slate-500">{t('storeNoOrders')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="py-2 pr-4">{t('order')}</th>
                    <th className="py-2 pr-4">{t('status')}</th>
                    <th className="py-2 pr-4">{t('subtotal')}</th>
                    <th className="py-2 pr-4">{t('deliveryFee')}</th>
                    <th className="py-2">{t('total')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.orders.map((order) => (
                    <tr key={order.id} className="border-b border-slate-100 last:border-0">
                      <td className="py-2 pr-4">
                        <Link href={`/orders/${order.order_id}`} className="font-medium text-slate-900 hover:underline">
                          #{order.order_id}
                        </Link>
                      </td>
                      <td className="py-2 pr-4">
                        <Badge size="sm" variant={order.status === 'delivered' ? 'success' : 'default'}>
                          {t(statusKey(order.status))}
                        </Badge>
                      </td>
                      <td className="py-2 pr-4 text-slate-900">{order.subtotal ?? '—'}</td>
                      <td className="py-2 pr-4 text-slate-900">{order.delivery_fee ?? '—'}</td>
                      <td className="py-2 font-semibold text-slate-900">{order.total ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      </div>

      <RejectReasonModal
        isOpen={rejectOpen}
        title={t('rejectStoreTitle')}
        description={t('rejectStoreDescription', { name: store.name })}
        confirmLabel={t('confirmReject')}
        onClose={() => setRejectOpen(false)}
        onConfirm={async (reason) => {
          await runAction('reject', reason);
        }}
      />

      <DeleteStoreModal
        isOpen={deleteOpen}
        store={store}
        deletable={data.deletable}
        blockedReason={describeFinancialHistory(data.financial_history, t)}
        onClose={() => setDeleteOpen(false)}
        onConfirm={async () => {
          await runAction('delete');
        }}
      />
    </AdminLayout>
  );
}
'use client';

import { useCallback, useEffect, useMemo, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AdminLayout from '@/components/layout/AdminLayout';
import DataTable, { type Column } from '@/components/ui/DataTable';
import GlassCard from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import PaginationBar from '@/components/ui/PaginationBar';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import RejectReasonModal from '@/components/admin/RejectReasonModal';
import DeleteStoreModal from '@/components/admin/DeleteStoreModal';
import {
  sellerService,
  STORE_STATUS_FILTERS,
  type Seller,
  type SellerListResponse,
  type StoreStatus,
  type StoreStatusFilter,
} from '@/services/seller-service';
import { useToast } from '@/components/ui/Toast';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { getAxiosErrorMessage } from '@/lib/api-client';
import { describeFinancialHistory } from '@/lib/store-financial-history';
import { useLanguage } from '@/contexts/LanguageContext';

const PER_PAGE = 25;

const STATUS_BADGE: Record<StoreStatus, { variant: 'success' | 'error' | 'warning' | 'info'; labelKey: string }> = {
  pending: { variant: 'warning', labelKey: 'storeStatusPending' },
  active: { variant: 'success', labelKey: 'storeStatusApproved' },
  rejected: { variant: 'error', labelKey: 'storeStatusRejected' },
  suspended: { variant: 'info', labelKey: 'storeStatusSuspended' },
};

/**
 * Approve/Reject are only meaningful while a registration is awaiting a
 * decision. Once approved the admin reviews and removes the store instead, so
 * the decision buttons disappear exactly when they stop being valid.
 */
function actionsFor(status: StoreStatus): Array<'approve' | 'reject' | 'view' | 'delete'> {
  switch (status) {
    case 'pending':
      return ['approve', 'reject'];
    case 'active':
      return ['view', 'delete'];
    case 'rejected':
    case 'suspended':
      return ['view', 'approve'];
    default:
      return ['view'];
  }
}

function SellersPageContent() {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const rawStatus = (searchParams.get('status') || 'all') as StoreStatusFilter;
  const status: StoreStatusFilter = STORE_STATUS_FILTERS.includes(rawStatus) ? rawStatus : 'all';
  const page = Math.max(1, Number(searchParams.get('page') || 1));

  const [data, setData] = useState<SellerListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [busyId, setBusyId] = useState<number | null>(null);

  const [rejectTarget, setRejectTarget] = useState<Seller | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Seller | null>(null);
  const [deleteAllowed, setDeleteAllowed] = useState(true);
  const [deleteBlockReason, setDeleteBlockReason] = useState<string | null>(null);
  const [checkingDelete, setCheckingDelete] = useState(false);

  const loadSellers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await sellerService.getAll({
        status,
        search: searchParams.get('search') || undefined,
        page,
        per_page: PER_PAGE,
      });
      setData(response);
    } catch {
      showToast('error', t('failedLoadSellers'));
    } finally {
      setLoading(false);
    }
  }, [status, page, searchParams, showToast, t]);

  useEffect(() => {
    void loadSellers();
  }, [loadSellers]);

  useLiveRefresh(loadSellers);

  const navigate = useCallback(
    (next: Partial<{ status: StoreStatusFilter; page: number; search: string }>) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.status !== undefined) {
        if (next.status === 'all') params.delete('status');
        else params.set('status', next.status);
        params.delete('page');
      }
      if (next.page !== undefined) {
        if (next.page <= 1) params.delete('page');
        else params.set('page', String(next.page));
      }
      if (next.search !== undefined) {
        if (next.search) params.set('search', next.search);
        else params.delete('search');
        params.delete('page');
      }
      router.replace(`/sellers${params.toString() ? `?${params}` : ''}`);
    },
    [router, searchParams]
  );

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    navigate({ search: search.trim() });
  };

  const runAction = async (seller: Seller, action: 'approve' | 'reject' | 'delete', reason?: string) => {
    setBusyId(seller.id);
    try {
      if (action === 'approve') {
        await sellerService.approve(seller.id);
        showToast('success', t('storeApproved'));
      } else if (action === 'reject') {
        await sellerService.reject(seller.id, reason || '');
        showToast('success', t('storeRejected'));
      } else {
        await sellerService.remove(seller.id);
        showToast('success', t('storeDeleted'));
      }
      await loadSellers();
    } catch (error) {
      showToast('error', getAxiosErrorMessage(error) || t('requestFailed'));
    } finally {
      setBusyId(null);
    }
  };

  /**
   * Ask the backend whether this store can be removed before opening the
   * confirmation, so the modal can explain a refusal instead of failing on
   * submit.
   */
  const openDelete = async (seller: Seller) => {
    setDeleteTarget(seller);
    setDeleteAllowed(true);
    setDeleteBlockReason(null);
    setCheckingDelete(true);
    try {
      const detail = await sellerService.getOne(seller.id);
      setDeleteAllowed(detail.deletable);
      setDeleteBlockReason(detail.deletable ? null : describeFinancialHistory(detail.financial_history, t));
    } catch {
      setDeleteAllowed(true);
    } finally {
      setCheckingDelete(false);
    }
  };

  const stores = data?.stores ?? [];
  const summary = data?.summary;

  const tabs = useMemo(
    () =>
      STORE_STATUS_FILTERS.map((key) => ({
        key,
        count: summary?.[key] ?? 0,
        label: t(
          key === 'all'
            ? 'storeFilterAll'
            : key === 'approved'
              ? 'storeFilterApproved'
              : key === 'pending'
                ? 'storeFilterPending'
                : key === 'rejected'
                  ? 'storeFilterRejected'
                  : 'storeFilterSuspended'
        ),
      })),
    [summary, t]
  );

  const columns: Column<Seller>[] = [
    { key: 'id', header: 'ID', sortable: true },
    {
      key: 'name',
      header: t('storeName'),
      render: (seller) => (
        <div>
          <p className="font-semibold text-slate-900">{seller.name}</p>
          <p className="text-xs text-slate-500">{seller.user?.email}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: t('status'),
      sortable: true,
      render: (seller) => {
        const badge = STATUS_BADGE[seller.status] ?? STATUS_BADGE.pending;
        return (
          <div className="space-y-1">
            <Badge variant={badge.variant} size="sm">
              {t(badge.labelKey)}
            </Badge>
            {!seller.is_active && (
              <p className="text-[11px] text-slate-500">{t('storeHiddenFromBuyers')}</p>
            )}
            {seller.rejection_reason && (
              <p className="max-w-[16rem] truncate text-[11px] text-red-600" title={seller.rejection_reason}>
                {t('storeRejectionReasonLabel')}: {seller.rejection_reason}
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: 'products_count',
      header: t('products'),
      render: (seller) => <span className="text-slate-900">{seller.products_count ?? 0}</span>,
    },
    {
      key: 'orders_count',
      header: t('orders'),
      render: (seller) => <span className="text-slate-900">{seller.orders_count ?? 0}</span>,
    },
    {
      key: 'actions',
      header: t('actions'),
      className: 'whitespace-nowrap',
      render: (seller) => {
        const busy = busyId === seller.id;
        return (
          <div className="flex flex-wrap gap-1.5" onClick={(event) => event.stopPropagation()}>
            {actionsFor(seller.status).map((action) => {
              if (action === 'view') {
                return (
                  <Button
                    key="view"
                    size="sm"
                    variant="ghost"
                    onClick={() => router.push(`/sellers/${seller.id}`)}
                  >
                    {t('view')}
                  </Button>
                );
              }
              if (action === 'approve') {
                return (
                  <Button
                    key="approve"
                    size="sm"
                    variant="primary"
                    isLoading={busy}
                    onClick={() => void runAction(seller, 'approve')}
                  >
                    {seller.status === 'pending' ? t('approve') : t('storeApproveAgain')}
                  </Button>
                );
              }
              if (action === 'reject') {
                return (
                  <Button key="reject" size="sm" variant="danger" onClick={() => setRejectTarget(seller)}>
                    {t('reject')}
                  </Button>
                );
              }
              return (
                <Button key="delete" size="sm" variant="danger" onClick={() => void openDelete(seller)}>
                  {t('delete')}
                </Button>
              );
            })}
          </div>
        );
      },
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">{t('sellers')}</h1>
          <p className="text-slate-500">{t('manageSellers')}</p>
        </div>

        <GlassCard>
          <div className="mb-5 flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => navigate({ status: tab.key })}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  status === tab.key
                    ? 'bg-[#0066CC] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
                <span className={`ml-2 ${status === tab.key ? 'text-white/80' : 'text-slate-400'}`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <form onSubmit={handleSearch} className="mb-6 flex gap-4">
            <Input
              type="text"
              placeholder={t('searchSellers')}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="flex-1"
            />
            <Button type="submit">{t('search')}</Button>
          </form>

          <DataTable
            data={stores}
            columns={columns}
            loading={loading}
            keyExtractor={(seller) => seller.id}
            onRowClick={(seller) => router.push(`/sellers/${seller.id}`)}
          />

          <PaginationBar
            meta={
              data
                ? {
                    current_page: data.pagination.current_page,
                    last_page: data.pagination.last_page,
                    total: data.pagination.total,
                    from: data.pagination.from,
                    to: data.pagination.to,
                  }
                : null
            }
            loading={loading}
            onPageChange={(next) => navigate({ page: next })}
          />
        </GlassCard>
      </div>

      <RejectReasonModal
        isOpen={Boolean(rejectTarget)}
        title={t('rejectStoreTitle')}
        description={t('rejectStoreDescription', { name: rejectTarget?.name ?? '' })}
        confirmLabel={t('confirmReject')}
        onClose={() => setRejectTarget(null)}
        onConfirm={async (reason) => {
          if (rejectTarget) await runAction(rejectTarget, 'reject', reason);
        }}
      />

      <DeleteStoreModal
        isOpen={Boolean(deleteTarget)}
        store={deleteTarget}
        deletable={deleteAllowed}
        checking={checkingDelete}
        blockedReason={deleteBlockReason}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) await runAction(deleteTarget, 'delete');
        }}
      />
    </AdminLayout>
  );
}

export default function SellersPage() {
  // The status tabs are URL-driven, and useSearchParams needs a Suspense
  // boundary for the page to be prerendered.
  return (
    <Suspense fallback={<AdminLayout><LoadingSpinner size="lg" /></AdminLayout>}>
      <SellersPageContent />
    </Suspense>
  );
}
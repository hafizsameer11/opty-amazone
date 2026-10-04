'use client';

import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AdminLayout from '@/components/layout/AdminLayout';
import DataTable from '@/components/ui/DataTable';
import GlassCard from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import PaginationBar, { type PaginationMeta } from '@/components/ui/PaginationBar';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { orderService, type Order } from '@/services/order-service';
import { useToast } from '@/components/ui/Toast';
import { rowsAndMetaFromAdminList } from '@/lib/paginated-response';
import { statusKey, useLanguage } from '@/contexts/LanguageContext';

function OrdersPageContent() {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  // Set when the admin arrives from a store's detail page.
  const storeFilter = searchParams.get('store_id') || '';
  const [orders, setOrders] = useState<Order[]>([]);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchDraft, setSearchDraft] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');

  const loadOrders = useCallback(async (pageNum: number, silent = false) => {
    try {
      if (!silent) setLoading(true);
      setLoadError(null);
      const params: Record<string, string | number> = { per_page: 20, page: pageNum };
      if (appliedSearch) params.search = appliedSearch;
      if (paymentFilter) params.payment_status = paymentFilter;
      if (storeFilter) params.store_id = storeFilter;
      const response = await orderService.getAll(params);
      const { rows, meta } = rowsAndMetaFromAdminList<Order>(response);
      setOrders(rows);
      setPaginationMeta(meta);
    } catch {
      setLoadError(t('failedLoadOrders'));
      showToast('error', t('failedLoadOrders'));
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, paymentFilter, showToast, storeFilter]);

  useLiveRefresh(() => loadOrders(page, true));

  useEffect(() => {
    void loadOrders(page);
  }, [page, loadOrders]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedSearch(searchDraft.trim());
    setPage(1);
  };

  const columns = [
    {
      key: 'order_no',
      header: t('orderNo'),
      sortable: true,
      render: (order: Order) => (
        <div>
          <p className="font-medium text-slate-900">{order.order_no}</p>
          <a
            href={`/orders/${order.id}`}
            className="text-xs text-[#0066CC] hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {t('viewDetail')}
          </a>
        </div>
      ),
    },
    {
      key: 'user',
      header: t('customer'),
      render: (order: Order) => (
        <div>
          <p className="font-semibold text-slate-900">{order.user?.name}</p>
          <p className="text-xs text-slate-500">{order.user?.email}</p>
        </div>
      ),
    },
    {
      key: 'grand_total',
      header: t('total'),
      render: (order: Order) => <span className="text-slate-900">€{Number(order.grand_total || 0).toFixed(2)}</span>,
    },
    {
      key: 'payment_status',
      header: t('payment'),
      render: (order: Order) => {
        const ok = order.payment_status === 'paid';
        return (
          <Badge variant={ok ? 'success' : order.payment_status === 'failed' || order.payment_status === 'cancelled' ? 'error' : 'warning'}>
            {t(statusKey(order.payment_status))}
          </Badge>
        );
      },
    },
    {
      key: 'created_at',
      header: t('date'),
      hideBelowMd: true,
      render: (order: Order) => (
        <span className="text-slate-900">{new Date(order.created_at).toLocaleDateString()}</span>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">{t('orders')}</h1>
            <p className="text-slate-500">{t('orderDescription')}</p>
        </div>

        <GlassCard>
          {storeFilter && (
            <div className="mb-5 flex items-center justify-between gap-3 rounded-lg border border-[#0066CC]/30 bg-[#0066CC]/5 px-4 py-3 text-sm">
              <span className="text-slate-700">{t('filteringByStore')}</span>
              <Link href="/orders" className="font-semibold text-[#0066CC] hover:underline">
                {t('clearFilter')}
              </Link>
            </div>
          )}
          <form onSubmit={handleSearch} className="flex flex-wrap gap-4 mb-6">
            <Input
              type="text"
              placeholder={t('searchOrders')}
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              className="flex-1 min-w-[200px]"
            />
            <select
              value={paymentFilter}
              onChange={(e) => {
                setPaymentFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 py-3 rounded-lg text-slate-900 bg-white border border-slate-200"
            >
              <option value="">{t('allPayments')}</option>
              {['pending', 'paid', 'failed', 'refunded', 'cancelled'].map(value => <option key={value} value={value}>{t(statusKey(value))}</option>)}
            </select>
            <Button type="submit">{t('search')}</Button>
          </form>

          {loadError && (
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-4 rounded-lg border border-error/40 bg-error/10 px-4 py-3 text-slate-900">
              <p className="text-sm flex-1">{loadError}</p>
              <Button type="button" size="sm" variant="outline" onClick={() => void loadOrders(page)}>
                {t('retry')}
              </Button>
            </div>
          )}

          <DataTable
            data={orders}
            columns={columns}
            loading={loading}
            keyExtractor={(order) => order.id}
            onRowClick={(order) => { window.location.href = `/orders/${order.id}`; }}
          />

          <PaginationBar meta={paginationMeta} loading={loading} onPageChange={(p) => setPage(p)} />
        </GlassCard>
      </div>
    </AdminLayout>
  );
}

export default function OrdersPage() {
  // useSearchParams (the store filter) needs a Suspense boundary to prerender.
  return (
    <Suspense fallback={<AdminLayout><LoadingSpinner size="lg" /></AdminLayout>}>
      <OrdersPageContent />
    </Suspense>
  );
}

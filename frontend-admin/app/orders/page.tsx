'use client';

import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { useEffect, useState, useCallback } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import DataTable from '@/components/ui/DataTable';
import GlassCard from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import PaginationBar, { type PaginationMeta } from '@/components/ui/PaginationBar';
import { orderService, type Order } from '@/services/order-service';
import { useToast } from '@/components/ui/Toast';
import { rowsAndMetaFromAdminList } from '@/lib/paginated-response';

export default function OrdersPage() {
  const { showToast } = useToast();
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
      const response = await orderService.getAll(params);
      const { rows, meta } = rowsAndMetaFromAdminList<Order>(response);
      setOrders(rows);
      setPaginationMeta(meta);
    } catch {
      setLoadError('Could not load orders. Check your connection and try again.');
      showToast('error', 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, paymentFilter, showToast]);

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
      header: 'Order No',
      sortable: true,
      render: (order: Order) => (
        <div>
          <p className="font-medium text-slate-900">{order.order_no}</p>
          <a
            href={`/orders/${order.id}`}
            className="text-xs text-[#0066CC] hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            View detail
          </a>
        </div>
      ),
    },
    {
      key: 'user',
      header: 'Customer',
      render: (order: Order) => (
        <div>
          <p className="font-semibold text-slate-900">{order.user?.name}</p>
          <p className="text-xs text-slate-500">{order.user?.email}</p>
        </div>
      ),
    },
    {
      key: 'grand_total',
      header: 'Total',
      render: (order: Order) => <span className="text-slate-900">€{Number(order.grand_total || 0).toFixed(2)}</span>,
    },
    {
      key: 'payment_status',
      header: 'Payment',
      render: (order: Order) => {
        const ok = order.payment_status === 'paid';
        return (
          <Badge variant={ok ? 'success' : order.payment_status === 'failed' || order.payment_status === 'cancelled' ? 'error' : 'warning'}>
            {order.payment_status}
          </Badge>
        );
      },
    },
    {
      key: 'created_at',
      header: 'Date',
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
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Orders</h1>
          <p className="text-slate-500">Inspect checkout state and per-store fulfillment on the detail page</p>
        </div>

        <GlassCard>
          <form onSubmit={handleSearch} className="flex flex-wrap gap-4 mb-6">
            <Input
              type="text"
              placeholder="Search order no, customer..."
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
              <option value="">All payments</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <Button type="submit">Search</Button>
          </form>

          {loadError && (
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-4 rounded-lg border border-error/40 bg-error/10 px-4 py-3 text-slate-900">
              <p className="text-sm flex-1">{loadError}</p>
              <Button type="button" size="sm" variant="outline" onClick={() => void loadOrders(page)}>
                Retry
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

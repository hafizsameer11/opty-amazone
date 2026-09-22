'use client';

import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import { orderService, type StoreOrder } from '@/services/order-service';
import OrderDetailsModal from '@/components/orders/OrderDetailsModal';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

export default function SellerOrdersPage() {
  const { isAuthenticated, loading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useLiveRefresh(() => loadOrders(true), isAuthenticated);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadOrders();
    }
  }, [isAuthenticated, statusFilter]);

  const loadOrders = async (silent = false) => {
    try {
      if (!silent) setLoadingOrders(true);
      const params: any = {};
      if (statusFilter) {
        params.status = statusFilter;
      }
      const response = await orderService.getOrders(params);
      // Handle both paginated and non-paginated responses
      if (response.data) {
        setOrders(response.data);
      } else if (Array.isArray(response)) {
        setOrders(response);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error('Failed to load orders:', error);
      setOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  if (loading || loadingOrders) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0066CC] mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('orders.loading')}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const handleOrderClick = (orderId: number) => {
    setSelectedOrderId(orderId);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedOrderId(null);
  };

  const handleOrderUpdate = () => {
    loadOrders();
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: t('orders.pending'),
      awaiting_payment: t('orders.awaitingPayment'),
      rejected: t('orders.rejected'),
      paid: t('orders.paid'),
      processing: t('orderDetails.processing'),
      out_for_delivery: t('orders.outForDelivery'),
      delivered: t('orders.delivered'),
      cancelled: t('orders.cancelled'),
    };
    return labels[status] ?? status.replaceAll('_', ' ');
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'default' | 'success' | 'warning' | 'error' | 'info' | 'primary' | 'secondary'; label: string }> = {
      pending: { variant: 'warning', label: t('orders.pending') },
      awaiting_payment: { variant: 'info', label: t('orders.awaitingPayment') },
      rejected: { variant: 'error', label: t('orders.rejected') },
      paid: { variant: 'success', label: t('orders.paid') },
      processing: { variant: 'info', label: t('orderDetails.processing') },
      out_for_delivery: { variant: 'primary', label: t('orders.outForDelivery') },
      delivered: { variant: 'default', label: t('orders.delivered') },
      cancelled: { variant: 'error', label: t('orders.cancelled') },
    };

    const config = statusConfig[status] || { variant: 'default' as const, label: getStatusLabel(status) };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 pb-20 lg:pb-0">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto w-full px-3 py-4 sm:px-4 sm:py-8">
        <div className="mb-4 flex items-center justify-between gap-3 sm:mb-6"><div><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0066CC]">Sales workspace</p><h1 className="mt-0.5 text-2xl font-bold text-gray-900 sm:text-3xl">{t('orders.title')}</h1></div><span className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-[#0066CC]">{orders.length} {orders.length === 1 ? t('orders.item') : t('orders.items')}</span></div>

        {/* Status Filter */}
        <div className="-mx-3 mb-5 flex gap-2 overflow-x-auto px-3 pb-2 sm:mx-0 sm:mb-6 sm:px-0">
          <button
            onClick={() => setStatusFilter('')}
            className={`px-4 py-2.5 rounded-lg whitespace-nowrap font-medium transition-all duration-200 ${
              !statusFilter
                ? 'bg-gradient-to-r from-[#0066CC] to-[#0052A3] text-white shadow-md'
                : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-[#0066CC] hover:text-[#0066CC]'
            }`}
          >
            {t('orders.all')}
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-4 py-2.5 rounded-lg whitespace-nowrap font-medium transition-all duration-200 ${
              statusFilter === 'pending'
                ? 'bg-gradient-to-r from-[#0066CC] to-[#0052A3] text-white shadow-md'
                : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-[#0066CC] hover:text-[#0066CC]'
            }`}
          >
            {t('orders.pending')}
          </button>
          <button
            onClick={() => setStatusFilter('awaiting_payment')}
            className={`px-4 py-2.5 rounded-lg whitespace-nowrap font-medium transition-all duration-200 ${
              statusFilter === 'awaiting_payment'
                ? 'bg-gradient-to-r from-[#0066CC] to-[#0052A3] text-white shadow-md'
                : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-[#0066CC] hover:text-[#0066CC]'
            }`}
          >
            {t('orders.awaitingPayment')}
          </button>
          <button
            onClick={() => setStatusFilter('paid')}
            className={`px-4 py-2.5 rounded-lg whitespace-nowrap font-medium transition-all duration-200 ${
              statusFilter === 'paid'
                ? 'bg-gradient-to-r from-[#0066CC] to-[#0052A3] text-white shadow-md'
                : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-[#0066CC] hover:text-[#0066CC]'
            }`}
          >
            {t('orders.paid')}
          </button>
          <button
            onClick={() => setStatusFilter('out_for_delivery')}
            className={`px-4 py-2.5 rounded-lg whitespace-nowrap font-medium transition-all duration-200 ${
              statusFilter === 'out_for_delivery'
                ? 'bg-gradient-to-r from-[#0066CC] to-[#0052A3] text-white shadow-md'
                : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-[#0066CC] hover:text-[#0066CC]'
            }`}
          >
            {t('orders.outForDelivery')}
          </button>
        </div>

        {orders.length === 0 ? (
          <Card className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
            <p className="text-gray-600 text-lg">{t('orders.empty')}</p>
            <p className="text-gray-500 text-sm mt-2">
              {statusFilter ? t('orders.emptyFiltered', { status: getStatusLabel(statusFilter) }) : t('orders.emptyDefault')}
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {orders.map((order) => (
              <Card
                key={order.id}
                hover
                onClick={() => handleOrderClick(order.id)}
                className="animate-fade-in"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h2 className="truncate text-base font-bold text-gray-900 sm:text-lg">
                        {t('orderDetails.order')} #{order.order.order_no}
                      </h2>
                      {getStatusBadge(order.status)}
                    </div>
                    <div className="space-y-1">
                      <p className="flex min-w-0 items-center gap-2 truncate text-sm text-gray-600">
                        <svg
                          className="w-4 h-4 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                        {order.order.user.name}
                      </p>
                      <p className="flex items-center gap-2 text-sm text-gray-600">
                        <svg
                          className="w-4 h-4 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                          />
                        </svg>
                        {order.items.length} {order.items.length > 1 ? t('orders.items') : t('orders.item')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-end justify-between border-t border-slate-100 pt-3 text-right sm:ml-4 sm:block sm:border-0 sm:pt-0">
                    <p className="order-2 text-xl font-bold text-[#0066CC] sm:text-2xl">
                      €{Number(order.total || 0).toFixed(2)}
                    </p>
                    <p className="order-1 text-xs text-gray-500 sm:mt-1">{t('orders.total')}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Order Details Modal */}
        {selectedOrderId && (
          <OrderDetailsModal
            isOpen={isModalOpen}
            onClose={handleModalClose}
            orderId={selectedOrderId}
            onOrderUpdate={handleOrderUpdate}
          />
        )}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}

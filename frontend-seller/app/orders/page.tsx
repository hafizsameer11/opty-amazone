'use client';

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
  const router = useRouter();
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const loadOrders = async () => {
    try {
      setLoadingOrders(true);
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
          <p className="mt-4 text-gray-600">Loading...</p>
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

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'default' | 'success' | 'warning' | 'error' | 'info' | 'primary' | 'secondary'; label: string }> = {
      pending: { variant: 'warning', label: 'Pending' },
      accepted: { variant: 'info', label: 'Accepted' },
      rejected: { variant: 'error', label: 'Rejected' },
      paid: { variant: 'success', label: 'Paid' },
      out_for_delivery: { variant: 'primary', label: 'Out for Delivery' },
      delivered: { variant: 'default', label: 'Delivered' },
      cancelled: { variant: 'error', label: 'Cancelled' },
    };

    const config = statusConfig[status] || { variant: 'default' as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 pb-20 lg:pb-0">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto px-4 py-8 w-full">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Orders</h1>

        {/* Status Filter */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setStatusFilter('')}
            className={`px-4 py-2.5 rounded-lg whitespace-nowrap font-medium transition-all duration-200 ${
              !statusFilter
                ? 'bg-gradient-to-r from-[#0066CC] to-[#0052A3] text-white shadow-md'
                : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-[#0066CC] hover:text-[#0066CC]'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-4 py-2.5 rounded-lg whitespace-nowrap font-medium transition-all duration-200 ${
              statusFilter === 'pending'
                ? 'bg-gradient-to-r from-[#0066CC] to-[#0052A3] text-white shadow-md'
                : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-[#0066CC] hover:text-[#0066CC]'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setStatusFilter('accepted')}
            className={`px-4 py-2.5 rounded-lg whitespace-nowrap font-medium transition-all duration-200 ${
              statusFilter === 'accepted'
                ? 'bg-gradient-to-r from-[#0066CC] to-[#0052A3] text-white shadow-md'
                : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-[#0066CC] hover:text-[#0066CC]'
            }`}
          >
            Accepted
          </button>
          <button
            onClick={() => setStatusFilter('paid')}
            className={`px-4 py-2.5 rounded-lg whitespace-nowrap font-medium transition-all duration-200 ${
              statusFilter === 'paid'
                ? 'bg-gradient-to-r from-[#0066CC] to-[#0052A3] text-white shadow-md'
                : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-[#0066CC] hover:text-[#0066CC]'
            }`}
          >
            Paid
          </button>
          <button
            onClick={() => setStatusFilter('out_for_delivery')}
            className={`px-4 py-2.5 rounded-lg whitespace-nowrap font-medium transition-all duration-200 ${
              statusFilter === 'out_for_delivery'
                ? 'bg-gradient-to-r from-[#0066CC] to-[#0052A3] text-white shadow-md'
                : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-[#0066CC] hover:text-[#0066CC]'
            }`}
          >
            Out for Delivery
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
            <p className="text-gray-600 text-lg">No orders found</p>
            <p className="text-gray-500 text-sm mt-2">
              {statusFilter ? `No orders with status "${statusFilter}"` : 'You don\'t have any orders yet'}
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
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-lg font-bold text-gray-900">
                        Order #{order.order.order_no}
                      </h2>
                      {getStatusBadge(order.status)}
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600 flex items-center gap-2">
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
                      <p className="text-sm text-gray-600 flex items-center gap-2">
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
                        {order.items.length} item{order.items.length > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-2xl font-bold text-[#0066CC] mb-1">
                      €{Number(order.total || 0).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">Total</p>
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


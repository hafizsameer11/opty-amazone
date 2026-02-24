'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
// Layout components are now handled by app/template.tsx
import { orderService, type Order, type StoreOrder } from '@/services/order-service';
import Button from '@/components/ui/Button';
import Image from 'next/image';

export default function OrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(true);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    if (isAuthenticated && params.id) {
      loadOrder();
    }
  }, [isAuthenticated, params.id]);

  const loadOrder = async () => {
    try {
      setLoadingOrder(true);
      const data = await orderService.getOrder(Number(params.id));
      setOrder(data);
    } catch (error) {
      console.error('Failed to load order:', error);
    } finally {
      setLoadingOrder(false);
    }
  };

  const handlePayStoreOrder = async (storeOrderId: number) => {
    try {
      await orderService.payStoreOrder(storeOrderId, 'wallet');
      loadOrder();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Payment failed');
    }
  };

  if (loading || loadingOrder) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0066CC] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !order) {
    return null;
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, { bg: string; text: string; icon: string }> = {
      pending: {
        bg: 'bg-amber-50 border-amber-200',
        text: 'text-amber-700',
        icon: '⏳',
      },
      accepted: {
        bg: 'bg-blue-50 border-blue-200',
        text: 'text-blue-700',
        icon: '✓',
      },
      rejected: {
        bg: 'bg-red-50 border-red-200',
        text: 'text-red-700',
        icon: '✗',
      },
      paid: {
        bg: 'bg-green-50 border-green-200',
        text: 'text-green-700',
        icon: '💳',
      },
      out_for_delivery: {
        bg: 'bg-purple-50 border-purple-200',
        text: 'text-purple-700',
        icon: '🚚',
      },
      delivered: {
        bg: 'bg-gray-50 border-gray-200',
        text: 'text-gray-700',
        icon: '📦',
      },
      cancelled: {
        bg: 'bg-red-50 border-red-200',
        text: 'text-red-700',
        icon: '❌',
      },
    };
    return colors[status] || { bg: 'bg-gray-50 border-gray-200', text: 'text-gray-700', icon: '•' };
  };

  const formatStatus = (status: string) => {
    return status
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 w-full">
        {/* Header Section */}
        <div className="mb-6 lg:mb-8">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-[#0066CC] hover:text-[#0052a3] transition-colors mb-4 group"
          >
            <svg
              className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="font-medium">Back to Orders</span>
          </button>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
                Order Details
              </h1>
              <div className="flex items-center gap-3">
                <span className="text-gray-600 font-medium">Order #{order.order_no}</span>
                <span className="text-gray-400">•</span>
                <span className="text-sm text-gray-500">
                  {new Date(order.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Store Orders */}
            {order.store_orders.map((storeOrder) => {
              const statusStyle = getStatusColor(storeOrder.status);
              return (
                <div
                  key={storeOrder.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Store Header */}
                  <div className="bg-gradient-to-r from-[#0066CC] to-[#0052a3] px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-lg">
                          {storeOrder.store.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-white">{storeOrder.store.name}</h3>
                          <p className="text-sm text-white/80">Store Order #{storeOrder.id}</p>
                        </div>
                      </div>
                      <div
                        className={`px-4 py-2 rounded-full border-2 ${statusStyle.bg} ${statusStyle.text} font-semibold text-sm flex items-center gap-2`}
                      >
                        <span>{statusStyle.icon}</span>
                        <span>{formatStatus(storeOrder.status)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    {/* OTP Code Display */}
                    {storeOrder.delivery_code && (
                      <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-300 rounded-xl p-6 mb-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-amber-200 flex items-center justify-center">
                            <svg
                              className="w-6 h-6 text-amber-700"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                              />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-amber-900 uppercase tracking-wide">
                              Delivery Code (OTP)
                            </p>
                            <p className="text-xs text-amber-700 mt-0.5">
                              Required for delivery confirmation
                            </p>
                          </div>
                        </div>
                        <div className="bg-white rounded-lg p-4 border-2 border-amber-400">
                          <p className="text-4xl font-bold text-[#0066CC] text-center tracking-wider mb-2">
                            {storeOrder.delivery_code}
                          </p>
                        </div>
                        <p className="text-xs text-amber-800 text-center mt-3 font-medium">
                          💡 Save this code. The seller will need it to mark your order as delivered.
                        </p>
                      </div>
                    )}

                    {/* Payment Button for Accepted Orders */}
                    {storeOrder.status === 'accepted' && (
                      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-5 mb-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="text-sm font-semibold text-gray-700 mb-1">
                              Payment Required
                            </p>
                            <p className="text-2xl font-bold text-[#0066CC]">
                              €{Number(storeOrder.total || 0).toFixed(2)}
                            </p>
                          </div>
                          <div className="w-12 h-12 rounded-full bg-blue-200 flex items-center justify-center">
                            <svg
                              className="w-6 h-6 text-blue-700"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                              />
                            </svg>
                          </div>
                        </div>
                        <Button
                          onClick={() => handlePayStoreOrder(storeOrder.id)}
                          className="w-full"
                          size="lg"
                        >
                          <span className="flex items-center justify-center gap-2">
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                              />
                            </svg>
                            Pay Now
                          </span>
                        </Button>
                      </div>
                    )}

                    {/* Order Items */}
                    <div className="mb-6">
                      <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <svg
                          className="w-5 h-5 text-[#0066CC]"
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
                        Order Items ({storeOrder.items.length})
                      </h4>
                      <div className="space-y-4">
                        {storeOrder.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-[#0066CC]/30 transition-colors"
                          >
                            <div className="relative w-24 h-24 sm:w-28 sm:h-28 bg-white rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                              {item.product_images && item.product_images[0] ? (
                                <Image
                                  src={item.product_images[0]}
                                  alt={item.product_name}
                                  fill
                                  className="object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                                  <svg
                                    className="w-8 h-8 text-gray-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                    />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h5 className="font-bold text-gray-900 mb-1 line-clamp-2">
                                {item.product_name}
                              </h5>
                              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 mb-2">
                                <span className="flex items-center gap-1">
                                  <span className="font-medium">SKU:</span>
                                  <span>{item.product_sku}</span>
                                </span>
                                <span className="text-gray-300">•</span>
                                <span className="flex items-center gap-1">
                                  <span className="font-medium">Qty:</span>
                                  <span className="bg-[#0066CC]/10 text-[#0066CC] px-2 py-0.5 rounded font-semibold">
                                    {item.quantity}
                                  </span>
                                </span>
                              </div>
                              <p className="text-lg font-bold text-[#0066CC]">
                                €{Number(item.line_total || 0).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Store Order Totals */}
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 border border-gray-200">
                      <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <svg
                          className="w-5 h-5 text-[#0066CC]"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                          />
                        </svg>
                        Order Summary
                      </h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center py-2">
                          <span className="text-gray-600 font-medium">Subtotal:</span>
                          <span className="font-bold text-gray-900">
                            €{Number(storeOrder.subtotal || 0).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                          <span className="text-gray-600 font-medium">Delivery Fee:</span>
                          <span className="font-bold text-gray-900">
                            €{Number(storeOrder.delivery_fee || 0).toFixed(2)}
                          </span>
                        </div>
                        <div className="border-t-2 border-gray-300 pt-3 mt-2">
                          <div className="flex justify-between items-center">
                            <span className="text-lg font-bold text-gray-900">Total:</span>
                            <span className="text-2xl font-bold text-[#0066CC]">
                              €{Number(storeOrder.total || 0).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* View Details Link */}
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <Link
                        href={`/store-orders/${storeOrder.id}`}
                        className="inline-flex items-center gap-2 text-[#0066CC] hover:text-[#0052a3] font-semibold transition-colors group"
                      >
                        <span>View Full Store Order Details</span>
                        <svg
                          className="w-5 h-5 transform group-hover:translate-x-1 transition-transform"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sidebar - Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sticky top-4">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <svg
                  className="w-6 h-6 text-[#0066CC]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Order Summary
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-gray-600 font-medium">Items Total:</span>
                  <span className="font-bold text-gray-900">
                    €{Number(order.items_total || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-gray-600 font-medium">Shipping:</span>
                  <span className="font-bold text-gray-900">
                    €{Number(order.shipping_total || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-gray-600 font-medium">Platform Fee:</span>
                  <span className="font-bold text-gray-900">
                    €{Number(order.platform_fee || 0).toFixed(2)}
                  </span>
                </div>
                <div className="pt-4 border-t-2 border-gray-300">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-900">Grand Total:</span>
                    <span className="text-2xl font-bold text-[#0066CC]">
                      €{Number(order.grand_total || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Order Info */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <svg
                      className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <div>
                      <p className="text-gray-500 font-medium">Order Date</p>
                      <p className="text-gray-900 font-semibold">
                        {new Date(order.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <svg
                      className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                    <div>
                      <p className="text-gray-500 font-medium">Stores</p>
                      <p className="text-gray-900 font-semibold">
                        {order.store_orders.length} store{order.store_orders.length > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { orderService, type Order, type StoreOrder } from '@/services/order-service';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Image from 'next/image';
import { useToast } from '@/components/ui/Toast';

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: number;
}

export default function OrderDetailsModal({
  isOpen,
  onClose,
  orderId,
}: OrderDetailsModalProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && orderId) {
      loadOrder();
    }
  }, [isOpen, orderId]);

  const loadOrder = async () => {
    try {
      setLoadingOrder(true);
      setError('');
      const data = await orderService.getOrder(orderId);
      setOrder(data);
    } catch (error) {
      console.error('Failed to load order:', error);
      setError('Failed to load order details');
    } finally {
      setLoadingOrder(false);
    }
  };

  const handlePayStoreOrder = async (storeOrderId: number) => {
    try {
      await orderService.payStoreOrder(storeOrderId, 'wallet');
      await loadOrder();
      showToast('success', 'Payment processed successfully');
    } catch (error: any) {
      showToast('error', error.response?.data?.message || 'Payment failed');
    }
  };

  const handleViewFullPage = () => {
    onClose();
    router.push(`/orders/${orderId}`);
  };

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={order ? `Order #${order.order_no}` : 'Order Details'}
      size="xl"
    >
      {loadingOrder ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0066CC] mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading order details...</p>
          </div>
        </div>
      ) : error ? (
        <div className="py-12 text-center">
          <p className="text-red-600">{error}</p>
        </div>
      ) : !order ? (
        <div className="py-12 text-center">
          <p className="text-gray-600">Order not found</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Order Header Info */}
          <div className="bg-gradient-to-r from-[#0066CC]/10 to-[#00CC66]/5 rounded-xl p-4 border border-[#0066CC]/20">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-sm text-gray-600 mb-1">Order Date</p>
                <p className="font-semibold text-gray-900">
                  {new Date(order.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600 mb-1">Grand Total</p>
                <p className="text-2xl font-bold text-[#0066CC]">
                  €{Number(order.grand_total || 0).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Store Orders */}
          <div className="space-y-4">
            {order.store_orders.map((storeOrder) => {
              const statusStyle = getStatusColor(storeOrder.status);
              return (
                <div
                  key={storeOrder.id}
                  className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden hover:border-[#0066CC]/30 transition-all"
                >
                  {/* Store Header */}
                  <div className="bg-gradient-to-r from-[#0066CC] to-[#0052a3] px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">
                          {storeOrder.store.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-white">{storeOrder.store.name}</h3>
                          <p className="text-xs text-white/80">Store Order #{storeOrder.id}</p>
                        </div>
                      </div>
                      <div
                        className={`px-3 py-1 rounded-full border ${statusStyle.bg} ${statusStyle.text} font-semibold text-xs flex items-center gap-1`}
                      >
                        <span>{statusStyle.icon}</span>
                        <span>{formatStatus(storeOrder.status)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4">
                    {/* OTP Code Display */}
                    {storeOrder.delivery_code && (
                      <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-300 rounded-lg p-4 mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <svg
                            className="w-5 h-5 text-amber-700"
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
                          <p className="text-xs font-bold text-amber-900 uppercase">Delivery Code</p>
                        </div>
                        <div className="bg-white rounded-lg p-3 border-2 border-amber-400">
                          <p className="text-3xl font-bold text-[#0066CC] text-center tracking-wider">
                            {storeOrder.delivery_code}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Payment Button for Accepted Orders */}
                    {storeOrder.status === 'accepted' && (
                      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-xs font-semibold text-gray-700 mb-1">Payment Required</p>
                            <p className="text-xl font-bold text-[#0066CC]">
                              €{Number(storeOrder.total || 0).toFixed(2)}
                            </p>
                          </div>
                        </div>
                        <Button
                          onClick={() => handlePayStoreOrder(storeOrder.id)}
                          className="w-full"
                          size="sm"
                        >
                          Pay Now
                        </Button>
                      </div>
                    )}

                    {/* Order Items */}
                    <div className="mb-4">
                      <h4 className="text-sm font-bold text-gray-900 mb-3">Items ({storeOrder.items.length})</h4>
                      <div className="space-y-2">
                        {storeOrder.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                          >
                            <div className="relative w-16 h-16 bg-white rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
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
                                    className="w-6 h-6 text-gray-400"
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
                              <h5 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2">
                                {item.product_name}
                              </h5>
                              <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                                <span>Qty: {item.quantity}</span>
                                <span>•</span>
                                <span>SKU: {item.product_sku}</span>
                              </div>
                              <p className="text-sm font-bold text-[#0066CC]">
                                €{Number(item.line_total || 0).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Store Order Totals */}
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Subtotal:</span>
                          <span className="font-bold text-gray-900">
                            €{Number(storeOrder.subtotal || 0).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Delivery Fee:</span>
                          <span className="font-bold text-gray-900">
                            €{Number(storeOrder.delivery_fee || 0).toFixed(2)}
                          </span>
                        </div>
                        <div className="border-t border-gray-300 pt-2 mt-2">
                          <div className="flex justify-between">
                            <span className="font-bold text-gray-900">Total:</span>
                            <span className="text-lg font-bold text-[#0066CC]">
                              €{Number(storeOrder.total || 0).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Order Summary */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 border border-gray-200">
            <h4 className="font-bold text-gray-900 mb-4">Order Summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Items Total:</span>
                <span className="font-bold text-gray-900">
                  €{Number(order.items_total || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping:</span>
                <span className="font-bold text-gray-900">
                  €{Number(order.shipping_total || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Platform Fee:</span>
                <span className="font-bold text-gray-900">
                  €{Number(order.platform_fee || 0).toFixed(2)}
                </span>
              </div>
              <div className="border-t-2 border-gray-300 pt-3 mt-2">
                <div className="flex justify-between">
                  <span className="text-lg font-bold text-gray-900">Grand Total:</span>
                  <span className="text-2xl font-bold text-[#0066CC]">
                    €{Number(order.grand_total || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button onClick={handleViewFullPage} variant="outline" className="flex-1">
              View Full Page
            </Button>
            <Link href={`/store-orders/${order.store_orders[0]?.id}`} className="flex-1">
              <Button variant="primary" className="w-full">
                Store Details
              </Button>
            </Link>
          </div>
        </div>
      )}
    </Modal>
  );
}


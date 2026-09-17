'use client';

import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import DeliverySummary from '@/components/orders/DeliverySummary';
import OrderActions from '@/components/orders/OrderActions';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
// Layout components are now handled by app/template.tsx
import { orderService, type StoreOrder, type OrderItem } from '@/services/order-service';
import OrderLineSelections from '@/components/orders/OrderLineSelections';
import Button from '@/components/ui/Button';
import Image from 'next/image';
import Link from 'next/link';
import { getFullImageUrl, isLocalhostImage } from '@/lib/image-utils';

export default function StoreOrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();
  const [storeOrder, setStoreOrder] = useState<StoreOrder | null>(null);
  const [paying, setPaying] = useState(false);
  const [loadingOrder, setLoadingOrder] = useState(true);

  useLiveRefresh(() => loadStoreOrder(true), isAuthenticated && Boolean(params.id));

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    if (isAuthenticated && params.id) {
      loadStoreOrder();
    }
  }, [isAuthenticated, params.id]);

  const loadStoreOrder = async (silent = false) => {
    try {
      if (!silent) setLoadingOrder(true);
      const data = await orderService.getStoreOrder(Number(params.id));
      setStoreOrder(data);
    } catch (error) {
      console.error('Failed to load store order:', error);
    } finally {
      setLoadingOrder(false);
    }
  };

  const handlePay = async () => {
    if (!storeOrder || paying) return;
    setPaying(true);
    try {
      await orderService.payStoreOrder(storeOrder.id, 'wallet', Number(storeOrder.total));
      loadStoreOrder();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Payment failed');
    } finally { setPaying(false); }
  };

  if (loading || loadingOrder) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0066CC] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !storeOrder) {
    return null;
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      awaiting_payment: 'bg-blue-100 text-blue-800',
      rejected: 'bg-red-100 text-red-800',
      paid: 'bg-green-100 text-green-800',
      out_for_delivery: 'bg-purple-100 text-purple-800',
      delivered: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const resolvedStoreOrderTotal = (() => {
    return Number(storeOrder.total ?? 0);
  })();

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 w-full">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-[#0066CC] hover:underline mb-4"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Store Order Details</h1>
          <p className="text-gray-600 mt-1">Order #{storeOrder.id}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {storeOrder.store.name}
              </h2>
              <p className="text-sm text-gray-600">Store Order #{storeOrder.id}</p>
            </div>
            <span
              className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(
                storeOrder.status
              )}`}
            >
              {storeOrder.status.replace('_', ' ').toUpperCase()}
            </span>
          </div>

          <DeliverySummary shipment={storeOrder} />
          <OrderActions shipment={storeOrder} onUpdate={() => loadStoreOrder(true)} />
          {/* Delivery verification code */}
          {storeOrder.delivery_code && (
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-4 border-yellow-300 rounded-xl p-6 mb-6 text-center">
              <p className="text-sm font-semibold text-yellow-900 mb-3 uppercase tracking-wide">
                Your Delivery Code (OTP)
              </p>
              <p className="text-5xl font-bold text-[#0066CC] mb-3 tracking-wider">
                {storeOrder.delivery_code}
              </p>
              <p className="text-xs text-yellow-800 max-w-md mx-auto">
                Give this code to the courier only after you have received the products. It confirms delivery and releases the seller’s earnings.
              </p>
            </div>
          )}

          {/* Payment Section */}
          {storeOrder.financial_version === 1 && storeOrder.status === 'awaiting_payment' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Required</h3>
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-700">Total Amount:</span>
                <span className="text-2xl font-bold text-[#0066CC]">
                  €{resolvedStoreOrderTotal.toFixed(2)}
                </span>
              </div>
              <Button disabled={paying} onClick={handlePay} className="w-full" size="lg">
                Pay Now
              </Button>
            </div>
          )}

          {/* Delivery Information */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">Delivery Information</h3>
            <p className="text-sm text-gray-600">
              <strong>Estimated Delivery:</strong>{' '}
              {storeOrder.estimated_delivery_date
                ? new Date(storeOrder.estimated_delivery_date).toLocaleDateString()
                : 'Not scheduled yet'}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Method:</strong> {storeOrder.delivery_method || 'Standard'}
            </p>
            {storeOrder.delivery_notes && (
              <p className="text-sm text-gray-600 mt-2">{storeOrder.delivery_notes}</p>
            )}
          </div>

          {/* Order Items */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h3>
            <div className="space-y-4">
              {storeOrder.items.map((item: OrderItem) => (
                <div key={item.id} className="flex gap-4 border-b pb-4">
                  <div className="relative w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    {getFullImageUrl(item.product_images?.[0]) !== '/file.svg' && (
                      <Image
                        src={getFullImageUrl(item.product_images?.[0])}
                        alt={item.product_name}
                        fill
                        className="object-cover"
                        unoptimized={isLocalhostImage(getFullImageUrl(item.product_images?.[0]))}
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 mb-1">{item.product_name}</p>
                    <p className="text-sm text-gray-600 mb-1">SKU: {item.product_sku}</p>
                    <p className="text-sm text-gray-600 mb-2">Quantity: {item.quantity}</p>
                    <p className="text-lg font-bold text-[#0066CC]">
                      €{Number(item.line_total || 0).toFixed(2)}
                    </p>
                    <OrderLineSelections line={item} className="mt-2 pt-2 border-t border-gray-200" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Totals */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Order Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-semibold">€{Number(storeOrder.subtotal || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Delivery Fee:</span>
                <span className="font-semibold">€{Number(storeOrder.delivery_fee || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 mt-2">
                <span className="text-lg font-bold">Total:</span>
                <span className="text-lg font-bold text-[#0066CC]">
                  €{resolvedStoreOrderTotal.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Escrow Information */}
          {storeOrder.escrow && (
            <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">
                <strong>Payment Status:</strong> Funds are{' '}
                {storeOrder.escrow.status.replaceAll('_', ' ')}
              </p>
            </div>
          )}
        </div>
    </div>
  );
}


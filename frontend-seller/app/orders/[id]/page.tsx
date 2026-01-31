'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import { orderService, type StoreOrder } from '@/services/order-service';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Alert from '@/components/ui/Alert';

export default function SellerOrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();
  const [storeOrder, setStoreOrder] = useState<StoreOrder | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [showAcceptForm, setShowAcceptForm] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showDeliveredForm, setShowDeliveredForm] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState('');
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
      setStoreOrder(data);
    } catch (error) {
      console.error('Failed to load order:', error);
    } finally {
      setLoadingOrder(false);
    }
  };

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeOrder) return;

    try {
      setError('');
      await orderService.acceptOrder(storeOrder.id, {
        delivery_fee: parseFloat(deliveryFee),
        estimated_delivery_date: estimatedDeliveryDate || undefined,
        delivery_method: deliveryMethod || undefined,
        delivery_notes: deliveryNotes || undefined,
      });
      setSuccess('Order accepted successfully');
      setShowAcceptForm(false);
      loadOrder();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to accept order');
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeOrder) return;

    try {
      setError('');
      await orderService.rejectOrder(storeOrder.id, rejectionReason);
      setSuccess('Order rejected');
      setShowRejectForm(false);
      loadOrder();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to reject order');
    }
  };

  const handleOutForDelivery = async () => {
    if (!storeOrder) return;

    try {
      setError('');
      await orderService.markOutForDelivery(storeOrder.id);
      setSuccess('Order marked as out for delivery');
      loadOrder();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to update order');
    }
  };

  const handleDelivered = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeOrder) return;

    try {
      setError('');
      await orderService.markDelivered(storeOrder.id, otpCode);
      setSuccess('Order marked as delivered');
      setShowDeliveredForm(false);
      setOtpCode('');
      loadOrder();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Invalid delivery code');
    }
  };

  if (loading || loadingOrder) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 pb-20 lg:pb-0">
      <Header />
      <main className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-[#0066CC] hover:underline mb-4"
          >
            ← Back to Orders
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Order Details</h1>
          <p className="text-gray-600 mt-1">Order #{storeOrder.order.order_no}</p>
        </div>

        {error && (
          <div className="mb-4">
            <Alert type="error" message={error} />
          </div>
        )}

        {success && (
          <div className="mb-4">
            <Alert type="success" message={success} />
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Customer: {storeOrder.order.user.name}
              </h2>
              <p className="text-sm text-gray-600">{storeOrder.order.user.email}</p>
            </div>
            <span
              className={`px-4 py-2 rounded-full text-sm font-semibold ${
                storeOrder.status === 'pending'
                  ? 'bg-yellow-100 text-yellow-800'
                  : storeOrder.status === 'accepted'
                  ? 'bg-blue-100 text-blue-800'
                  : storeOrder.status === 'paid'
                  ? 'bg-green-100 text-green-800'
                  : storeOrder.status === 'out_for_delivery'
                  ? 'bg-purple-100 text-purple-800'
                  : storeOrder.status === 'delivered'
                  ? 'bg-gray-100 text-gray-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {storeOrder.status.replace('_', ' ').toUpperCase()}
            </span>
          </div>

          {/* Order Items */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h3>
            <div className="space-y-3">
              {storeOrder.items.map((item) => (
                <div key={item.id} className="flex justify-between border-b pb-3">
                  <div>
                    <p className="font-semibold text-gray-900">{item.product_name}</p>
                    <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                  </div>
                  <p className="text-sm font-semibold text-[#0066CC]">
                    €{Number(item.line_total || 0).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Order Totals */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-semibold">€{Number(storeOrder.subtotal || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Delivery Fee:</span>
                <span className="font-semibold">€{Number(storeOrder.delivery_fee || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-bold">Total:</span>
                <span className="font-bold text-[#0066CC]">
                  €{Number(storeOrder.total || 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Actions based on status */}
          {storeOrder.status === 'pending' && (
            <div className="space-y-4">
              {!showAcceptForm && !showRejectForm && (
                <div className="flex gap-4">
                  <Button
                    onClick={() => {
                      setShowAcceptForm(true);
                      setShowRejectForm(false);
                    }}
                    className="flex-1"
                  >
                    Accept Order
                  </Button>
                  <Button
                    onClick={() => {
                      setShowRejectForm(true);
                      setShowAcceptForm(false);
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Reject Order
                  </Button>
                </div>
              )}

              {showAcceptForm && (
                <form onSubmit={handleAccept} className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Accept Order</h3>
                  <div className="space-y-4">
                    <Input
                      label="Delivery Fee"
                      type="number"
                      step="0.01"
                      value={deliveryFee}
                      onChange={(e) => setDeliveryFee(e.target.value)}
                      required
                    />
                    <Input
                      label="Estimated Delivery Date"
                      type="date"
                      value={estimatedDeliveryDate}
                      onChange={(e) => setEstimatedDeliveryDate(e.target.value)}
                    />
                    <Input
                      label="Delivery Method"
                      type="text"
                      value={deliveryMethod}
                      onChange={(e) => setDeliveryMethod(e.target.value)}
                      placeholder="e.g., Express, Standard"
                    />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Delivery Notes
                      </label>
                      <textarea
                        value={deliveryNotes}
                        onChange={(e) => setDeliveryNotes(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066CC] focus:border-transparent"
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-4">
                      <Button type="submit" className="flex-1">
                        Accept
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowAcceptForm(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </form>
              )}

              {showRejectForm && (
                <form onSubmit={handleReject} className="bg-red-50 border border-red-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Reject Order</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Reason for Rejection
                      </label>
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066CC] focus:border-transparent"
                        rows={3}
                        required
                      />
                    </div>
                    <div className="flex gap-4">
                      <Button type="submit" variant="outline" className="flex-1">
                        Reject
                      </Button>
                      <Button
                        type="button"
                        onClick={() => setShowRejectForm(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          )}

          {storeOrder.status === 'paid' && (
            <Button onClick={handleOutForDelivery} className="w-full">
              Mark as Out for Delivery
            </Button>
          )}

          {storeOrder.status === 'out_for_delivery' && (
            <div>
              {!showDeliveredForm ? (
                <Button
                  onClick={() => setShowDeliveredForm(true)}
                  className="w-full"
                >
                  Mark as Delivered
                </Button>
              ) : (
                <form onSubmit={handleDelivered} className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Mark as Delivered</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Please enter the delivery code (OTP) provided by the customer.
                  </p>
                  <div className="space-y-4">
                    <Input
                      label="Delivery Code (OTP)"
                      type="text"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="Enter 6-digit code"
                      maxLength={6}
                      required
                    />
                    <div className="flex gap-4">
                      <Button type="submit" className="flex-1">
                        Confirm Delivery
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowDeliveredForm(false);
                          setOtpCode('');
                        }}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}


'use client';

import { useEffect, useState } from 'react';
import { orderService, type StoreOrder } from '@/services/order-service';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: number;
  onOrderUpdate?: () => void;
}

export default function OrderDetailsModal({
  isOpen,
  onClose,
  orderId,
  onOrderUpdate,
}: OrderDetailsModalProps) {
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
    if (isOpen && orderId) {
      loadOrder();
    }
  }, [isOpen, orderId]);

  const loadOrder = async () => {
    try {
      setLoadingOrder(true);
      setError('');
      setSuccess('');
      const data = await orderService.getOrder(orderId);
      setStoreOrder(data);
    } catch (error) {
      console.error('Failed to load order:', error);
      setError('Failed to load order details');
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
      setDeliveryFee('');
      setEstimatedDeliveryDate('');
      setDeliveryMethod('');
      setDeliveryNotes('');
      await loadOrder();
      onOrderUpdate?.();
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
      setRejectionReason('');
      await loadOrder();
      onOrderUpdate?.();
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
      await loadOrder();
      onOrderUpdate?.();
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
      await loadOrder();
      onOrderUpdate?.();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Invalid delivery code');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'default' | 'success' | 'warning' | 'error' | 'info' | 'primary' | 'secondary'; label: string }> = {
      pending: { variant: 'warning', label: 'Pending' },
      accepted: { variant: 'info', label: 'Accepted' },
      paid: { variant: 'success', label: 'Paid' },
      out_for_delivery: { variant: 'primary', label: 'Out for Delivery' },
      delivered: { variant: 'default', label: 'Delivered' },
      cancelled: { variant: 'error', label: 'Cancelled' },
      rejected: { variant: 'error', label: 'Rejected' },
    };

    const config = statusConfig[status] || { variant: 'default' as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={storeOrder ? `Order #${storeOrder.order.order_no}` : 'Order Details'}
      size="lg"
    >
      {loadingOrder ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0066CC] mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading order details...</p>
          </div>
        </div>
      ) : !storeOrder ? (
        <div className="py-12 text-center">
          <p className="text-gray-600">Order not found</p>
        </div>
      ) : (
        <div className="space-y-6">
          {error && <Alert type="error" message={error} />}
          {success && <Alert type="success" message={success} />}

          <Card>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  {storeOrder.order.user.name}
                </h3>
                <p className="text-sm text-gray-600">{storeOrder.order.user.email}</p>
              </div>
              {getStatusBadge(storeOrder.status)}
            </div>

            {/* Order Items */}
            <div className="mb-6">
              <h4 className="text-base font-semibold text-gray-900 mb-4">Order Items</h4>
              <div className="space-y-3">
                {storeOrder.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{item.product_name}</p>
                      <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                    </div>
                    <p className="text-base font-bold text-[#0066CC]">
                      €{Number(item.line_total || 0).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Totals */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-semibold text-gray-900">
                    €{Number(storeOrder.subtotal || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Delivery Fee:</span>
                  <span className="font-semibold text-gray-900">
                    €{Number(storeOrder.delivery_fee || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-gray-300 pt-3">
                  <span className="text-lg font-bold text-gray-900">Total:</span>
                  <span className="text-xl font-bold text-[#0066CC]">
                    €{Number(storeOrder.total || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </Card>

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
                <Card className="bg-blue-50/50 border-blue-200">
                  <h4 className="text-lg font-semibold mb-4 text-gray-900">Accept Order</h4>
                  <form onSubmit={handleAccept} className="space-y-4">
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
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066CC] focus:border-[#0066CC] transition-all"
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
                        onClick={() => {
                          setShowAcceptForm(false);
                          setDeliveryFee('');
                          setEstimatedDeliveryDate('');
                          setDeliveryMethod('');
                          setDeliveryNotes('');
                        }}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </Card>
              )}

              {showRejectForm && (
                <Card className="bg-red-50/50 border-red-200">
                  <h4 className="text-lg font-semibold mb-4 text-gray-900">Reject Order</h4>
                  <form onSubmit={handleReject} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Reason for Rejection
                      </label>
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066CC] focus:border-[#0066CC] transition-all"
                        rows={3}
                        required
                      />
                    </div>
                    <div className="flex gap-4">
                      <Button type="submit" variant="danger" className="flex-1">
                        Reject
                      </Button>
                      <Button
                        type="button"
                        onClick={() => {
                          setShowRejectForm(false);
                          setRejectionReason('');
                        }}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </Card>
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
                <Card className="bg-green-50/50 border-green-200">
                  <h4 className="text-lg font-semibold mb-4 text-gray-900">Mark as Delivered</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Please enter the delivery code (OTP) provided by the customer.
                  </p>
                  <form onSubmit={handleDelivered} className="space-y-4">
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
                  </form>
                </Card>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}


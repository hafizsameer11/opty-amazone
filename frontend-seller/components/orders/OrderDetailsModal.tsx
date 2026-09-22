'use client';

import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import DeliverySummary from '@/components/orders/DeliverySummary';
import { useEffect, useState } from 'react';
import { orderService, type StoreOrder, type OrderItem } from '@/services/order-service';
import OrderLineSelections from '@/components/orders/OrderLineSelections';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Alert from '@/components/ui/Alert';
import Badge from '@/components/ui/Badge';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import { useLanguage } from '@/contexts/LanguageContext';

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
  const { t } = useLanguage();
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

  useLiveRefresh(() => loadOrder(true), isOpen && Boolean(orderId));

  useEffect(() => {
    if (isOpen && orderId) {
      loadOrder();
    }
  }, [isOpen, orderId]);

  const loadOrder = async (silent = false) => {
    try {
      if (!silent) setLoadingOrder(true);
      setError('');
      setSuccess('');
      const data = await orderService.getOrder(orderId);
      setStoreOrder(data);
    } catch (error) {
      console.error('Failed to load order:', error);
      setError(t('orderDetails.loadFailed'));
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
      setSuccess(t('orderDetails.accepted'));
      setShowAcceptForm(false);
      setDeliveryFee('');
      setEstimatedDeliveryDate('');
      setDeliveryMethod('');
      setDeliveryNotes('');
      await loadOrder();
      onOrderUpdate?.();
    } catch (error: any) {
      setError(error.response?.data?.message || t('orderDetails.acceptFailed'));
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeOrder) return;

    try {
      setError('');
      await orderService.rejectOrder(storeOrder.id, rejectionReason);
      setSuccess(t('orderDetails.rejected'));
      setShowRejectForm(false);
      setRejectionReason('');
      await loadOrder();
      onOrderUpdate?.();
    } catch (error: any) {
      setError(error.response?.data?.message || t('orderDetails.rejectFailed'));
    }
  };

  const handleOutForDelivery = async () => {
    if (!storeOrder) return;

    try {
      setError('');
      await orderService.markOutForDelivery(storeOrder.id);
      setSuccess(t('orderDetails.outForDelivery'));
      await loadOrder();
      onOrderUpdate?.();
    } catch (error: any) {
      setError(error.response?.data?.message || t('orderDetails.updateFailed'));
    }
  };

  const handleDeliveryRequest = async () => {
    if (!storeOrder) return;
    setShowDeliveredForm(true);
    try {
      await orderService.requestDeliveryCode(storeOrder.id);
    } catch (error: any) {
      setError(error.response?.data?.message || t('orderDetails.deliveryRequestFailed'));
    }
  };

  const handleDelivered = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeOrder) return;

    try {
      setError('');
      await orderService.markDelivered(storeOrder.id, otpCode);
      setSuccess(t('orderDetails.delivered'));
      setShowDeliveredForm(false);
      setOtpCode('');
      await loadOrder();
      onOrderUpdate?.();
    } catch (error: any) {
      setError(error.response?.data?.message || t('orderDetails.invalidDeliveryCode'));
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'default' | 'success' | 'warning' | 'error' | 'info' | 'primary' | 'secondary'; label: string }> = {
      pending: { variant: 'warning', label: t('orders.pending') },
      awaiting_payment: { variant: 'info', label: t('orders.awaitingPayment') },
      paid: { variant: 'success', label: t('orders.paid') },
      processing: { variant: 'info', label: t('orderDetails.processing') },
      out_for_delivery: { variant: 'primary', label: t('orders.outForDelivery') },
      delivered: { variant: 'default', label: t('orders.delivered') },
      cancelled: { variant: 'error', label: t('orders.cancelled') },
      rejected: { variant: 'error', label: t('orders.rejected') },
    };

    const config = statusConfig[status] || { variant: 'default' as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={storeOrder ? `${t('orderDetails.order')} #${storeOrder.order.order_no}` : t('orderDetails.details')}
      size="lg"
    >
      {loadingOrder ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0066CC] mx-auto"></div>
            <p className="mt-4 text-gray-600">{t('common.loading')}</p>
          </div>
        </div>
      ) : !storeOrder ? (
        <div className="py-12 text-center">
          <p className="text-gray-600">{t('orders.empty')}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {error && <Alert type="error" message={error} />}
          {success && <Alert type="success" message={success} />}

          <Card>
            <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  {storeOrder.order.user.name}
                </h3>
                <p className="text-sm text-gray-600">{storeOrder.order.user.email}</p>
              </div>
              {getStatusBadge(storeOrder.status)}
            </div>

            <DeliverySummary shipment={storeOrder} />
            {/* Order Items */}
            <div className="mb-6">
              <h4 className="text-base font-semibold text-gray-900 mb-4">{t('orderDetails.items')}</h4>
              <div className="space-y-3">
                {storeOrder.items.map((item: OrderItem) => (
                  <div
                    key={item.id}
                    className="py-3 border-b border-gray-100 last:border-0"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900">{item.product_name}</p>
                        <p className="text-sm text-gray-600">{t('form.sku')}: {item.product_sku}</p>
                        <p className="text-sm text-gray-600">{t('orderDetails.quantity')}: {item.quantity}</p>
                        <OrderLineSelections line={item} className="mt-2" />
                      </div>
                      <p className="text-base font-bold text-[#0066CC] sm:shrink-0">
                        €{Number(item.line_total || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Totals */}
            <div className="rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 p-3.5 sm:p-5">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t('orderDetails.subtotal')}:</span>
                  <span className="font-semibold text-gray-900">
                    €{Number(storeOrder.subtotal || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t('orderDetails.shipping')}:</span>
                  <span className="font-semibold text-gray-900">
                    €{Number(storeOrder.delivery_fee || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-gray-300 pt-3">
                  <span className="text-lg font-bold text-gray-900">{t('orderDetails.total')}:</span>
                  <span className="text-xl font-bold text-[#0066CC]">
                    €{Number(storeOrder.total || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Actions based on status */}
          {storeOrder.financial_version === 1 && storeOrder.status === 'pending' && (
            <div className="space-y-4">
              {!showAcceptForm && !showRejectForm && (
                <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
                  <Button
                    onClick={() => {
                      setShowAcceptForm(true);
                      setShowRejectForm(false);
                    }}
                    className="flex-1"
                  >
                    {t('orderDetails.accept')}
                  </Button>
                  <Button
                    onClick={() => {
                      setShowRejectForm(true);
                      setShowAcceptForm(false);
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    {t('orderDetails.reject')}
                  </Button>
                </div>
              )}

              {showAcceptForm && (
                <Card className="bg-blue-50/50 border-blue-200">
                  <h4 className="text-lg font-semibold mb-4 text-gray-900">{t('orderDetails.accept')}</h4>
                  <form onSubmit={handleAccept} className="space-y-4">
                    <Input
                      label={t('orderDetails.shipping')} aria-label={t('orderDetails.shipping')}
                      type="number"
                      step="0.01"
                      value={deliveryFee}
                      onChange={(e) => setDeliveryFee(e.target.value)}
                      required
                    />
                    <Input
                      label={t('orderDetails.estimatedDate')} aria-label={t('orderDetails.estimatedDate')}
                      required
                      type="date"
                      value={estimatedDeliveryDate}
                      onChange={(e) => setEstimatedDeliveryDate(e.target.value)}
                    />
                    <Input
                      label={t('orderDetails.deliveryMethod')} aria-label={t('orderDetails.deliveryMethod')}
                      required
                      type="text"
                      value={deliveryMethod}
                      onChange={(e) => setDeliveryMethod(e.target.value)}
                      placeholder={t('orderDetails.deliveryMethodPlaceholder')}
                    />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('orderDetails.deliveryNotes')}
                      </label>
                      <textarea
                        aria-label={t('orderDetails.deliveryNotes')}
                        value={deliveryNotes}
                        onChange={(e) => setDeliveryNotes(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066CC] focus:border-[#0066CC] transition-all"
                        rows={3}
                      />
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
                      <Button type="submit" className="flex-1">
                        {t('orderDetails.confirm')}
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
                        {t('common.cancel')}
                      </Button>
                    </div>
                  </form>
                </Card>
              )}

              {showRejectForm && (
                <Card className="bg-red-50/50 border-red-200">
                  <h4 className="text-lg font-semibold mb-4 text-gray-900">{t('orderDetails.reject')}</h4>
                  <form onSubmit={handleReject} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('orderDetails.reason')}
                      </label>
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066CC] focus:border-[#0066CC] transition-all"
                        rows={3}
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
                      <Button type="submit" variant="danger" className="flex-1">
                        {t('orderDetails.reject')}
                      </Button>
                      <Button
                        type="button"
                        onClick={() => {
                          setShowRejectForm(false);
                          setRejectionReason('');
                        }}
                        className="flex-1"
                      >
                        {t('common.cancel')}
                      </Button>
                    </div>
                  </form>
                </Card>
              )}
            </div>
          )}

          {['paid', 'processing'].includes(storeOrder.status) && (
            <Button onClick={handleOutForDelivery} className="w-full">
              {t('orderDetails.ship')}
            </Button>
          )}

          {storeOrder.status === 'out_for_delivery' && (
            <div>
              {!showDeliveredForm ? (
                <Button
                  onClick={() => void handleDeliveryRequest()}
                  className="w-full"
                >
                  {t('orderDetails.deliver')}
                </Button>
              ) : (
                <Card className="bg-green-50/50 border-green-200">
                  <h4 className="text-lg font-semibold mb-4 text-gray-900">{t('orderDetails.deliver')}</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    {t('orderDetails.deliveryInstructions')}
                  </p>
                  <form onSubmit={handleDelivered} className="space-y-4">
                    <Input
                      label={`${t('orderDetails.deliveryCode')} (OTP)`} aria-label={`${t('orderDetails.deliveryCode')} (OTP)`}
                      type="text"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder={t('orderDetails.enterCode')}
                      maxLength={6}
                      required
                    />
                    <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
                      <Button type="submit" className="flex-1">
                        {t('orderDetails.confirmDelivery')}
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
                        {t('common.cancel')}
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


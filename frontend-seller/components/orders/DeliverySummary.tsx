'use client';

import { useLanguage } from '@/contexts/LanguageContext';

type Shipment = {
  status: string; financial_version?: number; payment_status?: string; delivery_fee: number | string; discount_total?: number | string;
  delivery_address_snapshot?: Record<string, unknown> | null; delivery_method?: string;
  estimated_delivery_date?: string; delivery_notes?: string; delivery_verified_at?: string;
  escrow?: { status: string } | null;
};
export default function DeliverySummary({ shipment }: { shipment: Shipment }) {
  const { t } = useLanguage();
  const a = shipment.delivery_address_snapshot;
  const paymentStatus = shipment.payment_status?.replaceAll('_', ' ');
  const translatedPaymentStatus = paymentStatus
    ? ({
        pending: t('orderDetails.paymentPending'),
        awaiting_payment: t('orders.awaitingPayment'),
        paid: t('orders.paid'),
        completed: t('orderDetails.paymentCompleted'),
        failed: t('orderDetails.paymentFailed'),
        refunded: t('orderDetails.paymentRefunded'),
      } as Record<string, string>)[shipment.payment_status || ''] || paymentStatus
    : t('orders.pending');
  const escrowStatus = shipment.escrow?.status;
  const translatedEscrowStatus = escrowStatus
    ? ({
        pending: t('orderDetails.escrowPending'),
        funded: t('orderDetails.escrowFunded'),
        released: t('orderDetails.escrowReleased'),
        refunded: t('orderDetails.escrowRefunded'),
      } as Record<string, string>)[escrowStatus] || escrowStatus.replaceAll('_', ' ')
    : t('orderDetails.notFunded');
  return <section className="my-4 rounded-xl border border-blue-100 bg-blue-50/50 p-4 text-sm space-y-2">
    <h3 className="font-semibold text-gray-900">{t('orderDetails.deliveryAddress')}</h3>
    {shipment.financial_version === 0 && <p className="font-semibold text-amber-800">{t('orderDetails.legacyOrder')}</p>}
    {a ? <address className="not-italic text-gray-700">
      <p>{String(a.full_name || '')}</p><p>{String(a.phone || '')}</p>
      <p>{String(a.address_line_1 || '')}</p><p>{String(a.address_line_2 || '')}</p>
      <p>{[a.postal_code, a.city, a.state, a.country].filter(Boolean).map(String).join(', ')}</p>
    </address> : <p>{t('orderDetails.addressUnavailable')}</p>}
    <p>{t('orderDetails.payment')}: <strong>{translatedPaymentStatus}</strong> · {t('orderDetails.escrow')}: <strong>{translatedEscrowStatus}</strong></p>
    {shipment.status === 'pending' ? <p className="text-amber-800">{t('orderDetails.pendingReview')}</p> : <>
      <p>{t('orderDetails.sellerDeliveryFee')}: <strong>€{Number(shipment.delivery_fee).toFixed(2)}</strong></p>
      <p>{shipment.delivery_method} {shipment.estimated_delivery_date && ` · ${t('orderDetails.estimated')} ${new Date(shipment.estimated_delivery_date).toLocaleDateString()}`}</p>
      {shipment.delivery_notes && <p>{shipment.delivery_notes}</p>}
    </>}
    {Number(shipment.discount_total || 0) > 0 && <p>{t('orderDetails.allocatedDiscount')}: −€{Number(shipment.discount_total).toFixed(2)}</p>}
    <p>{t('orderDetails.deliveryVerification')}: {shipment.delivery_verified_at ? `${t('orderDetails.confirmed')} ${new Date(shipment.delivery_verified_at).toLocaleString()}` : t('orderDetails.notConfirmed')}</p>
    {shipment.status === 'awaiting_payment' && <p className="font-semibold text-blue-800">{t('orderDetails.feeAddedHint')}</p>}
  </section>;
}

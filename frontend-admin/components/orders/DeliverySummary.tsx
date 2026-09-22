'use client';

import { statusKey, useLanguage } from '@/contexts/LanguageContext';

type Shipment = { status: string; financial_version?: number; payment_status?: string; delivery_fee: number | string; discount_total?: number | string; delivery_address_snapshot?: Record<string, unknown> | null; delivery_method?: string; estimated_delivery_date?: string; delivery_notes?: string; delivery_verified_at?: string; escrow?: { status: string } | null };

export default function DeliverySummary({ shipment }: { shipment: Shipment }) {
  const { t } = useLanguage();
  const address = shipment.delivery_address_snapshot;
  return <section className="my-4 rounded-xl border border-blue-100 bg-blue-50/50 p-4 text-sm space-y-2">
    <h3 className="font-semibold text-gray-900">{t('deliveryAddress')}</h3>
    {shipment.financial_version === 0 && <p className="font-semibold text-amber-800">{t('legacyOrderWarning')}</p>}
    {address ? <address className="not-italic text-gray-700"><p>{String(address.full_name || '')}</p><p>{String(address.phone || '')}</p><p>{String(address.address_line_1 || '')}</p><p>{String(address.address_line_2 || '')}</p><p>{[address.postal_code, address.city, address.state, address.country].filter(Boolean).map(String).join(', ')}</p></address> : <p>{t('addressUnavailable')}</p>}
    <p>{t('payment')}: <strong>{shipment.payment_status ? t(statusKey(shipment.payment_status)) : t('pending')}</strong> · {t('escrow')}: <strong>{shipment.escrow?.status ? t(statusKey(shipment.escrow.status)) : t('notFunded')}</strong></p>
    {shipment.status === 'pending' ? <p className="text-amber-800">{t('pendingSellerReview')}</p> : <>
      <p>{t('sellerDeliveryFee')}: <strong>€{Number(shipment.delivery_fee).toFixed(2)}</strong></p>
      <p>{shipment.delivery_method ? t(`deliveryMethod_${shipment.delivery_method}`) : ''}{shipment.estimated_delivery_date && ` · ${t('estimated')} ${new Date(shipment.estimated_delivery_date).toLocaleDateString()}`}</p>
      {shipment.delivery_notes && <p>{shipment.delivery_notes}</p>}
    </>}
    {Number(shipment.discount_total || 0) > 0 && <p>{t('allocatedDiscount')}: −€{Number(shipment.discount_total).toFixed(2)}</p>}
    <p>{t('deliveryVerification')}: {shipment.delivery_verified_at ? `${t('confirmed')} ${new Date(shipment.delivery_verified_at).toLocaleString()}` : t('notConfirmed')}</p>
    {shipment.status === 'awaiting_payment' && <p className="font-semibold text-blue-800">{t('deliveryFeeAdded')}</p>}
  </section>;
}

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import AdminLayout from '@/components/layout/AdminLayout';
import DeliverySummary from '@/components/orders/DeliverySummary';
import { orderService } from '@/services/order-service';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { statusKey, useLanguage } from '@/contexts/LanguageContext';

type Shipment = { id: number; status: string; payment_status: string; subtotal: number; delivery_fee: number; discount_total: number; total: number; store: { name: string }; delivery_address_snapshot: Record<string, unknown>; delivery_method?: string; delivery_notes?: string; estimated_delivery_date?: string; delivery_verified_at?: string; escrow?: { status: string; amount: string }; payment?: { id: number; amount: string; method: string; status: string; transaction?: { id: number; amount: string }; refund_transaction?: { id: number; amount: string }; refund_reason?: string }; items: { id: number; product_name: string; quantity: number; line_total: number; product_variant?: unknown; lens_configuration?: unknown; prescription_data?: unknown }[] };
type Detail = { id: number; order_no: string; payment_status: string; items_total: number; shipping_total: number; discount_total: number; grand_total: number; user: { id: number; name: string; email: string }; store_orders: Shipment[] };
const euro = (value: unknown) => `€${Number(value || 0).toFixed(2)}`;

export default function OrderDetailsPage() {
  const { id } = useParams();
  const { t } = useLanguage();
  const [order, setOrder] = useState<Detail | null>(null);
  const [error, setError] = useState('');
  const load = async () => { try { setOrder(await orderService.getOne(Number(id))); setError(''); } catch { setError(t('unableRefreshOrder')); } };
  useEffect(() => { void load(); }, [id]);
  useLiveRefresh(load, Boolean(id));

  return <AdminLayout><div className="space-y-6">
    <Link href="/orders" className="text-blue-700">← {t('orders')}</Link>
    <h1 className="text-3xl font-bold">{t('orderDetails', { number: order?.order_no || '' })}</h1>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {!order ? <p>{t('loadingOrder')}</p> : <>
      <section className="rounded-xl border bg-white p-5 space-y-3">
        <h2 className="font-semibold text-xl">{t('payment')}: {t(statusKey(order.payment_status))}</h2>
        <p>{order.user.name} · {order.user.email}</p>
        <div className="grid sm:grid-cols-4 gap-4">{[[t('items'), order.items_total], [t('sellerDeliveryFees'), order.shipping_total], [t('discounts'), order.discount_total], [t('total'), order.grand_total]].map(([name, value]) => <div key={String(name)}><p className="text-sm text-gray-500">{name}</p><p className="text-xl font-bold">{euro(value)}</p></div>)}</div>
        <p className="text-sm text-gray-600">{t('paymentExplanation')} {t('orderFinancialHistory')}</p>
        <Link className="text-blue-700" href={`/finance?user_id=${order.user.id}`}>{t('viewBuyerWallet')} →</Link>
      </section>
      {order.store_orders.map(shipment => <section key={shipment.id} className="rounded-xl border bg-white p-5 space-y-4">
        <h2 className="font-semibold text-xl">{shipment.store.name} · {t('shipment')} #{shipment.id} · {t(statusKey(shipment.status))}</h2>
        <DeliverySummary shipment={shipment} />
        <div className="space-y-3">{shipment.items.map(item => <div key={item.id} className="border-b pb-3"><p>{item.product_name} × {item.quantity} <strong className="float-right">{euro(item.line_total)}</strong></p>
          {!!(item.product_variant || item.lens_configuration || item.prescription_data) && <details className="text-sm mt-2"><summary>{t('productSelections')}</summary><pre className="whitespace-pre-wrap">{JSON.stringify({ selections: item.product_variant, lenses: item.lens_configuration, prescription: item.prescription_data }, null, 2)}</pre></details>}
        </div>)}</div>
        <p>{t('items')} {euro(shipment.subtotal)} + {t('shipping').toLowerCase()} {euro(shipment.delivery_fee)} − {t('discount').toLowerCase()} {euro(shipment.discount_total)} = <strong>{euro(shipment.total)}</strong></p>
        <p>{t('escrowAmount')}: {euro(shipment.escrow?.amount)}</p>
        {shipment.payment && <div className="text-sm space-y-1"><p>{t('payment')} #{shipment.payment.id}: {euro(shipment.payment.amount)} · {shipment.payment.method} · {t(statusKey(shipment.payment.status))}</p><p>{t('buyerDebit')} #{shipment.payment.transaction?.id}: {euro(shipment.payment.transaction?.amount)}</p>{shipment.payment.refund_transaction && <p>{t('refund')} #{shipment.payment.refund_transaction.id}: {euro(shipment.payment.refund_transaction.amount)} · {shipment.payment.refund_reason}</p>}</div>}
        <ShipmentAction shipment={shipment} reload={load} />
      </section>)}
    </>}
  </div></AdminLayout>;
}

function ShipmentAction({ shipment, reload }: { shipment: Shipment; reload: () => Promise<void> }) {
  const { t } = useLanguage();
  const [action, setAction] = useState(''); const [reason, setReason] = useState(''); const [code, setCode] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const choices = shipment.status === 'disputed' ? ['refunded', 'resolve_dispute'] : ['cancelled', 'refunded'].includes(shipment.status) ? [] : shipment.payment_status === 'paid' ? [...(['paid', 'processing'].includes(shipment.status) ? ['processing', 'out_for_delivery'] : []), ...(shipment.status === 'out_for_delivery' ? ['delivered'] : []), 'refunded', 'disputed'] : shipment.payment_status === 'pending' ? ['cancelled'] : [];
  const submit = async (event: React.FormEvent) => { event.preventDefault(); if (busy) return; setBusy(true); setError(''); try { await orderService.updateStoreOrderStatus(shipment.id, action, reason, code || undefined); setAction(''); setReason(''); setCode(''); await reload(); } catch { setError(t('actionFailed')); } finally { setBusy(false); } };
  return choices.length ? <form onSubmit={submit} className="border-t pt-4 space-y-3">
    <h3 className="font-semibold">{t('adminAction')}</h3><p className="text-sm text-gray-600">{t('refundExplanation')} {t('deliveryCodeExplanation')}</p>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    <select aria-label={t('adminAction')} className="border rounded p-2" value={action} onChange={event => setAction(event.target.value)} required><option value="">{t('selectAction')}</option>{choices.map(value => <option key={value} value={value}>{t(statusKey(value))}</option>)}</select>
    <input aria-label={t('actionReason')} className="border rounded p-2 w-full" placeholder={t('reasonForAction')} minLength={5} maxLength={2000} required value={reason} onChange={event => setReason(event.target.value)} />
    {action === 'delivered' && <input aria-label={t('buyerDeliveryCode')} className="border rounded p-2" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={event => setCode(event.target.value)} placeholder={t('buyerDeliveryCode')} />}
    <button disabled={busy} className="rounded bg-blue-700 text-white px-4 py-2 disabled:opacity-50">{busy ? t('applying') : t('applyAction')}</button>
  </form> : null;
}

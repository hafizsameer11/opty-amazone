'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import AdminLayout from '@/components/layout/AdminLayout';
import DeliverySummary from '@/components/orders/DeliverySummary';
import { orderService } from '@/services/order-service';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';

type Shipment = { id: number; status: string; payment_status: string; subtotal: number; delivery_fee: number; discount_total: number; total: number;
  store: { name: string }; delivery_address_snapshot: Record<string, unknown>; delivery_method?: string; delivery_notes?: string;
  estimated_delivery_date?: string; delivery_verified_at?: string; escrow?: { status: string; amount: string };
  payment?: { id: number; amount: string; method: string; status: string; transaction?: { id: number; amount: string }; refund_transaction?: { id: number; amount: string }; refund_reason?: string };
  items: { id: number; product_name: string; quantity: number; line_total: number; product_variant?: unknown; lens_configuration?: unknown; prescription_data?: unknown }[] };
type Detail = { id: number; order_no: string; payment_status: string; items_total: number; shipping_total: number; discount_total: number; grand_total: number; user: { id: number; name: string; email: string }; store_orders: Shipment[] };
const euro = (n: unknown) => '€' + Number(n || 0).toFixed(2);

export default function OrderDetailsPage() {
  const { id } = useParams();
  const [order, setOrder] = useState<Detail | null>(null);
  const [error, setError] = useState('');
  const load = async () => { try { setOrder(await orderService.getOne(Number(id))); setError(''); } catch (e: any) { setError(e.response?.data?.message || 'Unable to refresh order.'); } };
  useEffect(() => { void load(); }, [id]);
  useLiveRefresh(load, Boolean(id));
  return <AdminLayout><div className="space-y-6">
    <Link href="/orders" className="text-blue-700">← Orders</Link><h1 className="text-3xl font-bold">Order {order?.order_no}</h1>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {!order ? <p>Loading order…</p> : <>
      <section className="rounded-xl border bg-white p-5 space-y-3"><h2 className="font-semibold text-xl">Payment: {order.payment_status.replaceAll('_', ' ')}</h2>
        <p>{order.user.name} · {order.user.email}</p>
        <div className="grid sm:grid-cols-4 gap-4">{[['Items', order.items_total], ['Seller delivery fees', order.shipping_total], ['Discounts', order.discount_total], ['Current total', order.grand_total]].map(([name, value]) => <div key={String(name)}><p className="text-sm text-gray-500">{name}</p><p className="text-xl font-bold">{euro(value)}</p></div>)}</div>
        <p className="text-sm text-gray-600">Payment status follows verified payments and refunds. Refunded and cancelled shipments are excluded from the current total and retain their original financial records below. Updates every 5 seconds.</p>
        <Link className="text-blue-700" href={`/finance?user_id=${order.user.id}`}>View buyer wallet transactions →</Link>
      </section>
      {order.store_orders.map(so => <section key={so.id} className="rounded-xl border bg-white p-5 space-y-4">
        <h2 className="font-semibold text-xl">{so.store.name} · Shipment #{so.id} · {so.status.replaceAll('_', ' ')}</h2>
        <DeliverySummary shipment={so} />
        <div className="space-y-3">{so.items.map(item => <div key={item.id} className="border-b pb-3"><p>{item.product_name} × {item.quantity} <strong className="float-right">{euro(item.line_total)}</strong></p>
          {!!(item.product_variant || item.lens_configuration || item.prescription_data) && <details className="text-sm mt-2"><summary>Product selections and prescription</summary><pre className="whitespace-pre-wrap">{JSON.stringify({ selections: item.product_variant, lenses: item.lens_configuration, prescription: item.prescription_data }, null, 2)}</pre></details>}
        </div>)}</div>
        <p>Items {euro(so.subtotal)} + delivery {euro(so.delivery_fee)} − discounts {euro(so.discount_total)} = <strong>{euro(so.total)}</strong></p>
        <p>Escrow amount: {euro(so.escrow?.amount)}</p>
        {so.payment && <div className="text-sm space-y-1"><p>Payment #{so.payment.id}: {euro(so.payment.amount)} · {so.payment.method} · {so.payment.status}</p><p>Buyer debit #{so.payment.transaction?.id}: {euro(so.payment.transaction?.amount)}</p>
          {so.payment.refund_transaction && <p>Refund #{so.payment.refund_transaction.id}: {euro(so.payment.refund_transaction.amount)} · {so.payment.refund_reason}</p>}
        </div>}
        <ShipmentAction shipment={so} reload={load} />
      </section>)}
    </>}
  </div></AdminLayout>;
}

function ShipmentAction({ shipment, reload }: { shipment: Shipment; reload: () => Promise<void> }) {
  const [action, setAction] = useState(''); const [reason, setReason] = useState(''); const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const choices = shipment.status === 'disputed' ? ['refunded', 'resolve_dispute'] : ['cancelled', 'refunded'].includes(shipment.status) ? []
    : shipment.payment_status === 'paid' ? [...(['paid', 'processing'].includes(shipment.status) ? ['processing', 'out_for_delivery'] : []), ...(shipment.status === 'out_for_delivery' ? ['delivered'] : []), 'refunded', 'disputed'] : shipment.payment_status === 'pending' ? ['cancelled'] : [];
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); if (busy) return; setBusy(true); setError('');
    try { await orderService.updateStoreOrderStatus(shipment.id, action, reason, code || undefined); setAction(''); setReason(''); setCode(''); await reload(); }
    catch (e: any) { setError(e.response?.data?.message || 'Action failed.'); } finally { setBusy(false); }
  };
  return choices.length ? <form onSubmit={submit} className="border-t pt-4 space-y-3">
    <h3 className="font-semibold">Admin action</h3><p className="text-sm text-gray-600">Refunds reverse the payment and seller ledger. Delivery confirmation requires the buyer’s code.</p>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    <select aria-label="Admin action" className="border rounded p-2" value={action} onChange={e => setAction(e.target.value)} required><option value="">Select action</option>{choices.map(c => <option key={c} value={c}>{c.replaceAll('_', ' ')}</option>)}</select>
    <input aria-label="Action reason" className="border rounded p-2 w-full" placeholder="Reason for this action" minLength={5} maxLength={2000} required value={reason} onChange={e => setReason(e.target.value)} />
    {action === 'delivered' && <input aria-label="Buyer delivery code" className="border rounded p-2" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={e => setCode(e.target.value)} placeholder="Buyer delivery code" />}
    <button disabled={busy} className="rounded bg-blue-700 text-white px-4 py-2 disabled:opacity-50">{busy ? 'Applying…' : 'Apply action'}</button>
  </form> : null;
}

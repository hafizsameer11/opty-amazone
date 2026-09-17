'use client';
import { useState } from 'react';
import { orderService, type StoreOrder } from '@/services/order-service';

export default function OrderActions({ shipment, onUpdate }: { shipment: StoreOrder; onUpdate: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const run = async (action: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true); setError('');
    try { await action(); await onUpdate(); }
    catch (e: any) { setError(e.response?.data?.message || 'Action failed. Please try again.'); }
    finally { setBusy(false); }
  };
  const canCancel = shipment.financial_version === 1 && ['pending', 'awaiting_payment', 'paid', 'processing'].includes(shipment.status);
  const canDispute = shipment.financial_version === 1 && ['paid', 'processing', 'out_for_delivery', 'delivered'].includes(shipment.status) && !shipment.dispute_reason;
  return <div className="my-4 space-y-3 text-sm">
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {canCancel && <button disabled={busy} className="rounded-lg border px-4 py-2 disabled:opacity-50" onClick={() => run(() => orderService.cancelStoreOrder(shipment.id))}>
      {shipment.payment_status === 'paid' ? 'Cancel and refund to wallet' : 'Cancel order'}
    </button>}
    {shipment.payment_status === 'paid' && ['paid', 'processing', 'out_for_delivery'].includes(shipment.status) && <div>
      <p>Give your delivery code to the courier only after you have received the products. It confirms delivery and releases the seller’s earnings.</p>
      {shipment.delivery_code_expires_at && <p>Code expires: {new Date(shipment.delivery_code_expires_at).toLocaleString()}</p>}
      <button disabled={busy} className="text-blue-700 underline mt-2" onClick={() => run(() => orderService.reissueCode(shipment.id))}>Request a new delivery code</button>
    </div>}
    {canDispute && <details><summary className="cursor-pointer text-blue-700">Report a payment or delivery dispute</summary>
      <textarea aria-label="Dispute reason" className="w-full border rounded p-2 my-2" value={reason} onChange={e => setReason(e.target.value)} maxLength={2000} placeholder="Describe the issue" />
      <button disabled={busy || reason.trim().length < 5} className="rounded-lg border px-4 py-2 disabled:opacity-50" onClick={() => run(() => orderService.dispute(shipment.id, reason))}>Open dispute and hold funds</button>
    </details>}
    {shipment.status === 'disputed' && <p className="text-amber-800">Funds are held while an administrator reviews your dispute.</p>}
  </div>;
}

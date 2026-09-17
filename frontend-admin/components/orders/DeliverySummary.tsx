type Shipment = {
  status: string; financial_version?: number; payment_status?: string; delivery_fee: number | string; discount_total?: number | string;
  delivery_address_snapshot?: Record<string, unknown> | null; delivery_method?: string;
  estimated_delivery_date?: string; delivery_notes?: string; delivery_verified_at?: string;
  escrow?: { status: string } | null;
};
export default function DeliverySummary({ shipment }: { shipment: Shipment }) {
  const a = shipment.delivery_address_snapshot;
  return <section className="my-4 rounded-xl border border-blue-100 bg-blue-50/50 p-4 text-sm space-y-2">
    <h3 className="font-semibold text-gray-900">Delivery address</h3>
    {shipment.financial_version === 0 && <p className="font-semibold text-amber-800">Legacy order: financial reconciliation is required before payment or fulfillment.</p>}
    {a ? <address className="not-italic text-gray-700">
      <p>{String(a.full_name || '')}</p><p>{String(a.phone || '')}</p>
      <p>{String(a.address_line_1 || '')}</p><p>{String(a.address_line_2 || '')}</p>
      <p>{[a.postal_code, a.city, a.state, a.country].filter(Boolean).map(String).join(', ')}</p>
    </address> : <p>Address snapshot unavailable for this legacy order.</p>}
    <p>Payment: <strong>{shipment.payment_status?.replaceAll('_', ' ') || 'pending'}</strong> · Escrow: <strong>{shipment.escrow?.status || 'not funded'}</strong></p>
    {shipment.status === 'pending' ? <p className="text-amber-800">Pending seller review. Delivery has not been quoted yet.</p> : <>
      <p>Seller delivery fee: <strong>€{Number(shipment.delivery_fee).toFixed(2)}</strong></p>
      <p>{shipment.delivery_method} {shipment.estimated_delivery_date && ' · Estimated ' + new Date(shipment.estimated_delivery_date).toLocaleDateString()}</p>
      {shipment.delivery_notes && <p>{shipment.delivery_notes}</p>}
    </>}
    {Number(shipment.discount_total || 0) > 0 && <p>Allocated discount: −€{Number(shipment.discount_total).toFixed(2)}</p>}
    <p>Delivery verification: {shipment.delivery_verified_at ? 'Confirmed ' + new Date(shipment.delivery_verified_at).toLocaleString() : 'Not confirmed'}</p>
    {shipment.status === 'awaiting_payment' && <p className="font-semibold text-blue-800">The seller has added the delivery fee. Review the final total before paying.</p>}
  </section>;
}

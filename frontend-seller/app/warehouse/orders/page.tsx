'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { getAxiosErrorMessage } from '@/lib/api-client';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { warehouseService, type WarehouseOrder, type WarehouseStatus } from '@/services/warehouse-service';
import { SellerShell } from '../page';

const money = (value: string | number) => `€${Number(value || 0).toFixed(2)}`;
const statuses: WarehouseStatus[] = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

export default function WarehouseOrdersPage() {
  const { showToast } = useToast();
  const [orders, setOrders] = useState<WarehouseOrder[]>([]);
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<WarehouseOrder | null>(null);
  const load = useCallback(async (silent = false) => {
    try { setOrders((await warehouseService.orders({ status, per_page: 100 })).data); }
    catch (error) { if (!silent) showToast('error', getAxiosErrorMessage(error)); }
  }, [showToast, status]);
  useLiveRefresh(load, true, 10000, true);

  return <SellerShell><main className="w-full max-w-none px-4 py-5 sm:px-5 lg:px-6 2xl:px-8"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold text-[#0066CC]">Warehouse</p><h1 className="text-3xl font-bold text-slate-950">Warehouse Orders</h1><p className="mt-1 text-sm text-slate-500">Your separate wholesale purchases. These are not customer orders.</p></div><Link href="/warehouse"><Button>Browse Warehouse</Button></Link></div><div className="mt-5 flex gap-2 overflow-x-auto pb-1">{['', ...statuses].map((value) => <button key={value || 'all'} onClick={() => setStatus(value)} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold capitalize ${status === value ? 'bg-[#0066CC] text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}>{value || 'All orders'}</button>)}</div><section className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"><div className="divide-y divide-slate-100">{orders.length ? orders.map((order) => <button type="button" key={order.id} onClick={async () => setSelected(await warehouseService.order(order.id))} className="flex w-full flex-col gap-3 p-4 text-left hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold text-slate-950">{order.order_number}</p><p className="mt-1 text-xs text-slate-500">{new Date(order.created_at).toLocaleString()} · {order.items.reduce((total, item) => total + item.quantity, 0)} units</p></div><div className="flex items-center gap-4"><strong>{money(order.total)}</strong><Status status={order.status} /></div></button>) : <div className="p-12 text-center text-slate-500">No warehouse orders found.</div>}</div></section>{selected && <OrderDetails order={selected} onClose={() => setSelected(null)} />}</main></SellerShell>;
}

function Status({ status }: { status: WarehouseStatus }) { const tone = status === 'delivered' ? 'bg-emerald-50 text-emerald-700' : status === 'cancelled' ? 'bg-rose-50 text-rose-700' : status === 'shipped' ? 'bg-violet-50 text-violet-700' : 'bg-blue-50 text-blue-700'; return <span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${tone}`}>{status}</span>; }
function OrderDetails({ order, onClose }: { order: WarehouseOrder; onClose: () => void }) { return <div className="fixed inset-0 z-[100] flex items-end bg-slate-950/45 sm:items-center sm:justify-center sm:p-5"><section className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-xl sm:rounded-3xl"><div className="flex justify-between gap-3"><div><p className="text-sm font-bold text-[#0066CC]">{order.order_number}</p><h2 className="text-xl font-bold">Warehouse Order Details</h2></div><button onClick={onClose} className="text-2xl text-slate-500">×</button></div><div className="mt-5 space-y-3">{order.items.map((item) => <div key={item.id} className="flex justify-between border-b border-slate-100 pb-3"><div><p className="font-semibold">{item.product_name}</p><p className="text-xs text-slate-500">{item.sku} · {item.quantity} units × {money(item.unit_price)}</p></div><strong>{money(item.line_total)}</strong></div>)}</div><div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm"><div className="flex justify-between"><span>Subtotal</span><strong>{money(order.subtotal)}</strong></div><div className="mt-2 flex justify-between"><span>Shipping fee</span><strong>{money(order.shipping_fee)}</strong></div><div className="mt-3 flex justify-between border-t border-slate-200 pt-3 text-base"><strong>Paid from Seller Wallet</strong><strong>{money(order.total)}</strong></div></div><div className="mt-5 grid grid-cols-2 gap-3"><div><p className="text-xs uppercase text-slate-400">Order status</p><div className="mt-1"><Status status={order.status} /></div></div><div><p className="text-xs uppercase text-slate-400">Payment</p><p className="mt-1 font-semibold capitalize text-emerald-700">{order.payment_status}</p></div>{order.shipping_carrier && <div><p className="text-xs uppercase text-slate-400">Carrier</p><p className="mt-1 font-semibold">{order.shipping_carrier}</p></div>}{order.tracking_number && <div><p className="text-xs uppercase text-slate-400">Tracking</p><p className="mt-1 font-mono text-sm">{order.tracking_number}</p></div>}</div>{order.shipping_notes && <p className="mt-4 rounded-xl bg-blue-50 p-3 text-sm text-blue-900">{order.shipping_notes}</p>}</section></div>; }

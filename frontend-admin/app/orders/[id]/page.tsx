'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AdminLayout from '@/components/layout/AdminLayout';
import GlassCard from '@/components/ui/GlassCard';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { orderService } from '@/services/order-service';
import { useToast } from '@/components/ui/Toast';

const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded', 'cancelled'] as const;
const STORE_ORDER_STATUSES = [
  'pending',
  'accepted',
  'rejected',
  'paid',
  'processing',
  'out_for_delivery',
  'delivered',
  'cancelled',
] as const;

export default function OrderDetailsPage() {
  const params = useParams();
  const { showToast } = useToast();
  const [order, setOrder] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState('');
  const [savingPayment, setSavingPayment] = useState(false);
  const [storeStatusEdits, setStoreStatusEdits] = useState<Record<number, string>>({});
  const [savingStoreId, setSavingStoreId] = useState<number | null>(null);

  useEffect(() => {
    if (params.id) {
      loadOrder();
    }
  }, [params.id]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      const data = await orderService.getOne(Number(params.id));
      setOrder(data as Record<string, unknown>);
      setPaymentStatus(String(data.payment_status || ''));
    } catch (error) {
      console.error('Failed to load order:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePayment = async () => {
    if (!order) return;
    try {
      setSavingPayment(true);
      await orderService.updatePaymentStatus(Number(order.id), paymentStatus);
      showToast('success', 'Payment status updated');
      loadOrder();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      showToast('error', err.response?.data?.message || 'Update failed');
    } finally {
      setSavingPayment(false);
    }
  };

  const saveStoreOrder = async (storeOrderId: number) => {
    const status = storeStatusEdits[storeOrderId];
    if (!status) {
      showToast('error', 'Pick a status first');
      return;
    }
    try {
      setSavingStoreId(storeOrderId);
      await orderService.updateStoreOrderStatus(storeOrderId, status);
      showToast('success', 'Store order updated');
      loadOrder();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      showToast('error', err.response?.data?.message || 'Update failed');
    } finally {
      setSavingStoreId(null);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner size="lg" />
        </div>
      </AdminLayout>
    );
  }

  if (!order) {
    return (
      <AdminLayout>
        <div className="text-center text-slate-500 py-12">Order not found</div>
      </AdminLayout>
    );
  }

  const storeOrders = (order.store_orders as Record<string, unknown>[] | undefined) || [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Order details</h1>
          <p className="text-slate-500">Order #{String(order.order_no)}</p>
        </div>

        <GlassCard>
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <h2 className="text-xl font-bold text-slate-900">Checkout / payment</h2>
              <Badge variant={order.payment_status === 'paid' ? 'success' : 'warning'}>
                {String(order.payment_status)}
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-500 mb-1">Customer</p>
                <p className="text-slate-900">{(order.user as { name?: string })?.name}</p>
                <p className="text-sm text-slate-500">{(order.user as { email?: string })?.email}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Grand total</p>
                <p className="text-slate-900 font-bold text-xl">
                  €{Number(order.grand_total || 0).toFixed(2)}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-end gap-3 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Payment status</label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                  className="px-3 py-2 rounded-lg glass border border-slate-200 text-slate-900 min-w-[180px]"
                >
                  {PAYMENT_STATUSES.map((s) => (
                    <option key={s} value={s} className="bg-gray-900">{s}</option>
                  ))}
                </select>
              </div>
              <Button onClick={savePayment} disabled={savingPayment}>
                {savingPayment ? 'Saving…' : 'Save payment status'}
              </Button>
            </div>
          </div>
        </GlassCard>

        {storeOrders.length > 0 && (
          <GlassCard>
            <h2 className="text-xl font-bold text-slate-900 mb-4">Per-store shipments</h2>
            <div className="space-y-6">
              {storeOrders.map((storeOrder: Record<string, unknown>) => {
                const id = Number(storeOrder.id);
                const current = String(storeOrder.status || '');
                const selected = storeStatusEdits[id] ?? current;
                return (
                  <div key={id} className="glass rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h3 className="font-semibold text-slate-900">
                        {(storeOrder.store as { name?: string } | undefined)?.name}
                      </h3>
                      <Badge variant={current === 'delivered' ? 'success' : 'default'}>{current}</Badge>
                    </div>
                    {Array.isArray(storeOrder.items) && storeOrder.items.length > 0 && (
                      <div className="space-y-2">
                        {(storeOrder.items as Record<string, unknown>[]).map((item) => (
                          <div key={String(item.id)} className="flex items-center justify-between text-sm">
                            <span className="text-slate-900">
                              {String(item.product_name)} × {String(item.quantity)}
                            </span>
                            <span className="text-slate-900">
                              €{Number(item.line_total || 0).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-wrap items-end gap-3 pt-2 border-t border-slate-100">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Fulfillment status</label>
                        <select
                          value={selected}
                          onChange={(e) => setStoreStatusEdits((prev) => ({ ...prev, [id]: e.target.value }))}
                          className="px-3 py-2 rounded-lg glass border border-slate-200 text-slate-900 min-w-[200px]"
                        >
                          {STORE_ORDER_STATUSES.map((s) => (
                            <option key={s} value={s} className="bg-gray-900">{s}</option>
                          ))}
                        </select>
                      </div>
                      <Button
                        onClick={() => saveStoreOrder(id)}
                        disabled={savingStoreId === id || selected === current}
                      >
                        {savingStoreId === id ? 'Saving…' : 'Apply'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        )}
      </div>
    </AdminLayout>
  );
}

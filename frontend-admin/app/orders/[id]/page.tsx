'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AdminLayout from '@/components/layout/AdminLayout';
import GlassCard from '@/components/ui/GlassCard';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { orderService } from '@/services/order-service';

export default function OrderDetailsPage() {
  const params = useParams();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      loadOrder();
    }
  }, [params.id]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      const data = await orderService.getOne(Number(params.id));
      setOrder(data);
    } catch (error) {
      console.error('Failed to load order:', error);
    } finally {
      setLoading(false);
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
        <div className="text-center text-white/70 py-12">Order not found</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Order Details</h1>
          <p className="text-white/70">Order #{order.order_no}</p>
        </div>

        <GlassCard>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Order Information</h2>
              <Badge variant={order.payment_status === 'paid' ? 'success' : 'warning'}>
                {order.payment_status}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-white/70 mb-1">Customer</p>
                <p className="text-white">{order.user?.name}</p>
                <p className="text-sm text-white/70">{order.user?.email}</p>
              </div>
              <div>
                <p className="text-sm text-white/70 mb-1">Total</p>
                <p className="text-white font-bold text-xl">€{order.grand_total?.toFixed(2) || '0.00'}</p>
              </div>
            </div>
          </div>
        </GlassCard>

        {order.store_orders && order.store_orders.length > 0 && (
          <GlassCard>
            <h2 className="text-xl font-bold text-white mb-4">Store Orders</h2>
            <div className="space-y-4">
              {order.store_orders.map((storeOrder: any) => (
                <div key={storeOrder.id} className="glass rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-white">{storeOrder.store?.name}</h3>
                    <Badge variant={storeOrder.status === 'delivered' ? 'success' : 'default'}>
                      {storeOrder.status}
                    </Badge>
                  </div>
                  {storeOrder.items && storeOrder.items.length > 0 && (
                    <div className="space-y-2">
                      {storeOrder.items.map((item: any) => (
                        <div key={item.id} className="flex items-center justify-between text-sm">
                          <span className="text-white">{item.product_name} x {item.quantity}</span>
                          <span className="text-white">€{item.line_total?.toFixed(2) || '0.00'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 pt-3 border-t border-white/20 flex justify-between">
                    <span className="text-white/70">Subtotal</span>
                    <span className="text-white font-semibold">€{storeOrder.subtotal?.toFixed(2) || '0.00'}</span>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        )}
      </div>
    </AdminLayout>
  );
}

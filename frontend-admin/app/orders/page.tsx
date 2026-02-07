'use client';

import { useEffect, useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import DataTable from '@/components/ui/DataTable';
import GlassCard from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import { orderService, type Order } from '@/services/order-service';
import { useToast } from '@/components/ui/Toast';

export default function OrdersPage() {
  const { showToast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const params: any = { per_page: 50 };
      if (search) params.search = search;
      const response = await orderService.getAll(params);
      setOrders(response.data || []);
    } catch (error) {
      showToast('error', 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadOrders();
  };

  const columns = [
    { key: 'order_no', header: 'Order No', sortable: true },
    {
      key: 'user',
      header: 'Customer',
      render: (order: Order) => (
        <div>
          <p className="font-semibold text-white">{order.user?.name}</p>
          <p className="text-xs text-white/70">{order.user?.email}</p>
        </div>
      ),
    },
    {
      key: 'grand_total',
      header: 'Total',
      render: (order: Order) => <span className="text-white">€{order.grand_total?.toFixed(2) || '0.00'}</span>,
    },
    {
      key: 'payment_status',
      header: 'Status',
      render: (order: Order) => (
        <Badge variant={order.payment_status === 'paid' ? 'success' : 'warning'}>
          {order.payment_status}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      header: 'Date',
      render: (order: Order) => (
        <span className="text-white">{new Date(order.created_at).toLocaleDateString()}</span>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Orders</h1>
          <p className="text-white/70">Manage all orders</p>
        </div>

        <GlassCard>
          <form onSubmit={handleSearch} className="flex gap-4 mb-6">
            <Input
              type="text"
              placeholder="Search orders..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
            />
            <Button type="submit">Search</Button>
          </form>

          <DataTable
            data={orders}
            columns={columns}
            loading={loading}
            keyExtractor={(order) => order.id}
            onRowClick={(order) => window.location.href = `/orders/${order.id}`}
          />
        </GlassCard>
      </div>
    </AdminLayout>
  );
}

'use client';

import { useEffect, useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import DataTable from '@/components/ui/DataTable';
import GlassCard from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import { sellerService, type Seller } from '@/services/seller-service';
import { useToast } from '@/components/ui/Toast';

export default function SellersPage() {
  const { showToast } = useToast();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadSellers();
  }, []);

  const loadSellers = async () => {
    try {
      setLoading(true);
      const params: any = { per_page: 50 };
      if (search) params.search = search;
      const response = await sellerService.getAll(params);
      setSellers(response.data || []);
    } catch (error) {
      showToast('error', 'Failed to load sellers');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadSellers();
  };

  const handleApprove = async (id: number) => {
    try {
      await sellerService.approve(id);
      showToast('success', 'Store approved successfully');
      loadSellers();
    } catch (error: any) {
      showToast('error', error.response?.data?.message || 'Failed to approve store');
    }
  };

  const handleReject = async (id: number, reason: string) => {
    try {
      await sellerService.reject(id, reason);
      showToast('success', 'Store rejected successfully');
      loadSellers();
    } catch (error: any) {
      showToast('error', error.response?.data?.message || 'Failed to reject store');
    }
  };

  const columns = [
    { key: 'id', header: 'ID', sortable: true },
    {
      key: 'name',
      header: 'Store Name',
      render: (seller: Seller) => (
        <div>
          <p className="font-semibold text-white">{seller.name}</p>
          <p className="text-xs text-white/70">{seller.user?.email}</p>
        </div>
      ),
    },
    {
      key: 'products_count',
      header: 'Products',
      render: (seller: Seller) => <span className="text-white">{seller.products_count || 0}</span>,
    },
    {
      key: 'orders_count',
      header: 'Orders',
      render: (seller: Seller) => <span className="text-white">{seller.orders_count || 0}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (seller: Seller) => (
        <div className="flex gap-2">
          <Button size="sm" variant="success" onClick={() => handleApprove(seller.id)}>Approve</Button>
          <Button size="sm" variant="danger" onClick={() => {
            const reason = prompt('Rejection reason:');
            if (reason) handleReject(seller.id, reason);
          }}>Reject</Button>
        </div>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Sellers</h1>
          <p className="text-white/70">Manage sellers and stores</p>
        </div>

        <GlassCard>
          <form onSubmit={handleSearch} className="flex gap-4 mb-6">
            <Input
              type="text"
              placeholder="Search sellers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
            />
            <Button type="submit">Search</Button>
          </form>

          <DataTable
            data={sellers}
            columns={columns}
            loading={loading}
            keyExtractor={(seller) => seller.id}
            onRowClick={(seller) => window.location.href = `/sellers/${seller.id}`}
          />
        </GlassCard>
      </div>
    </AdminLayout>
  );
}

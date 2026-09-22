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
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { useLanguage } from '@/contexts/LanguageContext';

export default function SellersPage() {
  const { t } = useLanguage();
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
      showToast('error', t('failedLoadSellers'));
    } finally {
      setLoading(false);
    }
  };

  useLiveRefresh(loadSellers);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadSellers();
  };

  const handleApprove = async (id: number) => {
    try {
      await sellerService.approve(id);
      showToast('success', t('storeApproved'));
      loadSellers();
    } catch (error: any) {
      showToast('error', t('failedApproveStore'));
    }
  };

  const handleReject = async (id: number, reason: string) => {
    try {
      await sellerService.reject(id, reason);
      showToast('success', t('storeRejected'));
      loadSellers();
    } catch (error: any) {
      showToast('error', t('failedRejectStore'));
    }
  };

  const columns = [
    { key: 'id', header: 'ID', sortable: true },
    {
      key: 'name',
      header: t('storeName'),
      render: (seller: Seller) => (
        <div>
          <p className="font-semibold text-slate-900">{seller.name}</p>
          <p className="text-xs text-slate-500">{seller.user?.email}</p>
        </div>
      ),
    },
    {
      key: 'products_count',
      header: t('products'),
      render: (seller: Seller) => <span className="text-slate-900">{seller.products_count || 0}</span>,
    },
    {
      key: 'orders_count',
      header: t('orders'),
      render: (seller: Seller) => <span className="text-slate-900">{seller.orders_count || 0}</span>,
    },
    {
      key: 'actions',
      header: t('actions'),
      render: (seller: Seller) => (
        <div className="flex gap-2">
          <Button size="sm" variant="primary" onClick={() => handleApprove(seller.id)}>{t('approve')}</Button>
          <Button size="sm" variant="danger" onClick={() => {
            const reason = prompt(t('rejectionReason'));
            if (reason) handleReject(seller.id, reason);
          }}>{t('reject')}</Button>
        </div>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">{t('sellers')}</h1>
          <p className="text-slate-500">{t('manageSellers')}</p>
        </div>

        <GlassCard>
          <form onSubmit={handleSearch} className="flex gap-4 mb-6">
            <Input
              type="text"
              placeholder={t('searchSellers')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
            />
            <Button type="submit">{t('search')}</Button>
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

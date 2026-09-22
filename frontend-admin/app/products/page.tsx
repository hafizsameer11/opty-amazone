'use client';

import { useEffect, useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import DataTable from '@/components/ui/DataTable';
import GlassCard from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import { productService, type Product } from '@/services/product-service';
import { useToast } from '@/components/ui/Toast';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ProductsPage() {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const params: any = { per_page: 50 };
      if (search) params.search = search;
      const response = await productService.getAll(params);
      setProducts(response.data || []);
    } catch (error) {
      showToast('error', t('failedLoadProducts'));
    } finally {
      setLoading(false);
    }
  };

  useLiveRefresh(loadProducts);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadProducts();
  };

  const handleApprove = async (id: number) => {
    try {
      await productService.approve(id);
      showToast('success', t('productApproved'));
      loadProducts();
    } catch (error: any) {
      showToast('error', t('failedApproveProduct'));
    }
  };

  const handleReject = async (id: number) => {
    const reason = prompt(t('rejectionReason'));
    if (!reason) return;
    try {
      await productService.reject(id, reason);
      showToast('success', t('productRejected'));
      loadProducts();
    } catch (error: any) {
      showToast('error', t('failedRejectProduct'));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('confirmDeleteProduct'))) return;
    try {
      await productService.delete(id);
      showToast('success', t('productDeleted'));
      loadProducts();
    } catch (error: any) {
      showToast('error', t('failedDeleteProduct'));
    }
  };

  const columns = [
    { key: 'name', header: t('product'), sortable: true, className: 'w-[30%]', render: (product: Product) => <div className="min-w-0"><p className="truncate font-semibold text-slate-900">{product.name}</p><p className="truncate text-xs text-slate-500">{product.sku}</p></div> },
    {
      key: 'store',
      header: t('store'),
      render: (product: Product) => <span className="block max-w-[9rem] truncate text-slate-900">{product.store?.name || t('notAvailable')}</span>,
    },
    {
      key: 'category',
      header: t('category'),
      render: (product: Product) => <span className="block max-w-[8rem] truncate text-slate-900">{product.category?.name || t('notAvailable')}</span>,
    },
    {
      key: 'price',
      header: t('price'),
      render: (product: Product) => <span className="text-slate-900">€{Number(product.price ?? 0).toFixed(2)}</span>,
    },
    {
      key: 'is_active',
      header: t('status'),
      render: (product: Product) => (
        <Badge variant={product.is_active ? 'success' : 'default'}>
          {product.is_active ? t('active') : t('inactive')}
        </Badge>
      ),
    },
    {
      key: 'is_approved',
      header: t('approved'),
      render: (product: Product) => (
        <Badge variant={product.is_approved ? 'success' : 'warning'}>
          {product.is_approved ? t('approved') : t('pending')}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: t('actions'),
      render: (product: Product) => (
        <div className="flex flex-wrap gap-1.5" onClick={(event) => event.stopPropagation()}>
          <Button size="sm" variant="ghost" onClick={() => { window.location.href = `/products/${product.id}`; }}>{t('view')}</Button>
          {!product.is_approved && <Button size="sm" variant="primary" onClick={() => handleApprove(product.id)}>{t('approve')}</Button>}
          <Button size="sm" variant="danger" onClick={() => handleReject(product.id)}>{t('reject')}</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(product.id)}>{t('delete')}</Button>
        </div>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">{t('products')}</h1>
          <p className="text-slate-500">{t('manageProducts')}</p>
        </div>

        <GlassCard>
          <form onSubmit={handleSearch} className="flex gap-4 mb-6">
            <Input
              type="text"
              placeholder={t('searchProducts')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
            />
            <Button type="submit">{t('search')}</Button>
          </form>

          <DataTable
            data={products}
            columns={columns}
            loading={loading}
            keyExtractor={(product) => product.id}
            disableHorizontalScroll
            onRowClick={(product) => window.location.href = `/products/${product.id}`}
          />
        </GlassCard>
      </div>
    </AdminLayout>
  );
}

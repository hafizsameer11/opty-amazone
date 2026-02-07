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

export default function ProductsPage() {
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
      showToast('error', 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadProducts();
  };

  const handleApprove = async (id: number) => {
    try {
      await productService.approve(id);
      showToast('success', 'Product approved successfully');
      loadProducts();
    } catch (error: any) {
      showToast('error', error.response?.data?.message || 'Failed to approve product');
    }
  };

  const handleReject = async (id: number) => {
    const reason = prompt('Rejection reason:');
    if (!reason) return;
    try {
      await productService.reject(id, reason);
      showToast('success', 'Product rejected successfully');
      loadProducts();
    } catch (error: any) {
      showToast('error', error.response?.data?.message || 'Failed to reject product');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await productService.delete(id);
      showToast('success', 'Product deleted successfully');
      loadProducts();
    } catch (error: any) {
      showToast('error', error.response?.data?.message || 'Failed to delete product');
    }
  };

  const columns = [
    { key: 'id', header: 'ID', sortable: true },
    { key: 'name', header: 'Name', sortable: true },
    { key: 'sku', header: 'SKU', sortable: true },
    {
      key: 'store',
      header: 'Store',
      render: (product: Product) => <span className="text-white">{product.store?.name || 'N/A'}</span>,
    },
    {
      key: 'category',
      header: 'Category',
      render: (product: Product) => <span className="text-white">{product.category?.name || 'N/A'}</span>,
    },
    {
      key: 'price',
      header: 'Price',
      render: (product: Product) => <span className="text-white">€{product.price?.toFixed(2) || '0.00'}</span>,
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (product: Product) => (
        <Badge variant={product.is_active ? 'success' : 'default'}>
          {product.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'is_approved',
      header: 'Approved',
      render: (product: Product) => (
        <Badge variant={product.is_approved ? 'success' : 'warning'}>
          {product.is_approved ? 'Approved' : 'Pending'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (product: Product) => (
        <div className="flex gap-2">
          <Button size="sm" variant="success" onClick={() => handleApprove(product.id)}>Approve</Button>
          <Button size="sm" variant="danger" onClick={() => handleReject(product.id)}>Reject</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(product.id)}>Delete</Button>
        </div>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Products</h1>
          <p className="text-white/70">Manage all products</p>
        </div>

        <GlassCard>
          <form onSubmit={handleSearch} className="flex gap-4 mb-6">
            <Input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
            />
            <Button type="submit">Search</Button>
          </form>

          <DataTable
            data={products}
            columns={columns}
            loading={loading}
            keyExtractor={(product) => product.id}
            onRowClick={(product) => window.location.href = `/products/${product.id}`}
          />
        </GlassCard>
      </div>
    </AdminLayout>
  );
}

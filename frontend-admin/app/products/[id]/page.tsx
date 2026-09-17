'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AdminLayout from '@/components/layout/AdminLayout';
import GlassCard from '@/components/ui/GlassCard';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Button from '@/components/ui/Button';
import RejectReasonModal from '@/components/admin/RejectReasonModal';
import { productService } from '@/services/product-service';
import { useToast } from '@/components/ui/Toast';

export default function ProductDetailsPage() {
  const params = useParams();
  const { showToast } = useToast();
  const [product, setProduct] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);

  useEffect(() => {
    if (params.id) {
      loadProduct();
    }
  }, [params.id]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      setProduct(null);
      const data = await productService.getOne(Number(params.id));
      setProduct(data as Record<string, unknown>);
    } catch {
      setLoadError('Could not load this product.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      await productService.approve(Number(params.id));
      showToast('success', 'Product approved successfully');
      loadProduct();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      showToast('error', err.response?.data?.message || 'Failed to approve product');
    }
  };

  const handleRejectConfirm = async (reason: string) => {
    await productService.reject(Number(params.id), reason);
    showToast('success', 'Product rejected successfully');
    loadProduct();
  };

  const handleToggleActive = async () => {
    try {
      await productService.toggleActive(Number(params.id));
      showToast('success', 'Visibility updated');
      loadProduct();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      showToast('error', err.response?.data?.message || 'Failed to toggle product');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this product permanently?')) return;
    try {
      await productService.delete(Number(params.id));
      showToast('success', 'Product deleted');
      window.location.href = '/products';
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      showToast('error', err.response?.data?.message || 'Failed to delete');
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

  if (loadError || !product) {
    return (
      <AdminLayout>
        <div className="space-y-4 max-w-lg mx-auto text-center py-12">
          <p className="text-slate-600">{loadError || 'Product not found'}</p>
          <Button variant="outline" onClick={() => loadProduct()}>Retry</Button>
        </div>
      </AdminLayout>
    );
  }

  const store = product.store as { name?: string } | undefined;
  const category = product.category as { name?: string } | undefined;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">{String(product.name)}</h1>
            <p className="text-slate-500">Product details</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="primary" onClick={handleApprove}>Approve</Button>
            <Button variant="danger" onClick={() => setRejectOpen(true)}>Reject</Button>
            <Button variant="outline" onClick={handleToggleActive}>Toggle visible</Button>
            <a className="border rounded-lg px-4 py-2 text-blue-700" href={'/ad-campaigns?product_id=' + product.id}>View ad campaigns</a>
            <Button variant="danger" onClick={handleDelete}>Delete</Button>
          </div>
        </div>

        <GlassCard>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-500 mb-1">Store</p>
                <p className="text-slate-900">{store?.name}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Category</p>
                <p className="text-slate-900">{category?.name}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Price</p>
                <p className="text-slate-900 font-bold">€{Number(product.price || 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Status</p>
                <Badge variant={product.is_active ? 'success' : 'default'}>
                  {product.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Approval</p>
                <Badge variant={product.is_approved ? 'success' : 'warning'}>
                  {product.is_approved ? 'Approved' : 'Pending'}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Product advertising</p>
                <a className="text-blue-700 underline" href={'/ad-campaigns?product_id=' + product.id}>Campaign status and payments</a>
              </div>
            </div>
          </div>
        </GlassCard>

        <RejectReasonModal
          isOpen={rejectOpen}
          title="Reject product"
          description="The product will be hidden and marked not approved. Sellers may see this reason."
          onClose={() => setRejectOpen(false)}
          onConfirm={handleRejectConfirm}
          confirmLabel="Reject product"
        />
      </div>
    </AdminLayout>
  );
}

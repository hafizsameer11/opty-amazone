'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AdminLayout from '@/components/layout/AdminLayout';
import GlassCard from '@/components/ui/GlassCard';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Button from '@/components/ui/Button';
import { productService } from '@/services/product-service';
import { useToast } from '@/components/ui/Toast';

export default function ProductDetailsPage() {
  const params = useParams();
  const { showToast } = useToast();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      loadProduct();
    }
  }, [params.id]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      const data = await productService.getOne(Number(params.id));
      setProduct(data);
    } catch (error) {
      console.error('Failed to load product:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      await productService.approve(Number(params.id));
      showToast('success', 'Product approved successfully');
      loadProduct();
    } catch (error: any) {
      showToast('error', error.response?.data?.message || 'Failed to approve product');
    }
  };

  const handleReject = async () => {
    const reason = prompt('Rejection reason:');
    if (!reason) return;
    try {
      await productService.reject(Number(params.id), reason);
      showToast('success', 'Product rejected successfully');
      loadProduct();
    } catch (error: any) {
      showToast('error', error.response?.data?.message || 'Failed to reject product');
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

  if (!product) {
    return (
      <AdminLayout>
        <div className="text-center text-white/70 py-12">Product not found</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{product.name}</h1>
            <p className="text-white/70">Product Details</p>
          </div>
          <div className="flex gap-3">
            <Button variant="success" onClick={handleApprove}>Approve</Button>
            <Button variant="danger" onClick={handleReject}>Reject</Button>
          </div>
        </div>

        <GlassCard>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-white/70 mb-1">Store</p>
                <p className="text-white">{product.store?.name}</p>
              </div>
              <div>
                <p className="text-sm text-white/70 mb-1">Category</p>
                <p className="text-white">{product.category?.name}</p>
              </div>
              <div>
                <p className="text-sm text-white/70 mb-1">Price</p>
                <p className="text-white font-bold">€{product.price?.toFixed(2) || '0.00'}</p>
              </div>
              <div>
                <p className="text-sm text-white/70 mb-1">Status</p>
                <Badge variant={product.is_active ? 'success' : 'default'}>
                  {product.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-white/70 mb-1">Approval</p>
                <Badge variant={product.is_approved ? 'success' : 'warning'}>
                  {product.is_approved ? 'Approved' : 'Pending'}
                </Badge>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    </AdminLayout>
  );
}

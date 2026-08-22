'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ProductEditShell from '@/components/layout/ProductEditShell';
import UnifiedProductForm from '@/components/products/UnifiedProductForm';
import ProductEditTypeGuard from '@/components/products/ProductEditTypeGuard';
import Loader from '@/components/ui/Loader';

export default function EditSunGlassesProductPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const productId = parseInt(String(params.id), 10);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [authLoading, isAuthenticated, router]);

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader />
      </div>
    );
  }

  if (!Number.isFinite(productId)) {
    return null;
  }

  return (
    <ProductEditShell
      title="Edit sunglasses"
      subtitle="Frame photos, try-on URL, lens options, lens tint colors, frame color variants — same as create."
    >
      <ProductEditTypeGuard productId={productId} expectedType="sunglasses">
        <UnifiedProductForm
          productId={productId}
          eyewearOnly={{ productType: 'sunglasses', defaultCategorySlug: 'sun-glasses' }}
        />
      </ProductEditTypeGuard>
    </ProductEditShell>
  );
}

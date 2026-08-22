'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { productService } from '@/services/product-service';
import { getProductEditPath } from '@/lib/product-edit-routes';
import Loader from '@/components/ui/Loader';

export default function EditProductRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();

  const rawId = params.id;
  const productId =
    typeof rawId === 'string' ? parseInt(rawId, 10) : Array.isArray(rawId) ? parseInt(rawId[0] ?? '', 10) : NaN;

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    if (!Number.isFinite(productId)) {
      router.replace('/products');
      return;
    }
    let cancelled = false;
    productService
      .getOne(productId)
      .then((p) => {
        if (cancelled) return;
        const path = getProductEditPath(p);
        // Hard navigation so the address bar always shows the typed route (e.g. …/edit/contact-lenses).
        // Client router.replace alone can leave /edit visible with a stale production bundle or hydration edge cases.
        if (typeof window !== 'undefined') {
          const nextUrl = `${window.location.origin}${path}`;
          if (window.location.pathname !== path) {
            window.location.replace(nextUrl);
            return;
          }
        }
        router.replace(path);
      })
      .catch(() => {
        if (!cancelled) router.replace('/products');
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, productId, router]);

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0066CC] mx-auto" />
        <p className="mt-4 text-gray-600">Opening product editor…</p>
      </div>
    </div>
  );
}

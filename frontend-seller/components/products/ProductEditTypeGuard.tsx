'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { productService, type Product } from '@/services/product-service';
import { getProductEditPath } from '@/lib/product-edit-routes';
import Loader from '@/components/ui/Loader';
import Alert from '@/components/ui/Alert';
import { useLanguage } from '@/contexts/LanguageContext';

interface ProductEditTypeGuardProps {
  productId: number;
  expectedType: Product['product_type'];
  children: React.ReactNode;
}

export default function ProductEditTypeGuard({ productId, expectedType, children }: ProductEditTypeGuardProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const [error, setError] = useState('');
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p = await productService.getOne(productId);
        if (cancelled) return;
        if (p.product_type !== expectedType) {
          const path = getProductEditPath(p);
          if (typeof window !== 'undefined' && window.location.pathname !== path) {
            window.location.replace(`${window.location.origin}${path}`);
          } else {
            router.replace(path);
          }
          return;
        }
        setVerified(true);
      } catch {
        if (!cancelled) {
          setError(t('products.loadFailed'));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [productId, expectedType, router, t]);

  if (error) {
    return <Alert type="error" message={error} />;
  }

  if (!verified) {
    return (
      <div className="py-16 flex justify-center">
        <Loader />
      </div>
    );
  }

  return <>{children}</>;
}

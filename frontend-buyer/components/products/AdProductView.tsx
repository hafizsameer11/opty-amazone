'use client';

import { useEffect } from 'react';
import { adService, adToken } from '@/services/ad-service';
import { useAuth } from '@/contexts/AuthContext';

export default function AdProductView({ productId }: { productId: number }) {
  const { isAuthenticated } = useAuth();
  useEffect(() => {
    const token = adToken(productId);
    if (token) void adService.event(token, 'product_view', productId).catch(() => undefined);
  }, [productId, isAuthenticated]);
  return null;
}

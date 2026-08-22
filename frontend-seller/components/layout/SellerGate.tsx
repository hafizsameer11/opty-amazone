'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { StoreService } from '@/services/store-service';
import { getSellerGateState, sellerGateRedirect } from '@/lib/seller-profile-gate';

const EXEMPT_PREFIXES = ['/auth/login', '/auth/register', '/auth/verification'];

export default function SellerGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (loading || !isAuthenticated) return;
    if (EXEMPT_PREFIXES.some((p) => pathname?.startsWith(p))) return;

    let cancelled = false;
    StoreService.getStore()
      .then((res) => {
        if (cancelled) return;
        const store = res.data?.store;
        const state = getSellerGateState(store);
        const redirect = sellerGateRedirect(state);
        if (!redirect) return;
        const base = redirect.split('?')[0];
        if (pathname === redirect || pathname?.startsWith(base)) return;
        router.replace(redirect);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [loading, isAuthenticated, pathname, router]);

  return <>{children}</>;
}

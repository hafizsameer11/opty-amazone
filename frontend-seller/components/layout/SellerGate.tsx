'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { StoreService } from '@/services/store-service';
import { getSellerGateState, needsEmailVerification, sellerGateRedirect } from '@/lib/seller-profile-gate';

const EXEMPT_PREFIXES = ['/auth/login', '/auth/register', '/auth/verify-email', '/auth/verification', '/auth/pending-approval', '/auth/store-suspended', '/store/edit'];

export default function SellerGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();
  const isExempt = EXEMPT_PREFIXES.some((p) => pathname?.startsWith(p));

  useEffect(() => {
    if (loading || !isAuthenticated) return;
    if (isExempt) return;

    let cancelled = false;

    // Email confirmation gates everything downstream, so it is checked before
    // spending a request on the store status.
    if (needsEmailVerification(user)) {
      router.replace('/auth/verify-email');
      return;
    }

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
  }, [loading, isAuthenticated, isExempt, pathname, router, user]);

  return <div className={isExempt ? undefined : 'seller-app-viewport'}>{children}</div>;
}

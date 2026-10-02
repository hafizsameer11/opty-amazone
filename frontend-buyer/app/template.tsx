'use client';

import { usePathname } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Don't show layout on auth pages
  const isAuthPage = pathname?.startsWith('/auth');

  // Error and not-found boundaries are rendered by Next without the root
  // layout, so they have no AuthProvider. MainLayout's Header needs that
  // context, so it must not wrap those routes or prerendering fails.
  const isProviderlessRoute = pathname?.startsWith('/_');

  if (isAuthPage || isProviderlessRoute) {
    return <>{children}</>;
  }

  return (
    <MainLayout>
      {children}
    </MainLayout>
  );
}











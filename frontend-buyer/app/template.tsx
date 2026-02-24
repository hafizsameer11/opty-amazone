'use client';

import { usePathname } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Don't show layout on auth pages
  const isAuthPage = pathname?.startsWith('/auth');
  
  if (isAuthPage) {
    return <>{children}</>;
  }
  
  return (
    <MainLayout>
      {children}
    </MainLayout>
  );
}







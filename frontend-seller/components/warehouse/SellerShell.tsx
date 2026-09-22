'use client';

import type { ReactNode } from 'react';
import BottomNav from '@/components/layout/BottomNav';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';

export function SellerShell({ children }: { children: ReactNode }) {
  return (
    <div className="seller-warehouse-shell flex h-full min-h-0 bg-slate-50">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header />
        <div className="seller-warehouse-content min-h-0 flex-1 overflow-y-auto overscroll-contain pb-20 lg:pb-0">
          {children}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

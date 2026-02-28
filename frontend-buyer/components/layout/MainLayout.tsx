'use client';

import { ReactNode } from 'react';
import Header from './Header';
import Footer from './Footer';
import BottomNav from './BottomNav';

interface MainLayoutProps {
  children: ReactNode;
  showHeader?: boolean;
  showFooter?: boolean;
  showBottomNav?: boolean;
}

export default function MainLayout({
  children,
  showHeader = true,
  showFooter = true,
  showBottomNav = true,
}: MainLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {showHeader && <Header />}
      
      <main className="flex-1 pb-20 lg:pb-0">
        {children}
      </main>
      
      {showFooter && <Footer />}
      {showBottomNav && <BottomNav />}
    </div>
  );
}











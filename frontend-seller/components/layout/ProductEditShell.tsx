'use client';

import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import Sidebar from '@/components/layout/Sidebar';
import SectionBackLink from '@/components/ui/SectionBackLink';
import { useLanguage } from '@/contexts/LanguageContext';

interface ProductEditShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export default function ProductEditShell({ title, subtitle, children }: ProductEditShellProps) {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto">
            <div className="py-4 sm:py-6">
              <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8">
                <div className="mb-6">
                  <SectionBackLink href="/products" className="mb-3">
                    {t('Back to Products')}
                  </SectionBackLink>
                  <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{t(title)}</h1>
                  {subtitle ? <p className="text-gray-600 mt-2 text-sm">{t(subtitle)}</p> : null}
                </div>
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

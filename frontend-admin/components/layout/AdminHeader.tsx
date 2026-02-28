'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';

const pageTitles: Record<string, string> = {
  '/dashboard': 'dashboard',
  '/users': 'users',
  '/sellers': 'sellers',
  '/products': 'products',
  '/orders': 'orders',
  '/categories': 'categories',
  '/coupons': 'coupons',
  '/analytics': 'analytics',
  '/settings': 'settings',
  '/activity-logs': 'activityLogs',
};

export default function AdminHeader() {
  const { user } = useAuth();
  const pathname = usePathname();
  const { t } = useLanguage();
  const pageTitleKey = pageTitles[pathname || ''] || 'dashboard';

  return (
    <header className="glass-strong border-b border-white/20 sticky top-0 z-30">
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-white">{t(pageTitleKey)}</h2>
        </div>
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <div className="text-right hidden md:block">
            <p className="text-sm font-semibold text-white">{user?.name}</p>
            <p className="text-xs text-white/70">{user?.email}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold">
            {user?.name?.charAt(0).toUpperCase() || 'A'}
          </div>
        </div>
      </div>
    </header>
  );
}

'use client';

import { useState } from 'react';
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
  '/banners': 'storeBanners',
  '/coupons': 'coupons',
  '/analytics': 'analytics',
  '/settings': 'settings',
  '/activity-logs': 'activityLogs',
  '/points': 'points',
  '/messages': 'messages',
  '/store-reports': 'storeReports',
  '/support': 'support',
  '/discount-campaigns': 'discountCampaigns',
  '/finance': 'marketplaceFinance',
  '/referrals': 'referralProgram',
  '/warehouse': 'warehouse',
  '/ad-campaigns': 'boostCampaigns',
};

export default function AdminHeader() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const { t } = useLanguage();
  const [profileOpen, setProfileOpen] = useState(false);
  const pageTitleKey = pageTitles[pathname || ''] ||
    (pathname?.startsWith('/orders/') ? 'orders' : pathname?.startsWith('/users/') ? 'users' : pathname?.startsWith('/sellers/') ? 'sellers' : pathname?.startsWith('/products/') ? 'products' : pathname?.startsWith('/ad-campaigns/') ? 'boostCampaigns' : 'dashboard');

  const handleLogout = async () => {
    setProfileOpen(false);
    await logout();
  };

  return (
    <header className="admin-header sticky top-0 z-30 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="flex min-h-[72px] items-center justify-between px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="hidden h-6 w-1 rounded-full bg-[#0875e1] sm:block" />
          <div className="min-w-0">
            <p className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{t('adminPanel')}</p>
            <h2 className="truncate text-xl font-bold tracking-tight text-slate-900 notranslate">{t(pageTitleKey)}</h2>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <LanguageSwitcher variant="dock" />
          <span className="hidden h-8 w-px bg-slate-200 sm:block" />
          <div className="relative">
            <button
              type="button"
              onClick={() => setProfileOpen(open => !open)}
              className="flex items-center gap-2 rounded-xl p-1.5 text-left transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-100"
              aria-expanded={profileOpen}
              aria-haspopup="menu"
              aria-label={t('admin')}
            >
              <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[#1683ed] to-[#075fbd] text-sm font-bold text-white shadow-sm">
                {user?.name?.charAt(0).toUpperCase() || 'A'}
              </span>
              <span className="hidden min-w-0 md:block">
                <span className="block max-w-[150px] truncate text-sm font-semibold text-slate-900">{user?.name || t('admin')}</span>
                <span className="block max-w-[150px] truncate text-xs text-slate-500">{t('admin')}</span>
              </span>
              <ChevronIcon className={`hidden h-4 w-4 text-slate-400 transition-transform sm:block ${profileOpen ? 'rotate-180' : ''}`} />
            </button>

            {profileOpen && (
              <div role="menu" className="absolute right-0 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_16px_40px_rgba(15,23,42,0.16)]">
                <div className="border-b border-slate-100 px-3 py-2.5">
                  <p className="truncate text-sm font-semibold text-slate-900">{user?.name || t('admin')}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">{user?.email || ''}</p>
                </div>
                <button type="button" role="menuitem" onClick={() => void handleLogout()} className="mt-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50">
                  <LogoutIcon className="h-4 w-4" />
                  {t('logout')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function ChevronIcon({ className }: { className: string }) {
  return <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>;
}

function LogoutIcon({ className }: { className: string }) {
  return <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M10 17l5-5-5-5M15 12H3M21 19V5a2 2 0 0 0-2-2h-7" /></svg>;
}

'use client';

import { useCallback, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { adminService, type AdminLiveSummary } from '@/services/admin-service';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { useToast } from '@/components/ui/Toast';

interface NavItem {
  nameKey: string;
  href: string;
  icon: React.ReactNode;
  section: NavSection;
}

type NavSection = 'dashboard' | 'people' | 'operations' | 'marketing' | 'communication' | 'finance' | 'system';

const sections: Array<{ id: NavSection; titleKey: string }> = [
  { id: 'dashboard', titleKey: 'dashboard' },
  { id: 'people', titleKey: 'sidebarUsersSellers' },
  { id: 'operations', titleKey: 'sidebarProductsOperations' },
  { id: 'marketing', titleKey: 'sidebarCampaignsMarketing' },
  { id: 'communication', titleKey: 'sidebarReportsCommunication' },
  { id: 'finance', titleKey: 'sidebarFinanceGrowth' },
  { id: 'system', titleKey: 'sidebarSystem' },
];

const navigation: NavItem[] = [
  { nameKey: 'dashboard', href: '/dashboard', icon: <DashboardIcon />, section: 'dashboard' },
  { nameKey: 'users', href: '/users', icon: <UsersIcon />, section: 'people' },
  { nameKey: 'sellers', href: '/sellers', icon: <SellersIcon />, section: 'people' },
  { nameKey: 'products', href: '/products', icon: <ProductsIcon />, section: 'operations' },
  { nameKey: 'orders', href: '/orders', icon: <OrdersIcon />, section: 'operations' },
  { nameKey: 'warehouse', href: '/warehouse', icon: <ProductsIcon />, section: 'operations' },
  { nameKey: 'categories', href: '/categories', icon: <CategoriesIcon />, section: 'operations' },
  { nameKey: 'boostCampaigns', href: '/ad-campaigns', icon: <ProductsIcon />, section: 'marketing' },
  { nameKey: 'Discount Campaigns', href: '/discount-campaigns', icon: <ProductsIcon />, section: 'marketing' },
  { nameKey: 'storeBanners', href: '/banners', icon: <BannersIcon />, section: 'marketing' },
  { nameKey: 'coupons', href: '/coupons', icon: <CouponsIcon />, section: 'marketing' },
  { nameKey: 'messages', href: '/messages', icon: <MessagesIcon />, section: 'communication' },
  { nameKey: 'support', href: '/support', icon: <MessagesIcon />, section: 'communication' },
  { nameKey: 'storeReports', href: '/store-reports', icon: <ReportsIcon />, section: 'communication' },
  { nameKey: 'analytics', href: '/analytics', icon: <AnalyticsIcon />, section: 'communication' },
  { nameKey: 'activityLogs', href: '/activity-logs', icon: <ActivityIcon />, section: 'communication' },
  { nameKey: "Marketplace Finance", href: "/finance", icon: <span className="text-xl">€</span>, section: 'finance' },
  { nameKey: "Referral Program", href: "/referrals", icon: <span className="text-xl">↗</span>, section: 'finance' },
  { nameKey: 'points', href: '/points', icon: <PointsIcon />, section: 'finance' },
  { nameKey: 'settings', href: '/settings', icon: <SettingsIcon />, section: 'system' },
];

function MessagesIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

function ReportsIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    </svg>
  );
}

function DashboardIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function SellersIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}

function ProductsIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );
}

function OrdersIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  );
}

function CategoriesIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  );
}

function BannersIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function CouponsIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function AnalyticsIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function ActivityIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function PointsIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

export default function AdminSidebar() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [summary, setSummary] = useState<AdminLiveSummary | null>(null);
  const previousSummary = useRef<AdminLiveSummary | null>(null);

  const loadSummary = useCallback(async () => {
    if (!isAuthenticated) {
      setSummary(null);
      previousSummary.current = null;
      return;
    }
    try {
      const next = await adminService.getLiveSummary();
      const previous = previousSummary.current;
      setSummary(next);
      if (previous) {
        const reminders: Array<[keyof AdminLiveSummary, string]> = [
          ['orders', 'orders'], ['messages', 'messages'], ['support', 'support'], ['sellers', 'sellers'], ['products', 'products'], ['reports', 'reports'], ['banners', 'banners'], ['boost_campaigns', 'boost_campaigns'], ['referrals', 'referrals'], ['withdrawals', 'withdrawals'],
        ];
        const increased = reminders.find(([key]) => Number(next[key]) > Number(previous[key]));
        if (increased && !pathname?.startsWith('/' + (increased[0] === 'boost_campaigns' ? 'ad-campaigns' : increased[0]))) {
          showToast('info', t(`reminder_${increased[1]}`));
        }
      }
      previousSummary.current = next;
    } catch {
      // Keep the last known badges while the admin API reconnects.
    }
  }, [isAuthenticated, pathname, showToast, t]);

  useLiveRefresh(loadSummary, isAuthenticated, 15000, true);

  const badgeFor = (href: string): number => {
    if (!summary) return 0;
    const values: Record<string, number> = {
      '/finance': summary.withdrawals,
      '/referrals': summary.referrals,
      '/sellers': summary.sellers,
      '/products': summary.products,
      '/ad-campaigns': summary.boost_campaigns,
      '/orders': summary.orders,
      '/messages': summary.messages,
      '/support': summary.support,
      '/store-reports': summary.reports,
      '/banners': summary.banners,
      '/discount-campaigns': summary.discount_campaigns,
    };
    return values[href] || 0;
  };

  return (
    <div className="fixed left-0 top-0 h-full w-64 admin-sidebar border-r border-white/10 z-40">
      <div className="flex flex-col h-full">
        <div className="border-b border-white/10 px-6 py-5">
          <Link href="/dashboard" className="group inline-flex items-center gap-3" aria-label={t('opticalMarketplace')}>
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-blue-400 to-[#0875e1] text-[21px] font-extrabold tracking-[-0.08em] text-white shadow-[0_8px_18px_rgba(8,117,225,0.35)] transition-transform group-hover:scale-[1.03]">OM</span>
            <span className="min-w-0">
              <span className="block text-[22px] font-extrabold leading-none tracking-[-0.04em] text-white">OM</span>
              <span className="mt-1 block text-[11px] font-medium tracking-wide text-slate-400">{t('opticalMarketplace')}</span>
            </span>
          </Link>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
          {sections.map(section => {
            const items = navigation.filter(item => item.section === section.id);
            return <section key={section.id} aria-label={t(section.titleKey)}>
              <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{t(section.titleKey)}</p>
              <div className="space-y-1">
                {items.map((item) => {
                  const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                  const badge = pathname === item.href ? 0 : badgeFor(item.href);
                  const showBadge = badge > 0;
                  return (
                    <Link
                      key={item.nameKey}
                      href={item.href}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                        isActive
                          ? 'bg-[#0066CC] text-white shadow-sm'
                          : 'text-slate-300 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {item.icon}
                      <span className="notranslate flex-1 text-sm font-medium">{t(item.nameKey)}</span>
                      {showBadge && (
                        <span className="ml-auto flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                          {badge > 99 ? '99+' : badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </section>;
          })}
        </nav>
      </div>
    </div>
  );
}

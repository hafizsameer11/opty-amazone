'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { isSellerProfileComplete } from '@/lib/seller-profile-gate';
import { notificationService } from '@/services/notification-service';

const POLL_MS = 30000;

export default function BottomNav() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { user, isAuthenticated } = useAuth();
  const navLocked = Boolean(user && !isSellerProfileComplete(user));
  const [badges, setBadges] = useState({ orders: 0, messages: 0 });

  useEffect(() => {
    if (!isAuthenticated) return;

    const load = () => {
      notificationService
        .getUnreadCounts()
        .then((data) => {
          setBadges({
            orders: pathname?.startsWith('/orders') ? 0 : data.orders,
            messages: pathname?.startsWith('/messages') ? 0 : data.messages,
          });
        })
        .catch(() => {});
    };

    load();
    const id = window.setInterval(load, POLL_MS);
    return () => window.clearInterval(id);
  }, [isAuthenticated, pathname]);

  const navItems = [
    {
      href: '/dashboard',
      label: t('dashboard'),
      badgeKey: undefined as undefined | 'orders' | 'messages',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      href: '/products',
      label: t('products'),
      badgeKey: undefined as undefined | 'orders' | 'messages',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
    {
      href: '/orders',
      label: t('orders'),
      badgeKey: 'orders' as const,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      href: '/promotions',
      label: t('discounts'),
      badgeKey: undefined as undefined | 'orders' | 'messages',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      ),
    },
    {
      href: '/profile',
      label: t('profile'),
      badgeKey: undefined as undefined | 'orders' | 'messages',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
  ];

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname === '/';
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 lg:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const locked = navLocked && item.href !== '/profile';
          const count = item.badgeKey ? badges[item.badgeKey] : 0;
          const className = `relative flex flex-col items-center justify-center flex-1 h-full transition-colors ${
            active ? 'text-[#0066CC]' : 'text-gray-600 hover:text-gray-900'
          } ${locked ? 'opacity-40 pointer-events-none' : ''}`;
          const content = (
            <>
              <span className="relative">
                {item.icon}
                {count > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </span>
              <span className="text-xs mt-1 font-medium">{item.label}</span>
            </>
          );
          if (locked) {
            return (
              <span key={item.href} title={t('completeProfileNavHint')} className={className}>
                {content}
              </span>
            );
          }
          return (
            <Link key={item.href} href={item.href} className={className}>
              {content}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

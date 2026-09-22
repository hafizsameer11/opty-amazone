'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';
import { displayProfileImageUrl } from '@/lib/profile-image-url';
import { notificationService } from '@/services/notification-service';
import { useToast } from '@/components/ui/Toast';
import { localizedSellerNotification } from '@/services/notification-copy';
import { WAREHOUSE_UPDATED_EVENT, warehouseService } from '@/services/warehouse-service';

export default function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [showDropdown, setShowDropdown] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [warehouseCartCount, setWarehouseCartCount] = useState(0);
  const { t } = useLanguage();
  const headerAvatarUrl = displayProfileImageUrl(user?.profile_image_url);
  const { showToast } = useToast();
  const seenChatNotifications = useRef<Set<string>>(new Set());
  const notificationFeedInitialized = useRef(false);

  const refreshWarehouseCart = useCallback(async () => {
    if (!user) {
      setWarehouseCartCount(0);
      return;
    }
    try {
      const cart = await warehouseService.cart();
      setWarehouseCartCount(cart.items.reduce((total, item) => total + Number(item.quantity || 0), 0));
    } catch {
      // The normal seller header must remain usable if warehouse data is
      // temporarily unavailable; retain the last known count.
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setUnreadNotifications(0);
      seenChatNotifications.current.clear();
      notificationFeedInitialized.current = false;
      return;
    }
    const load = async () => {
      try {
        const result = await notificationService.list({ per_page: 50 });
        setUnreadNotifications(result.unread_count || 0);
        const chatNotifications = (result.notifications || []).filter((item) => item.type === 'chat.message_received');

        if (!notificationFeedInitialized.current) {
          chatNotifications.forEach((item) => seenChatNotifications.current.add(item.id));
          notificationFeedInitialized.current = true;
          return;
        }

        const newChats = chatNotifications.filter((item) => !item.read_at && !seenChatNotifications.current.has(item.id));
        chatNotifications.forEach((item) => seenChatNotifications.current.add(item.id));
        newChats.forEach((newChat) => {
          const copy = localizedSellerNotification(newChat, t);
          const time = newChat.created_at ? new Date(newChat.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
          showToast('info', `${copy.message}${time ? ` · ${time}` : ''}`, 12000, {
            label: t('notifications.openConversation'),
            onClick: async () => {
              try {
                await notificationService.markRead(newChat.id);
              } catch {
                // Navigation should still work if marking the notification is temporarily unavailable.
              }
              router.push(newChat.url || '/messages');
            },
          }, {
            title: copy.title,
            imageUrl: typeof newChat.context?.sender_image_url === 'string'
              ? displayProfileImageUrl(newChat.context.sender_image_url)
              : null,
          });
        });
      } catch {
        // Keep the current badge and layout available during transient failures.
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(timer);
  }, [router, showToast, t, user]);

  useEffect(() => {
    void refreshWarehouseCart();
    const refresh = () => void refreshWarehouseCart();
    const syncOtherTab = (event: StorageEvent) => {
      if (event.key === WAREHOUSE_UPDATED_EVENT) refresh();
    };
    const timer = window.setInterval(refresh, 8000);
    window.addEventListener(WAREHOUSE_UPDATED_EVENT, refresh);
    window.addEventListener('storage', syncOtherTab);
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener(WAREHOUSE_UPDATED_EVENT, refresh);
      window.removeEventListener('storage', syncOtherTab);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('online', refresh);
    };
  }, [refreshWarehouseCart]);

  useEffect(() => {
    document.body.classList.toggle('seller-mobile-menu-open', menuOpen);
    return () => document.body.classList.remove('seller-mobile-menu-open');
  }, [menuOpen]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push('/auth/login');
  };

  const mobilePageTitle = (() => {
    if (pathname === '/' || pathname === '/dashboard') return t('dashboard');
    if (pathname.startsWith('/products/new')) return t('products.addProduct');
    if (pathname.startsWith('/products')) return t('nav.products');
    if (pathname.startsWith('/warehouse')) return 'Warehouse';
    if (pathname.startsWith('/orders')) return t('nav.orders');
    if (pathname.startsWith('/store/settings')) return t('storeSettings');
    if (pathname.startsWith('/store/edit')) return t('store.editStore');
    if (pathname.startsWith('/store')) return t('nav.store');
    if (pathname.startsWith('/wallet')) return t('nav.sellerWallet');
    if (pathname.startsWith('/category-lens-config')) return t('nav.lensConfiguration');
    if (pathname.startsWith('/prescription-dropdowns')) return t('nav.prescriptionOptions');
    if (pathname.startsWith('/category-field-config')) return t('nav.fieldConfiguration');
    if (pathname.startsWith('/promotions')) return t('nav.discountCampaigns');
    if (pathname.startsWith('/coupons')) return t('nav.coupons');
    if (pathname.startsWith('/referral-campaigns')) return t('nav.referralCampaigns');
    if (pathname.startsWith('/boost-ads')) return t('nav.boostAds');
    if (pathname.startsWith('/announcements')) return t('nav.announcements');
    if (pathname.startsWith('/banners')) return t('nav.banners');
    if (pathname.startsWith('/analytics')) return t('nav.analytics');
    if (pathname.startsWith('/messages')) return t('nav.messages');
    if (pathname.startsWith('/notifications')) return t('nav.notifications');
    if (pathname.startsWith('/guide')) return t('nav.guide');
    if (pathname.startsWith('/profile')) return t('nav.profile');
    return t('dashboard');
  })();

  const mobileNavigation = [
    {
      label: 'Workspace',
      items: [
        { href: '/', label: t('nav.dashboard'), icon: '⌂' },
        { href: '/store', label: t('nav.store'), icon: '⌂' },
        { href: '/products', label: t('nav.products'), icon: '▦' },
        { href: '/warehouse', label: 'Warehouse', icon: '▣' },
        { href: '/warehouse/cart', label: 'Warehouse Cart', icon: '🛒', badge: warehouseCartCount },
        { href: '/orders', label: t('nav.orders'), icon: '▤' },
        { href: '/wallet', label: t('nav.sellerWallet'), icon: '€' },
        { href: '/messages', label: t('nav.messages'), icon: '◌', badge: unreadNotifications },
      ],
    },
    {
      label: 'Catalog tools',
      items: [
        { href: '/category-lens-config', label: t('nav.lensConfiguration'), icon: '◉' },
        { href: '/prescription-dropdowns', label: t('nav.prescriptionOptions'), icon: '▤' },
        { href: '/category-field-config', label: t('nav.fieldConfiguration'), icon: '≡' },
        { href: '/promotions', label: t('nav.discountCampaigns'), icon: '%' },
        { href: '/coupons', label: t('nav.coupons'), icon: '▧' },
        { href: '/referral-campaigns', label: t('nav.referralCampaigns'), icon: '↗' },
        { href: '/boost-ads', label: t('nav.boostAds'), icon: 'ϟ' },
      ],
    },
    {
      label: 'Grow your store',
      items: [
        { href: '/announcements', label: t('nav.announcements'), icon: '◢' },
        { href: '/banners', label: t('nav.banners'), icon: '▧' },
        { href: '/analytics', label: t('nav.analytics'), icon: '⌁' },
        { href: '/notifications', label: t('nav.notifications'), icon: '●', badge: unreadNotifications },
        { href: '/guide', label: t('nav.guide'), icon: '?' },
      ],
    },
  ];

  // Keep the drawer outside the sticky header. A sticky header creates its own
  // stacking context, which previously allowed page-level dialogs and content
  // to appear above this menu on some seller routes.
  const mobileDrawer = menuOpen && typeof document !== 'undefined'
    ? createPortal(
      <div className="fixed inset-0 z-[2147483000] isolate overflow-hidden lg:hidden" data-seller-mobile-drawer>
        <button
          type="button"
          aria-label="Close seller navigation"
          onClick={() => setMenuOpen(false)}
          className="absolute inset-0 h-full w-full bg-slate-950/45 backdrop-blur-[1px]"
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Seller navigation"
          className="absolute inset-y-0 left-0 z-10 flex h-[100dvh] max-h-[100dvh] w-[min(22rem,calc(100vw-1.25rem))] flex-col overflow-hidden bg-white text-slate-900 shadow-2xl"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4">
            <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#0066CC]">Optical market</p><h2 className="mt-1 text-lg font-bold">Seller menu</h2></div>
            <button type="button" onClick={() => setMenuOpen(false)} aria-label="Close menu" className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m6 6 12 12M18 6 6 18" /></svg></button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5">
            <Link href="/profile" className="mb-5 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-blue-50 to-emerald-50 p-4" onClick={() => setMenuOpen(false)}>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#0066CC] to-[#00CC66] font-bold text-white">{headerAvatarUrl ? <img src={headerAvatarUrl} alt="" className="h-full w-full object-cover" /> : user?.name?.charAt(0).toUpperCase() || 'S'}</span>
              <span className="min-w-0"><span className="block truncate font-bold">{user?.name || t('seller')}</span><span className="mt-0.5 block truncate text-xs text-slate-500">{user?.email || t('yourProfile')}</span></span><span className="ml-auto text-lg text-[#0066CC]">›</span>
            </Link>
            {mobileNavigation.map((group) => (
              <section key={group.label} className="mb-5">
                <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">{group.label}</p>
                <nav className="space-y-1">{group.items.map((item) => {
                  const active = item.href === '/' ? pathname === '/' || pathname === '/dashboard' : pathname.startsWith(item.href);
                  return <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${active ? 'bg-blue-50 text-[#0066CC]' : 'text-slate-700 hover:bg-slate-50'}`}><span className={`flex h-8 w-8 items-center justify-center rounded-lg text-base ${active ? 'bg-[#0066CC] text-white' : 'bg-slate-100 text-slate-500'}`}>{item.icon}</span><span className="min-w-0 flex-1 truncate">{item.label}</span>{item.badge ? <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">{item.badge > 99 ? '99+' : item.badge}</span> : <span className="text-slate-400">›</span>}</Link>;
                })}</nav>
              </section>
            ))}
          </div>
          <div className="shrink-0 border-t border-slate-200 p-4"><button type="button" onClick={() => void handleLogout()} className="flex w-full items-center justify-center rounded-xl border border-red-200 px-4 py-3 text-sm font-bold text-red-600 transition hover:bg-red-50">{t('signOut')}</button></div>
        </aside>
      </div>,
      document.body,
    )
    : null;

  return (
    <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-soft">
      <div className="lg:hidden">
        <div className="flex h-8 items-center justify-between border-b border-slate-100 bg-slate-50 px-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Seller workspace</p>
          <LanguageSwitcher />
        </div>
        <div className="flex h-[4.25rem] items-center gap-2 border-b border-slate-200 bg-white px-3 shadow-sm">
          <button
            type="button"
            aria-label="Open seller navigation"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-[#0066CC]"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <Link href="/" aria-label={t('nav.dashboard')} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0066CC] to-[#00a95a] text-white shadow-sm">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0 7-7 7 7M5 10v10a1 1 0 0 0 1 1h3m10-11 2 2m-2-2v10a1 1 0 0 1-1 1h-3m-6 0a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1m-6 0h6" /></svg>
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#0066CC]">Seller workspace</p>
            <h1 className="truncate text-sm font-bold text-slate-950">{mobilePageTitle}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Link href="/warehouse/cart" aria-label="Warehouse cart" className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-[#0066CC]">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13 5.4 5M7 13l-2.3 2.3c-.63.63-.18 1.7.71 1.7H17m0 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm-10 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" /></svg>
              {warehouseCartCount > 0 && <span className="absolute right-0 top-0 min-w-4 rounded-full bg-[#0066CC] px-1 text-center text-[9px] font-bold leading-4 text-white ring-2 ring-white">{warehouseCartCount > 99 ? '99+' : warehouseCartCount}</span>}
            </Link>
            <Link href="/notifications" aria-label={t('notifications.ariaLabel')} className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-[#0066CC]">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6.002 6.002 0 0 0-4-5.659V5a2 2 0 1 0-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9" /></svg>
              {unreadNotifications > 0 && <span className="absolute right-0 top-0 min-w-4 rounded-full bg-red-600 px-1 text-center text-[9px] font-bold leading-4 text-white ring-2 ring-white">{unreadNotifications > 99 ? '99+' : unreadNotifications}</span>}
            </Link>
            <Link href="/profile" aria-label={t('yourProfile')} className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#0066CC] to-[#00CC66] text-sm font-bold text-white shadow-sm">
              {headerAvatarUrl ? <img src={headerAvatarUrl} alt="" className="h-full w-full object-cover" /> : user?.name?.charAt(0).toUpperCase() || 'U'}
            </Link>
          </div>
        </div>
      </div>

      <div className="hidden lg:block px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <h2 className="text-xl font-bold text-gray-900 bg-gradient-to-r from-[#0066CC] to-[#0052A3] bg-clip-text text-transparent">
              {mobilePageTitle}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <Link href="/warehouse/cart" aria-label="Warehouse cart" className="relative p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0066CC] rounded-lg transition-all duration-200">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13 5.4 5M7 13l-2.3 2.3c-.63.63-.18 1.7.71 1.7H17m0 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm-10 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" /></svg>
              {warehouseCartCount > 0 && <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#0066CC] px-1 text-[10px] font-bold text-white ring-2 ring-white">{warehouseCartCount > 99 ? '99+' : warehouseCartCount}</span>}
            </Link>
            {/* Notifications */}
            <Link href="/notifications" aria-label={t('notifications.ariaLabel')} className="relative p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0066CC] rounded-lg transition-all duration-200">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadNotifications > 0 && <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">{unreadNotifications > 99 ? '99+' : unreadNotifications}</span>}
            </Link>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#0066CC] transition-all duration-200"
              >
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#0066CC] to-[#00CC66] flex items-center justify-center text-white font-bold text-sm shadow-md overflow-hidden shrink-0">
                  {headerAvatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={headerAvatarUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    user?.name?.charAt(0).toUpperCase() || 'U'
                  )}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-semibold text-gray-900">{user?.name || 'User'}</p>
                  <p className="text-xs text-gray-500">{t('seller')}</p>
                </div>
                <svg className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowDropdown(false)}
                  ></div>
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-strong border border-gray-200 z-20 animate-slide-up">
                    <div className="py-2">
                      <Link
                        href="/profile"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setShowDropdown(false)}
                      >
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {t('yourProfile')}
                      </Link>
                      <Link
                        href="/store"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setShowDropdown(false)}
                      >
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        {t('storeSettings')}
                      </Link>
                      <hr className="my-2 border-gray-200" />
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors rounded-lg mx-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        {t('signOut')}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {mobileDrawer}
    </div>
  );
}

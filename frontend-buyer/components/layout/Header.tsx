'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { productService, type Category } from '@/services/product-service';
import { notificationService } from '@/services/notification-service';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';

const mobileLinks = [
  { href: '/', label: 'Home', icon: '⌂' },
  { href: '/products', label: 'Shop products', icon: '◫' },
  { href: '/categories', label: 'Browse categories', icon: '▦' },
  { href: '/stores', label: 'Stores', icon: '⌂' },
  { href: '/orders', label: 'My orders', icon: '▤' },
];

function CartIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13 5.4 5M7 13l-2.3 2.3A1 1 0 0 0 5.8 17H17m0 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm-8 2a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z" /></svg>;
}

function BellIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 0 0-4-5.7V5a2 2 0 1 0-4 0v.3A6 6 0 0 0 6 11v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9" /></svg>;
}

function SearchIcon() {
  return <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-4.4-4.4m1.4-5.1a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" /></svg>;
}

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const { cartCount } = useCart();
  const { t } = useLanguage();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState<number | null>(null);
  const [clickedCategory, setClickedCategory] = useState<number | null>(null);
  const categoryCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    productService.getCategories(true).then((rows) => setCategories(rows || [])).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    const closeMenus = (event: MouseEvent) => {
      if (!(event.target as HTMLElement).closest('.desktop-category-dropdown')) {
        setHoveredCategory(null);
        setClickedCategory(null);
      }
    };
    document.addEventListener('mousedown', closeMenus);
    return () => {
      document.removeEventListener('mousedown', closeMenus);
      if (categoryCloseTimer.current) clearTimeout(categoryCloseTimer.current);
    };
  }, []);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('mobile-menu-open', menuOpen);
    return () => document.body.classList.remove('mobile-menu-open');
  }, [menuOpen]);

  useLiveRefresh(async () => {
    if (!isAuthenticated) {
      setUnreadNotifications(0);
      return;
    }
    const result = await notificationService.list({ per_page: 20 });
    setUnreadNotifications(result.unread_count || 0);
  }, isAuthenticated, 15000, true);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = query.trim();
    if (!value) return;
    const findCategory = (rows: Category[]): Category | undefined => {
      for (const category of rows) {
        if (category.id === selectedCategoryId) return category;
        const child = category.children ? findCategory(category.children) : undefined;
        if (child) return child;
      }
      return undefined;
    };
    const selected = findCategory(categories);
    router.push(selected ? `/categories/${selected.slug}?search=${encodeURIComponent(value)}` : `/search?q=${encodeURIComponent(value)}`);
    setMenuOpen(false);
  };

  const signOut = () => {
    void logout();
    setMenuOpen(false);
    router.replace('/auth/login');
  };

  const cartBadge = cartCount > 99 ? '99+' : cartCount;
  const notificationBadge = unreadNotifications > 99 ? '99+' : unreadNotifications;

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-[#101b2d] text-white shadow-[0_6px_20px_rgba(15,23,42,0.22)]">
      <div className="md:hidden">
        <div className="flex h-10 items-center justify-between border-b border-white/10 bg-[#17263b] px-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-300">{t('common.marketplace')}</p>
          <LanguageSwitcher />
        </div>
        <div className="px-3 pb-3 pt-2.5">
          <div className="flex items-center justify-between gap-2">
            <Link href="/" className="flex min-w-0 items-center gap-2" aria-label="OpticalMarket home">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-blue-600 text-xs font-extrabold shadow-lg">OM</span>
              <span className="truncate text-base font-bold tracking-tight">OpticalMarket</span>
            </Link>
            <div className="flex shrink-0 items-center gap-1">
              {isAuthenticated && <Link href="/notifications" aria-label="Notifications" className="relative flex h-10 w-10 items-center justify-center rounded-xl text-white transition hover:bg-white/10"><BellIcon />{unreadNotifications > 0 && <span className="absolute right-0.5 top-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold ring-2 ring-[#101b2d]">{notificationBadge}</span>}</Link>}
              <Link href="/cart" aria-label="Cart" className="relative flex h-10 w-10 items-center justify-center rounded-xl text-white transition hover:bg-white/10"><CartIcon />{cartCount > 0 && <span className="absolute right-0.5 top-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-[#febd69] px-1 text-[9px] font-bold text-slate-900 ring-2 ring-[#101b2d]">{cartBadge}</span>}</Link>
              <button type="button" aria-label="Open navigation menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/5 transition hover:bg-white/15"><svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg></button>
            </div>
          </div>
          <form onSubmit={submitSearch} className="mt-3 flex h-11 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-white/10 focus-within:ring-2 focus-within:ring-[#febd69]">
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('searchPlaceholder')} className="min-w-0 flex-1 border-0 bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400" />
            <button type="submit" aria-label={t('search')} className="flex w-12 items-center justify-center bg-[#febd69] text-slate-900 transition hover:bg-[#f3a847]"><SearchIcon /></button>
          </form>
        </div>
      </div>

      <div className="hidden md:block">
        <div className="relative z-50 border-b border-white/10 bg-[#232f3e]">
          <div className="relative mx-auto max-w-7xl px-6">
            <div className="flex items-center justify-between py-2.5">
              <nav className="flex min-w-0 items-center gap-4 overflow-visible text-sm font-medium">
                <Link href="/" className="whitespace-nowrap transition-colors hover:text-[#febd69]">{t('all')}</Link>
                {categories.map((category) => {
                  const hasChildren = Boolean(category.children?.length);
                  const isOpen = hoveredCategory === category.id || clickedCategory === category.id;
                  const clearCloseTimer = () => {
                    if (categoryCloseTimer.current) clearTimeout(categoryCloseTimer.current);
                    categoryCloseTimer.current = null;
                  };
                  const scheduleClose = () => {
                    clearCloseTimer();
                    categoryCloseTimer.current = setTimeout(() => {
                      if (clickedCategory !== category.id) setHoveredCategory(null);
                    }, 180);
                  };
                  return (
                    <div key={category.id} className="desktop-category-dropdown relative" onMouseEnter={() => { clearCloseTimer(); if (hasChildren) setHoveredCategory(category.id); }} onMouseLeave={scheduleClose}>
                      <div className="flex items-center gap-0.5">
                        <Link href={`/categories/${category.slug}`} className="whitespace-nowrap transition-colors hover:text-[#febd69]">{category.name}</Link>
                        {hasChildren && <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); clearCloseTimer(); setClickedCategory((current) => current === category.id ? null : category.id); setHoveredCategory(category.id); }} aria-label={`Open ${category.name} categories`} aria-expanded={isOpen} className="rounded p-1 text-slate-300 transition hover:text-[#febd69]"><svg className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m19 9-7 7-7-7" /></svg></button>}
                      </div>
                      {hasChildren && isOpen && (
                        <div className="absolute left-0 top-full z-[100] w-60 pt-2" onMouseEnter={clearCloseTimer} onMouseLeave={scheduleClose}>
                          <div className="rounded-lg border border-slate-200 bg-white py-2 text-slate-800 shadow-2xl">
                            {category.children?.map((child) => <div key={child.id} className="group/sub relative"><Link href={`/categories/${child.slug}`} onClick={() => setClickedCategory(null)} className="flex items-center justify-between px-5 py-2.5 text-sm font-medium transition hover:bg-[#febd69]/15 hover:text-slate-950"><span>{child.name}</span>{child.children?.length ? <span className="text-slate-400">›</span> : null}</Link>{child.children?.length ? <div className="invisible absolute left-full top-0 ml-1 w-56 rounded-lg border border-slate-200 bg-white py-2 opacity-0 shadow-2xl transition group-hover/sub:visible group-hover/sub:opacity-100">{child.children.map((grandchild) => <Link key={grandchild.id} href={`/categories/${grandchild.slug}`} onClick={() => setClickedCategory(null)} className="block px-5 py-2 text-sm text-slate-700 hover:bg-[#febd69]/15 hover:text-slate-950">{grandchild.name}</Link>)}</div> : null}</div>)}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </nav>
              <div className="ml-4 flex shrink-0 items-center gap-4 text-sm font-medium"><LanguageSwitcher />{isAuthenticated ? <><Link href="/profile" className="whitespace-nowrap transition-colors hover:text-[#febd69]">{user?.name?.split(' ')[0] || t('account')}</Link><button type="button" onClick={signOut} className="whitespace-nowrap transition-colors hover:text-[#febd69]">{t('signOut')}</button></> : <><Link href="/auth/login" className="whitespace-nowrap transition-colors hover:text-[#febd69]">{t('signIn')}</Link><Link href="/auth/register" className="whitespace-nowrap transition-colors hover:text-[#febd69]">{t('register')}</Link></>}</div>
            </div>
          </div>
        </div>
        <div className="bg-[#131921]"><div className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-4">
          <Link href="/" className="flex shrink-0 items-center gap-3" aria-label={`${t('common.brand')} home`}><span className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-teal-400 via-teal-500 to-blue-600 text-base font-extrabold shadow-lg">OM</span><span><span className="block text-2xl font-bold tracking-tight">{t('common.brand')}</span><span className="block text-[10px] font-medium uppercase tracking-[0.16em] text-slate-300">{t('common.marketplace')}</span></span></Link>
          <form onSubmit={submitSearch} className="flex h-11 min-w-0 max-w-3xl flex-1 overflow-hidden rounded-lg bg-white shadow-md focus-within:ring-2 focus-within:ring-[#febd69]"><select value={selectedCategoryId ?? ''} onChange={(event) => setSelectedCategoryId(event.target.value ? Number(event.target.value) : null)} className="max-w-44 border-0 border-r border-slate-300 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none"><option value="">{t('allCategories')}</option>{categories.flatMap((category) => [<option key={category.id} value={category.id}>{category.name}</option>, ...(category.children || []).map((child) => <option key={child.id} value={child.id}>{category.name} → {child.name}</option>)])}</select><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('searchPlaceholder')} className="min-w-0 flex-1 border-0 px-4 text-sm text-slate-900 outline-none" /><button type="submit" className="flex w-16 items-center justify-center gap-2 bg-[#febd69] text-sm font-bold text-slate-900 transition hover:bg-[#f3a847]" aria-label={t('search')}><SearchIcon /><span>{t('search')}</span></button></form>
          <div className="flex shrink-0 items-center gap-4"><Link href="/cart" className="relative flex flex-col items-center text-white transition hover:text-[#febd69]"><CartIcon className="h-7 w-7" /><span className="mt-0.5 text-xs font-medium">{t('cart')}</span>{cartCount > 0 && <span className="absolute -right-2 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[#febd69] px-1 text-[10px] font-bold text-slate-900">{cartBadge}</span>}</Link>{isAuthenticated && <Link href="/notifications" aria-label="Notifications" className="relative rounded-lg p-2 text-white transition hover:bg-white/10 hover:text-[#febd69]"><BellIcon className="h-7 w-7" />{unreadNotifications > 0 && <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold">{notificationBadge}</span>}</Link>}<Link href={isAuthenticated ? '/profile' : '/auth/login'} className="flex flex-col items-start text-white transition hover:text-[#febd69]"><span className="text-[11px] text-slate-300">{t('hello')}, {isAuthenticated ? user?.name?.split(' ')[0] || t('account') : t('signIn')}</span><span className="flex items-center gap-1 text-sm font-semibold">{t('accountLists')}<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m19 9-7 7-7-7" /></svg></span></Link></div>
        </div></div>
      </div>

      {menuOpen && <div className="md:hidden"><button type="button" aria-label="Close navigation menu" onClick={() => setMenuOpen(false)} className="fixed inset-0 z-[60] bg-slate-950/50 backdrop-blur-[1px]" /><aside role="dialog" aria-modal="true" aria-label="Navigation menu" className="fixed inset-y-0 right-0 z-[70] flex w-[min(22rem,calc(100vw-1.25rem))] flex-col bg-white text-slate-900 shadow-2xl"><div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#0066CC]">Your marketplace</p><p className="mt-1 font-bold">Menu</p></div><button type="button" onClick={() => setMenuOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700" aria-label="Close menu"><svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m6 6 12 12M18 6 6 18" /></svg></button></div><div className="flex-1 overflow-y-auto px-4 py-5"><Link href={isAuthenticated ? '/profile' : '/auth/login'} onClick={() => setMenuOpen(false)} className="mb-5 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-blue-50 to-cyan-50 p-4"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0066CC] font-bold text-white">{isAuthenticated ? user?.name?.charAt(0)?.toUpperCase() || 'U' : '↗'}</span><span className="min-w-0"><span className="block font-bold">{isAuthenticated ? user?.name || 'My profile' : 'Sign in to your account'}</span><span className="mt-0.5 block truncate text-xs text-slate-500">{isAuthenticated ? user?.email : 'Orders, saved items, and more'}</span></span><span className="ml-auto text-[#0066CC]">›</span></Link><nav className="space-y-1">{mobileLinks.map((item) => <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold hover:bg-slate-50"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-base text-[#0066CC]">{item.icon}</span>{item.label}<span className="ml-auto text-slate-400">›</span></Link>)}</nav><div className="my-5 border-t border-slate-200" /><p className="px-3 text-xs font-bold uppercase tracking-[0.13em] text-slate-400">Shop by category</p><div className="mt-2 grid grid-cols-2 gap-2">{categories.slice(0, 8).map((category) => <Link key={category.id} href={`/categories/${category.slug}`} onClick={() => setMenuOpen(false)} className="rounded-xl border border-slate-200 px-3 py-3 text-sm font-medium text-slate-700 hover:border-blue-200 hover:bg-blue-50">{category.name}</Link>)}</div></div><div className="border-t border-slate-200 p-4">{isAuthenticated ? <button type="button" onClick={signOut} className="flex w-full items-center justify-center rounded-xl border border-red-200 px-4 py-3 text-sm font-bold text-red-600">{t('signOut')}</button> : <Link href="/auth/register" onClick={() => setMenuOpen(false)} className="flex w-full items-center justify-center rounded-xl bg-[#0066CC] px-4 py-3 text-sm font-bold text-white">Create an account</Link>}</div></aside></div>}
    </header>
  );
}

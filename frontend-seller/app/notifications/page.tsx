'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { notificationService, type MarketplaceNotification } from '@/services/notification-service';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { useLanguage } from '@/contexts/LanguageContext';
import { localizedSellerNotification } from '@/services/notification-copy';

export default function SellerNotificationsPage() {
  const { isAuthenticated, loading } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const [items, setItems] = useState<MarketplaceNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [busy, setBusy] = useState(true);

  useLiveRefresh(() => load(true), isAuthenticated, 10000);

  useEffect(() => {
    if (!loading && !isAuthenticated) router.push('/auth/login?redirect=/notifications');
  }, [loading, isAuthenticated, router]);

  const load = async (silent = false) => {
    try {
      if (!silent) setBusy(true);
      const result = await notificationService.list({ per_page: 100 });
      setItems(result.notifications || []);
      setUnread(result.unread_count || 0);
    } finally {
      if (!silent) setBusy(false);
    }
  };

  useEffect(() => { if (isAuthenticated) void load(); }, [isAuthenticated]);

  const open = async (item: MarketplaceNotification) => {
    if (!item.read_at) {
      await notificationService.markRead(item.id);
      setItems((current) => current.map((row) => row.id === item.id ? { ...row, read_at: new Date().toISOString() } : row));
      setUnread((count) => Math.max(0, count - 1));
    }
    if (item.url) router.push(item.url);
  };

  const markAll = async () => {
    await notificationService.markAllRead();
    setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at || new Date().toISOString() })));
    setUnread(0);
  };

  if (loading || !isAuthenticated) return <main className="max-w-4xl mx-auto p-8">{t('notifications.loading')}</main>;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 pb-20 lg:pb-0">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 max-w-4xl mx-auto w-full px-3 py-5 sm:px-4 sm:py-10">
          <div className="mb-5 flex flex-col gap-2 sm:mb-6 sm:flex-row sm:items-center sm:justify-between sm:gap-4"><div><h1 className="text-2xl font-bold">{t('notifications.title')}</h1><p className="mt-1 text-sm text-gray-500">{t(unread === 1 ? 'notifications.unread' : 'notifications.unreadPlural', { count: unread })}</p></div>{unread > 0 ? <button type="button" onClick={() => void markAll()} className="self-start text-sm font-semibold text-[#0066CC]">{t('notifications.markAllRead')}</button> : null}</div>
          {busy ? <p className="text-gray-500">{t('common.loading')}</p> : items.length === 0 ? <div className="rounded-xl border p-10 text-center text-gray-500">{t('notifications.empty')}</div> : <div className="space-y-3">{items.map((item) => { const copy = localizedSellerNotification(item, t); return <button key={item.id} type="button" onClick={() => void open(item)} className={`w-full text-left rounded-xl border p-4 transition ${item.read_at ? 'bg-white border-gray-200' : 'bg-blue-50 border-blue-200'}`}><div className="flex items-start gap-3"><span className={`mt-1 h-2.5 w-2.5 rounded-full ${item.read_at ? 'bg-gray-300' : 'bg-blue-600'}`} /><div className="min-w-0 flex-1"><p className="font-semibold text-gray-900">{copy.title}</p><p className="text-sm text-gray-600 mt-1">{copy.message}</p><p className="text-xs text-gray-400 mt-2">{item.created_at ? new Date(item.created_at).toLocaleString(language === 'it' ? 'it-IT' : 'en-US') : ''}</p></div></div></button>; })}</div>}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}

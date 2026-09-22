'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { notificationService, type MarketplaceNotification } from '@/services/notification-service';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';

export default function BuyerNotificationsPage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<MarketplaceNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [busy, setBusy] = useState(true);

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

  useLiveRefresh(() => load(true), isAuthenticated, 10000);

  useEffect(() => {
    if (!loading && !isAuthenticated) router.push('/auth/login?redirect=/notifications');
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) void load();
  }, [isAuthenticated]);

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

  if (loading || !isAuthenticated) return <main className="mx-auto max-w-4xl p-8">Loading notifications...</main>;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold">Notifications</h1><p className="mt-1 text-sm text-gray-500">{unread} unread notification{unread === 1 ? '' : 's'}</p></div>
        {unread > 0 && <button type="button" onClick={() => void markAll()} className="text-sm text-[#0066CC]">Mark all as read</button>}
      </div>
      {busy ? <p className="text-gray-500">Loading...</p> : items.length === 0 ? <div className="rounded-xl border p-10 text-center text-gray-500">You have no notifications.</div> : (
        <div className="space-y-3">
          {items.map((item) => {
            const needsDeliveryCode = item.type === 'order.delivery_code_requested';
            return (
              <button key={item.id} type="button" onClick={() => void open(item)} className={`w-full rounded-xl border p-4 text-left transition ${item.read_at ? 'border-gray-200 bg-white' : 'border-blue-200 bg-blue-50'}`}>
                <div className="flex items-start gap-3">
                  <span className={`mt-1 h-2.5 w-2.5 rounded-full ${item.read_at ? 'bg-gray-300' : 'bg-blue-600'}`} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900">{item.title}</p>
                    <p className="mt-1 text-sm text-gray-600">{item.message}</p>
                    {needsDeliveryCode && <p className="mt-3 text-sm font-semibold text-[#0066CC]">Share Code / Open Chat →</p>}
                    <p className="mt-2 text-xs text-gray-400">{item.created_at ? new Date(item.created_at).toLocaleString() : ''}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </main>
  );
}

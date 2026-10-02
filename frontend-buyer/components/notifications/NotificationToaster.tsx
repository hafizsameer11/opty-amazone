'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/components/ui/Toast';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { notificationService, type MarketplaceNotification } from '@/services/notification-service';
import {
  createSeenStore,
  isStickyNotification,
  localizedNotification,
  notificationToastType,
  previewSnippet,
} from '@/services/notification-toast';

/** Pop-ups stay long enough to read, then get out of the way. */
const TOAST_DURATION = 4000;

const POLL_INTERVAL = 10000;

/**
 * Surfaces incoming notifications as pop-ups.
 *
 * The notification feed is only ever polled on the server, so this is what makes
 * messages, order updates and other events visible without visiting the
 * notifications page.
 */
export default function NotificationToaster() {
  const { user, isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const { showToast } = useToast();
  const router = useRouter();

  const seen = useRef(createSeenStore(user?.id));
  // The first successful poll primes the store so a seller returning to an
  // already-full inbox is not buried under a burst of old pop-ups.
  const primed = useRef(false);

  useEffect(() => {
    seen.current = createSeenStore(user?.id);
    primed.current = false;
  }, [user?.id]);

  const present = useCallback((item: MarketplaceNotification) => {
    const copy = localizedNotification(item, t);
    const sticky = isStickyNotification(item.type);
    const time = item.created_at
      ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';
    const message = previewSnippet(copy.message);

    showToast(
      notificationToastType(item.type),
      time ? `${message} · ${time}` : message,
      // A sticky pop-up uses duration 0 so it never auto-dismisses.
      sticky ? 0 : TOAST_DURATION,
      {
        label: t('notifications.viewAll'),
        onClick: async () => {
          // Opening the notification is what marks it read; navigation still
          // happens if that request fails.
          try {
            await notificationService.markRead(item.id);
          } catch {
            // Ignored on purpose.
          }
          router.push(item.url || '/notifications');
        },
      },
      {
        title: copy.title,
        imageUrl:
          typeof item.context?.sender_image_url === 'string' ? item.context.sender_image_url : null,
      },
    );
  }, [router, showToast, t]);

  useLiveRefresh(async () => {
    if (!isAuthenticated) {
      primed.current = false;
      return;
    }

    const result = await notificationService.list({ per_page: 50 });
    const unread = (result.notifications || []).filter((item) => !item.read_at);

    if (!primed.current) {
      unread.forEach((item) => seen.current.add(item.id));
      primed.current = true;
      return;
    }

    unread
      .filter((item) => !seen.current.has(item.id))
      .sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')))
      .forEach((item) => {
        seen.current.add(item.id);
        present(item);
      });
  }, isAuthenticated, POLL_INTERVAL, true);

  return null;
}
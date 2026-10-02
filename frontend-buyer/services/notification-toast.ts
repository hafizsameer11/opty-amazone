import type { ToastType } from '@/components/ui/Toast';

export type NotificationLike = {
  id: string;
  type: string;
  title: string;
  message: string;
  url?: string | null;
  context?: Record<string, unknown>;
  read_at?: string | null;
  created_at?: string | null;
};

type Translate = (key: string, variables?: Record<string, string | number>) => string;

/** Longest notification preview shown in a pop-up before it is truncated. */
const PREVIEW_LIMIT = 120;

/**
 * Localises platform-generated notification copy while preserving user-entered
 * previews and names. Falls back to the API strings when no key exists, so a
 * new backend event still shows something useful.
 */
export function localizedNotification(item: NotificationLike, t: Translate) {
  const context = item.context || {};
  const variables = {
    sender: String(context.sender_name || ''),
    order: String(context.order_no || context.order_id || ''),
    preview: String(context.preview || ''),
  };

  const titleKey = `notifications.event.${item.type}.title`;
  const messageKey = `notifications.event.${item.type}.message`;
  const title = t(titleKey, variables);
  const message = t(messageKey, variables);

  return {
    title: title === titleKey ? item.title : title,
    message: message === messageKey ? item.message : message,
  };
}

/**
 * Maps an event name onto the pop-up tone that best matches it. Order and money
 * events are positive outcomes, anything unrecognised stays neutral.
 */
export function notificationToastType(type: string): ToastType {
  if (type.startsWith('order.disputed') || type.includes('failed') || type.includes('rejected')) {
    return 'error';
  }
  if (
    type.startsWith('order.') ||
    type.startsWith('wallet.') ||
    type.startsWith('referral.')
  ) {
    return 'success';
  }
  return 'info';
}

/**
 * Which notifications must stay on screen until the user acts on them.
 *
 * Both sides of the delivery-code hand-off block fulfilment: the buyer is asked
 * to share their confirmation code, and the seller is told the buyer wants a new
 * one. Either way there is nothing to see in a pop-up that vanishes after four
 * seconds, so these stay until opened or closed.
 */
export function isStickyNotification(type: string): boolean {
  return type === 'order.delivery_code_requested' || type === 'order.delivery_code_reissued';
}

/** Truncates a preview so a long chat message cannot dominate the pop-up. */
export function previewSnippet(value: string): string {
  const single = value.replace(/\s+/g, ' ').trim();
  return single.length > PREVIEW_LIMIT ? `${single.slice(0, PREVIEW_LIMIT - 1)}…` : single;
}

/**
 * Tracks which notifications have already been surfaced as pop-ups.
 *
 * The feed is polled, so without this the same unread row would re-toast on
 * every tick and on every route change. Persisting to sessionStorage keeps it
 * stable across navigation and reloads for the length of a session.
 */
const STORAGE_PREFIX = 'opti-toasted-notifications';

export function createSeenStore(userId: number | string | null | undefined) {
  const key = `${STORAGE_PREFIX}:${userId ?? 'guest'}`;
  const memory = new Set<string>();
  let restored = false;

  const restore = () => {
    if (restored) return;
    restored = true;
    try {
      const raw = window.sessionStorage.getItem(key);
      if (raw) (JSON.parse(raw) as string[]).forEach((id) => memory.add(id));
    } catch {
      // A private-mode browser may refuse storage; memory-only still prevents
      // duplicates within the mounted component.
    }
  };

  const persist = () => {
    try {
      // Bounded so a long session cannot grow the entry without limit.
      window.sessionStorage.setItem(key, JSON.stringify([...memory].slice(-300)));
    } catch {
      // Ignore storage failures; the in-memory set still guards this session.
    }
  };

  return {
    has(id: string) {
      restore();
      return memory.has(id);
    },
    add(id: string) {
      restore();
      memory.add(id);
      persist();
    },
  };
}
'use client';
import { useEffect, useRef } from 'react';

export const ADMIN_REFRESH_EVENT = 'admin:data-changed';

/** Ask every mounted admin view to refresh its own data without reloading the browser. */
export function requestAdminRefresh(detail?: { resource?: string }) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(ADMIN_REFRESH_EVENT, { detail }));
}

/**
 * Refresh an admin view while it is visible, on focus/reconnect, and after a
 * mutation made by another admin view. The callback is kept in a ref so pages
 * can safely pass callbacks that depend on filters or selected records.
 */
export function useLiveRefresh(
  refresh: () => Promise<unknown>,
  enabled = true,
  interval = 15000,
  runImmediately = false,
) {
  const latest = useRef(refresh);
  useEffect(() => { latest.current = refresh; });
  useEffect(() => {
    if (!enabled) return;
    let stopped = false;
    let running = false;
    const run = async () => {
      if (stopped || running || document.visibilityState === 'hidden') return;
      running = true;
      try { await latest.current(); } catch { /* Existing view remains available during reconnect. */ }
      finally { running = false; }
    };
    const timer = window.setInterval(run, interval);
    window.addEventListener('focus', run);
    window.addEventListener('online', run);
    window.addEventListener('pageshow', run);
    window.addEventListener(ADMIN_REFRESH_EVENT, run);
    document.addEventListener('visibilitychange', run);
    if (runImmediately) void run();
    return () => {
      stopped = true;
      clearInterval(timer);
      window.removeEventListener('focus', run);
      window.removeEventListener('online', run);
      window.removeEventListener('pageshow', run);
      window.removeEventListener(ADMIN_REFRESH_EVENT, run);
      document.removeEventListener('visibilitychange', run);
    };
  }, [enabled, interval, runImmediately]);
}

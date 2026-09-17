'use client';
import { useEffect, useRef } from 'react';

export function useLiveRefresh(refresh: () => Promise<unknown>, enabled = true, interval = 5000) {
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
    document.addEventListener('visibilitychange', run);
    return () => { stopped = true; clearInterval(timer); window.removeEventListener('focus', run); document.removeEventListener('visibilitychange', run); };
  }, [enabled, interval]);
}

'use client';
import { useEffect, useRef } from 'react';
import { WAREHOUSE_UPDATED_EVENT } from '@/services/warehouse-service';

export function useLiveRefresh(refresh: () => Promise<unknown>, enabled = true, interval = 5000, runImmediately = false) {
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
    window.addEventListener(WAREHOUSE_UPDATED_EVENT, run);
    document.addEventListener('visibilitychange', run);
    if (runImmediately) void run();
    return () => { stopped = true; clearInterval(timer); window.removeEventListener('focus', run); window.removeEventListener(WAREHOUSE_UPDATED_EVENT, run); document.removeEventListener('visibilitychange', run); };
  }, [enabled, interval, runImmediately]);
}

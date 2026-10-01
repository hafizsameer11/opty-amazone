'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/layout/BottomNav';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useAuth } from '@/contexts/AuthContext';

export default function AnnouncementShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  useEffect(() => { if (!loading && !isAuthenticated) router.replace('/auth/login'); }, [isAuthenticated, loading, router]);
  if (loading || !isAuthenticated) return <div className="grid min-h-screen place-items-center bg-slate-50 text-sm text-slate-500">Loading announcements…</div>;
  return <div className="min-h-screen bg-slate-50"><div className="flex min-h-screen"><Sidebar /><div className="flex min-w-0 flex-1 flex-col overflow-hidden"><Header /><main className="flex-1 overflow-y-auto p-4 pb-24 sm:p-6 lg:p-8"><div className="mx-auto w-full max-w-5xl">{children}</div></main></div></div><BottomNav /></div>;
}

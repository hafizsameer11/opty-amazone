'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';

export default function AdShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth(); const router = useRouter();
  useEffect(() => { if (!loading && !isAuthenticated) router.push('/auth/login'); }, [loading, isAuthenticated, router]);
  if (loading) return <p className="p-8" role="status">Loading campaigns…</p>;
  if (!isAuthenticated) return null;
  return <div className="min-h-screen bg-slate-50"><div className="flex"><Sidebar /><div className="flex-1 min-w-0"><Header /><main className="p-4 md:p-8 pb-24 max-w-7xl mx-auto">{children}</main></div></div><BottomNav /></div>;
}

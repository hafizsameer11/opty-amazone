'use client';
import { Suspense } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import CampaignList from '@/components/ads/CampaignList';
export default function AdCampaignsPage() {
  return <AdminLayout><div className="space-y-6"><div><h1 className="text-3xl font-bold text-slate-900">Boost campaigns</h1><p className="text-slate-500 mt-2">Review product advertising, reserved funds, performance and audit history.</p></div><Suspense fallback={<p>Loading campaigns…</p>}><CampaignList admin /></Suspense></div></AdminLayout>;
}

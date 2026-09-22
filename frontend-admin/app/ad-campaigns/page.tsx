'use client';
import { Suspense } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import CampaignList from '@/components/ads/CampaignList';
import { useLanguage } from '@/contexts/LanguageContext';
export default function AdCampaignsPage() {
  const { t } = useLanguage();
  return <AdminLayout><div className="space-y-6"><div><h1 className="text-3xl font-bold text-slate-900">{t('boostTitle')}</h1><p className="text-slate-500 mt-2">{t('boostDescription')}</p></div><Suspense fallback={<p>{t('loading')}</p>}><CampaignList admin /></Suspense></div></AdminLayout>;
}

'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import CampaignManager from '@/components/campaigns/CampaignManager';
import { useLanguage } from '@/contexts/LanguageContext';
export default function CampaignPage() {
 const { isAuthenticated,loading }=useAuth(); const { t } = useLanguage(); const router=useRouter();
 useEffect(()=>{if(!loading&&!isAuthenticated) router.push('/auth/login');},[loading,isAuthenticated,router]);
 if(loading||!isAuthenticated) return <p className="p-8">{t('common.loading')}</p>;
 return <div className="min-h-screen bg-gray-50 flex"><Sidebar /><div className="flex-1 min-w-0"><Header /><main className="max-w-7xl mx-auto p-6 pb-24"><CampaignManager kind="banner" /></main><BottomNav /></div></div>;
}

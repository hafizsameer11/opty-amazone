'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { StoreService } from '@/services/store-service';
import type { Store } from '@/types/store';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import Button from '@/components/ui/Button';
import Link from 'next/link';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { useLanguage } from '@/contexts/LanguageContext';

export default function StorePage() {
  const { isAuthenticated, loading, user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [store, setStore] = useState<Store | null>(null);
  const [loadingStore, setLoadingStore] = useState(true);
  const [stats, setStats] = useState({
    total_products: 0,
    total_orders: 0,
    total_followers: 0,
    total_reviews: 0,
  });

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    loadStore();
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.updated_at, user?.name, user?.email, user?.phone]);

  useLiveRefresh(async () => {
    await Promise.all([loadStore(true), loadStats()]);
  }, isAuthenticated, 30000);

  const loadStore = async (silent = false) => {
    try {
      if (!silent) setLoadingStore(true);
      const response = await StoreService.getStore();
      if (response.success && response.data?.store) {
        setStore(response.data.store);
      }
    } catch (error: any) {
      console.error('Failed to load store:', error);
      if (error.response?.status === 404 || error.response?.data?.message?.includes('not found')) {
        setTimeout(async () => {
          try {
            const retryResponse = await StoreService.getStore();
            if (retryResponse.success && retryResponse.data?.store) {
              setStore(retryResponse.data.store);
            }
          } catch (retryError) {
            console.error('Retry failed:', retryError);
          }
        }, 500);
      }
    } finally {
      if (!silent) setLoadingStore(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await StoreService.getDashboard();
      if (response.success && response.data) {
        setStats({
          total_products: response.data.total_products ?? 0,
          total_orders: response.data.total_orders ?? 0,
          total_followers: response.data.total_followers ?? 0,
          total_reviews: (response.data as any).total_reviews ?? 0,
        });
      }
    } catch (e) {
      console.error('Failed to load store stats', e);
    }
  };

  if (loading || loadingStore) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0066CC] mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto">
            <div className="py-4 sm:py-6">
              <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        {store ? (
          <>
                {/* Page Header */}
                <div className="mb-8">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2 sm:text-3xl">{t('store.title')}</h1>
                  <p className="text-gray-600">{t('store.subtitle')}</p>
                </div>

                {/* Store Header Card */}
                <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-r from-[#0066CC] to-[#0052a3] p-4 text-white shadow-lg sm:mb-8 sm:rounded-xl sm:p-8">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32"></div>
                  <div className="relative z-10">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <h2 className="break-words text-xl font-bold sm:text-2xl">{store.name}</h2>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            store.status === 'active' ? 'bg-green-500' : 
                            store.status === 'pending' ? 'bg-yellow-500' : 
                            'bg-gray-500'
                          }`}>
                           {store.status === 'active' ? t('store.active') : store.status === 'pending' ? t('orders.pending') : store.status}
                          </span>
                        </div>
                        {store.description && (
                          <p className="text-blue-100 mb-4 max-w-2xl text-sm">{store.description}</p>
                        )}
                        <div className="flex flex-wrap gap-6 text-sm">
                          {store.email && (
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              <span>{store.email}</span>
                            </div>
                          )}
                          {store.phone && (
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              <span>{store.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <Link href="/store/edit" className="w-full sm:w-auto">
                        <Button className="w-full bg-[#0066CC] text-white hover:bg-[#0052a3] font-semibold shadow-lg sm:w-auto">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                           {t('store.edit')}
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Quick Actions Grid */}
                <div className="grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-3 mb-7 sm:mb-8">
                  <Link href="/store/edit" className="group bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 p-6 border border-gray-200 hover:border-[#0066CC]">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <svg className="w-5 h-5 text-gray-400 group-hover:text-[#0066CC] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-lg text-gray-900 mb-2 group-hover:text-[#0066CC] transition-colors">
                       {t('store.profile')}
                    </h3>
                     <p className="text-sm text-gray-600">{t('store.profileDescription')}</p>
                  </Link>

                  <Link href="/store/settings" className="group bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 p-6 border border-gray-200 hover:border-purple-500">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 rounded-lg bg-purple-50 text-purple-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <svg className="w-5 h-5 text-gray-400 group-hover:text-purple-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-lg text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">
                       {t('store.settings')}
                    </h3>
                     <p className="text-sm text-gray-600">{t('store.settingsDescription')}</p>
                  </Link>

                  <Link href="/store/social-links" className="group bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 p-6 border border-gray-200 hover:border-green-500">
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 rounded-lg bg-green-50 text-green-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                      </div>
                      <svg className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-lg text-gray-900 mb-2 group-hover:text-green-600 transition-colors">
                       {t('store.socialLinks')}
                    </h3>
                     <p className="text-sm text-gray-600">{t('store.socialLinksDescription')}</p>
                  </Link>
                </div>

                {/* Stats Cards */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
                   <h3 className="text-lg font-semibold text-gray-900 mb-6">{t('store.statistics')}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-5 text-center border border-blue-200">
                      <div className="text-2xl font-bold text-blue-600 mb-1">{stats.total_products}</div>
                       <div className="text-sm font-medium text-gray-700">{t('store.products')}</div>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-5 text-center border border-green-200">
                      <div className="text-2xl font-bold text-green-600 mb-1">{stats.total_orders}</div>
                       <div className="text-sm font-medium text-gray-700">{t('store.orders')}</div>
                    </div>
                    <Link href="/profile?tab=followers" className="block rounded-lg focus:outline-none focus:ring-4 focus:ring-purple-200">
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-5 text-center border border-purple-200 transition hover:border-purple-400 hover:shadow-sm">
                      <div className="text-2xl font-bold text-purple-600 mb-1">{stats.total_followers}</div>
                       <div className="text-sm font-medium text-gray-700">{t('store.followers')} <span className="text-xs text-purple-600">{t('store.viewList')}</span></div>
                    </div>
                    </Link>
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-5 text-center border border-orange-200">
                      <div className="text-2xl font-bold text-orange-600 mb-1">{stats.total_reviews}</div>
                       <div className="text-sm font-medium text-gray-700">{t('store.reviews')}</div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <div className="inline-flex p-4 rounded-full bg-gray-100 mb-6">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                 <h3 className="text-xl font-bold text-gray-900 mb-2">{t('store.noStore')}</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                   {t('store.createPrompt')}
                </p>
                <Button className="bg-[#0066CC] hover:bg-[#0052a3] text-white font-semibold">
                   {t('store.create')}
                </Button>
              </div>
            )}
              </div>
            </div>
          </main>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import { StoreService } from '@/services/store-service';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Link from 'next/link';
import { inventoryService, type LowStockResponse } from '@/services/inventory-service';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { useLanguage } from '@/contexts/LanguageContext';

interface DashboardData {
  total_products: number;
  total_orders: number;
  pending_orders: number;
  paid_orders: number;
  total_followers: number;
  total_revenue: number;
  recent_orders: Array<{
    id: number;
    order_no: string;
    customer_name: string;
    status: string;
    total: number;
    created_at: string;
    items_count: number;
  }>;
  statistics: {
    products: { current: number; last: number; change: number };
    orders: { current: number; last: number; change: number };
    followers: { current: number; last: number; change: number };
    revenue: { current: number; last: number; change: number };
  };
}

export default function SellerDashboardPage() {
  const { isAuthenticated, loading, user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [lowStock, setLowStock] = useState<LowStockResponse | null>(null);
  const [showStoreSetup, setShowStoreSetup] = useState(false);
  const [storeSetupDismissed, setStoreSetupDismissed] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadDashboard();
    }
  }, [isAuthenticated]);

  useLiveRefresh(() => loadDashboard(true), isAuthenticated, 15000);

  const loadDashboard = async (silent = false) => {
    try {
      if (!silent) setLoadingData(true);
      const response = await StoreService.getDashboard();
      if (response.success && response.data) {
        setDashboardData(response.data);
      }
      const low = await inventoryService.getLowStock();
      setLowStock(low);
      const storeResponse = await StoreService.getStore();
      const nextStore = storeResponse.data?.store ?? null;
      setShowStoreSetup(!storeSetupDismissed && nextStore?.onboarding_status === 'approved' && !nextStore.store_setup_completed_at);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      if (!silent) setLoadingData(false);
    }
  };

  if (loading || loadingData) {
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
      out_for_delivery: 'bg-purple-100 text-purple-800',
      delivered: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 pb-20 lg:pb-0">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto px-3 py-4 sm:px-4 sm:py-8 w-full">
          {showStoreSetup && (
            <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="store-setup-title">
              <div className="w-full max-w-lg rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-100 text-2xl text-cyan-700">✦</div>
                <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-cyan-700">{t('dashboard.approved')}</p>
                <h2 id="store-setup-title" className="mt-2 text-2xl font-bold text-slate-950">{t('dashboard.completeStoreProfile')}</h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">{t('dashboard.setupDescription')}</p>
                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button type="button" onClick={() => { setStoreSetupDismissed(true); setShowStoreSetup(false); }} className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-500 hover:bg-slate-50">{t('dashboard.doLater')}</button>
                  <button type="button" onClick={() => router.push('/store/edit?setup=1')} className="rounded-xl bg-[#0066CC] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#0052a3]">{t('dashboard.completeStoreProfile')}</button>
                </div>
              </div>
            </div>
          )}
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {t('dashboard.welcome', { name: user?.name?.split(' ')[0] || t('nav.seller') })}
            </h1>
            <p className="text-gray-600">{t('dashboard.today')}</p>
          </div>

          {lowStock && lowStock.count > 0 && (
            <div className="mb-8 bg-amber-50 border border-amber-200 rounded-xl p-5">
              <div className="flex items-center justify-between gap-4 mb-3">
                <h2 className="text-lg font-semibold text-amber-900">{t('dashboard.lowStock')}</h2>
                <Link href="/products" className="text-sm font-medium text-[#0066CC] hover:underline">
                  {t('dashboard.viewProducts')}
                </Link>
              </div>
              <p className="text-sm text-amber-800 mb-3">
                {t(lowStock.count === 1 ? 'dashboard.lowStockCount' : 'dashboard.lowStockCountPlural', { count: lowStock.count, threshold: lowStock.threshold })}
              </p>
              <ul className="text-sm space-y-1">
                {lowStock.products.slice(0, 5).map((p) => (
                  <li key={p.id} className="flex justify-between text-gray-800">
                    <span>{p.name}</span>
                    <span className="font-medium">{t('dashboard.left', { count: p.stock_quantity })}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4 mb-7 sm:mb-8">
            {/* Total Products */}
            <Link
              href="/products"
              className="group"
            >
              <Card hover className="relative overflow-hidden animate-fade-in">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-100/50 to-blue-200/30 rounded-full -mr-16 -mt-16"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-md group-hover:scale-110 transition-transform duration-200">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-sm font-medium text-gray-600 mb-1">{t('dashboard.totalProducts')}</h3>
                  <p className="text-3xl font-bold text-gray-900 mb-2">
                    {dashboardData?.total_products || 0}
                  </p>
                  {dashboardData?.statistics.products && (
                    <p className={`text-sm font-semibold flex items-center gap-1 ${
                      dashboardData.statistics.products.change >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {dashboardData.statistics.products.change >= 0 ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                        </svg>
                      )}
                      {formatChange(dashboardData.statistics.products.change)} {t('dashboard.vsLastMonth')}
                    </p>
                  )}
                </div>
              </Card>
            </Link>

            {/* Total Orders */}
            <Link
              href="/orders"
              className="group"
            >
              <Card hover className="relative overflow-hidden animate-fade-in" style={{ animationDelay: '0.1s' }}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-100/50 to-green-200/30 rounded-full -mr-16 -mt-16"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-green-600 shadow-md group-hover:scale-110 transition-transform duration-200">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-sm font-medium text-gray-600 mb-1">{t('dashboard.totalOrders')}</h3>
                  <p className="text-3xl font-bold text-gray-900 mb-2">
                    {dashboardData?.total_orders || 0}
                  </p>
                  {dashboardData?.statistics.orders && (
                    <p className={`text-sm font-semibold flex items-center gap-1 ${
                      dashboardData.statistics.orders.change >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {dashboardData.statistics.orders.change >= 0 ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                        </svg>
                      )}
                      {formatChange(dashboardData.statistics.orders.change)} {t('dashboard.vsLastMonth')}
                    </p>
                  )}
                </div>
              </Card>
            </Link>

            {/* Followers */}
            <Link
              href="/profile?tab=followers"
              className="group"
            >
              <Card hover className="relative overflow-hidden animate-fade-in" style={{ animationDelay: '0.2s' }}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-100/50 to-purple-200/30 rounded-full -mr-16 -mt-16"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-md group-hover:scale-110 transition-transform duration-200">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-sm font-medium text-gray-600 mb-1">{t('dashboard.followers')}</h3>
                  <p className="text-3xl font-bold text-gray-900 mb-2">
                    {dashboardData?.total_followers || 0}
                  </p>
                  {dashboardData?.statistics.followers && (
                    <p className={`text-sm font-semibold flex items-center gap-1 ${
                      dashboardData.statistics.followers.change >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {dashboardData.statistics.followers.change >= 0 ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                        </svg>
                      )}
                      {formatChange(dashboardData.statistics.followers.change)} {t('dashboard.vsLastMonth')}
                    </p>
                  )}
                </div>
              </Card>
            </Link>

            {/* Revenue */}
            <Card className="relative overflow-hidden animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-100/50 to-orange-200/30 rounded-full -mr-16 -mt-16"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-md">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">{t('dashboard.revenue')}</h3>
                <p className="text-3xl font-bold text-gray-900 mb-2">
                  {formatCurrency(dashboardData?.total_revenue || 0)}
                </p>
                {dashboardData?.statistics.revenue && (
                  <p className={`text-sm font-semibold flex items-center gap-1 ${
                    dashboardData.statistics.revenue.change >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {dashboardData.statistics.revenue.change >= 0 ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                      </svg>
                    )}
                    {formatChange(dashboardData.statistics.revenue.change)} {t('dashboard.vsLastMonth')}
                  </p>
                )}
              </div>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{t('dashboard.quickActions')}</h2>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              <Link href="/store" className="group">
                <Card hover className="animate-fade-in">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-md group-hover:scale-110 transition-transform duration-200">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1">{t('dashboard.manageStore')}</h3>
                  <p className="text-sm text-gray-600 mb-2">{t('dashboard.manageStoreHint')}</p>
                  <span className="text-sm text-[#0066CC] font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
                    {t('dashboard.getStarted')}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </Card>
              </Link>

              <Link href="/products/new" className="group">
                <Card hover className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-green-600 shadow-md group-hover:scale-110 transition-transform duration-200">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1">{t('dashboard.addProducts')}</h3>
                  <p className="text-sm text-gray-600 mb-2">{t('dashboard.addProductsHint')}</p>
                  <span className="text-sm text-[#0066CC] font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
                    {t('dashboard.getStarted')}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </Card>
              </Link>

              <Link href="/orders" className="group">
                <Card hover className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-md group-hover:scale-110 transition-transform duration-200">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1">{t('dashboard.viewOrders')}</h3>
                  <p className="text-sm text-gray-600 mb-2">{t('dashboard.viewOrdersHint')}</p>
                  <span className="text-sm text-[#0066CC] font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
                    {t('dashboard.getStarted')}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </Card>
              </Link>

              <Link href="/promotions" className="group">
                <Card hover className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-md group-hover:scale-110 transition-transform duration-200">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1">{t('nav.analytics')}</h3>
                  <p className="text-sm text-gray-600 mb-2">{t('dashboard.analyticsHint')}</p>
                  <span className="text-sm text-[#0066CC] font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
                    {t('dashboard.getStarted')}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </Card>
              </Link>
            </div>
          </div>

          {/* Recent Orders */}
          {dashboardData?.recent_orders && dashboardData.recent_orders.length > 0 && (
            <Card>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">{t('dashboard.recentOrders')}</h2>
                <Link href="/orders" className="text-sm font-semibold text-[#0066CC] hover:text-[#0052A3] flex items-center gap-1 transition-colors">
                  {t('dashboard.viewAll')}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
              <div className="space-y-3">
                {dashboardData.recent_orders.map((order, index) => (
                  <Link
                    key={order.id}
                    href={`/orders/${order.id}`}
                    className="block p-4 border-2 border-gray-200 rounded-xl hover:border-[#0066CC] hover:bg-gray-50 transition-all duration-200 animate-fade-in"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-gray-900">{t('dashboard.orderNumber', { number: order.order_no })}</p>
                        <p className="text-sm text-gray-600 mt-1">{order.customer_name}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(order.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant={
                            order.status === 'pending'
                              ? 'warning'
                              : order.status === 'paid'
                              ? 'success'
                              : order.status === 'delivered'
                              ? 'default'
                              : 'info'
                          }
                          size="sm"
                          className="mb-2"
                        >
                          {order.status.replace('_', ' ')}
                        </Badge>
                        <p className="text-base font-bold text-[#0066CC]">
                          {formatCurrency(order.total)}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </Card>
          )}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import { StoreService } from '@/services/store-service';

export default function AnalyticsPage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadAnalytics();
    }
  }, [isAuthenticated]);

  const loadAnalytics = async () => {
    try {
      setLoadingData(true);
      const response = await StoreService.getDashboard();
      if (response.success && response.data) {
        setDashboardData(response.data);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoadingData(false);
    }
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0066CC] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto">
            <div className="py-6">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-8">
                  <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
                  <p className="text-gray-600 mt-1">View detailed store performance metrics</p>
                </div>

                {/* Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 rounded-lg bg-blue-50">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                    </div>
                    <h3 className="text-sm font-medium text-gray-600 mb-1">Total Products</h3>
                    <p className="text-3xl font-bold text-gray-900">
                      {dashboardData?.total_products || 0}
                    </p>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 rounded-lg bg-green-50">
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                      </div>
                    </div>
                    <h3 className="text-sm font-medium text-gray-600 mb-1">Total Orders</h3>
                    <p className="text-3xl font-bold text-gray-900">
                      {dashboardData?.total_orders || 0}
                    </p>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 rounded-lg bg-purple-50">
                        <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                    </div>
                    <h3 className="text-sm font-medium text-gray-600 mb-1">Followers</h3>
                    <p className="text-3xl font-bold text-gray-900">
                      {dashboardData?.total_followers || 0}
                    </p>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 rounded-lg bg-orange-50">
                        <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                    <h3 className="text-sm font-medium text-gray-600 mb-1">Total Revenue</h3>
                    <p className="text-3xl font-bold text-gray-900">
                      {formatCurrency(dashboardData?.total_revenue || 0)}
                    </p>
                  </div>
                </div>

                {/* Statistics */}
                {dashboardData?.statistics && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                      <h2 className="text-xl font-bold text-gray-900 mb-4">Monthly Trends</h2>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">Products</span>
                            <span className={`text-sm font-semibold ${
                              dashboardData.statistics.products.change >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {dashboardData.statistics.products.change >= 0 ? '+' : ''}
                              {dashboardData.statistics.products.change.toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex gap-2 text-xs text-gray-500">
                            <span>This month: {dashboardData.statistics.products.current}</span>
                            <span>•</span>
                            <span>Last month: {dashboardData.statistics.products.last}</span>
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">Orders</span>
                            <span className={`text-sm font-semibold ${
                              dashboardData.statistics.orders.change >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {dashboardData.statistics.orders.change >= 0 ? '+' : ''}
                              {dashboardData.statistics.orders.change.toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex gap-2 text-xs text-gray-500">
                            <span>This month: {dashboardData.statistics.orders.current}</span>
                            <span>•</span>
                            <span>Last month: {dashboardData.statistics.orders.last}</span>
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">Followers</span>
                            <span className={`text-sm font-semibold ${
                              dashboardData.statistics.followers.change >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {dashboardData.statistics.followers.change >= 0 ? '+' : ''}
                              {dashboardData.statistics.followers.change.toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex gap-2 text-xs text-gray-500">
                            <span>This month: {dashboardData.statistics.followers.current}</span>
                            <span>•</span>
                            <span>Last month: {dashboardData.statistics.followers.last}</span>
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">Revenue</span>
                            <span className={`text-sm font-semibold ${
                              dashboardData.statistics.revenue.change >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {dashboardData.statistics.revenue.change >= 0 ? '+' : ''}
                              {dashboardData.statistics.revenue.change.toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex gap-2 text-xs text-gray-500">
                            <span>This month: {formatCurrency(dashboardData.statistics.revenue.current)}</span>
                            <span>•</span>
                            <span>Last month: {formatCurrency(dashboardData.statistics.revenue.last)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                      <h2 className="text-xl font-bold text-gray-900 mb-4">Order Status Breakdown</h2>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Pending Orders</span>
                          <span className="text-lg font-bold text-yellow-600">
                            {dashboardData?.pending_orders || 0}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Paid Orders</span>
                          <span className="text-lg font-bold text-green-600">
                            {dashboardData?.paid_orders || 0}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Total Orders</span>
                          <span className="text-lg font-bold text-gray-900">
                            {dashboardData?.total_orders || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Recent Activity */}
                {dashboardData?.recent_orders && dashboardData.recent_orders.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Orders</h2>
                    <div className="space-y-3">
                      {dashboardData.recent_orders.slice(0, 5).map((order: any) => (
                        <div key={order.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                          <div>
                            <p className="font-medium text-gray-900">Order #{order.order_no}</p>
                            <p className="text-sm text-gray-500">{order.customer_name}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-[#0066CC]">{formatCurrency(order.total)}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(order.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
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


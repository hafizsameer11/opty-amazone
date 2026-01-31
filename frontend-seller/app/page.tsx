'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { StoreService } from '@/services/store-service';

export default function HomePage() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [storeStats, setStoreStats] = useState({
    products: 0,
    orders: 0,
    followers: 0,
    revenue: 0,
  });

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadStats();
    }
  }, [isAuthenticated]);

  const loadStats = async () => {
    try {
      const response = await StoreService.getStatistics();
      if (response.success && response.data?.statistics) {
        const stats = response.data.statistics;
        setStoreStats({
          products: stats.total_products || 0,
          orders: stats.total_orders || 0,
          followers: stats.total_followers || 0,
          revenue: stats.total_revenue || 0,
        });
      }
    } catch (error) {
      // Stats will default to 0
    }
  };

  if (loading) {
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

  const stats = [
    {
      name: 'Total Products',
      value: storeStats.products,
      change: '+12%',
      changeType: 'positive',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      color: 'from-blue-500 to-cyan-500',
    },
    {
      name: 'Total Orders',
      value: storeStats.orders,
      change: '+8%',
      changeType: 'positive',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      ),
      color: 'from-green-500 to-emerald-500',
    },
    {
      name: 'Followers',
      value: storeStats.followers,
      change: '+24%',
      changeType: 'positive',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      color: 'from-purple-500 to-pink-500',
    },
    {
      name: 'Revenue',
      value: `$${storeStats.revenue.toLocaleString()}`,
      change: '+18%',
      changeType: 'positive',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'from-orange-500 to-red-500',
    },
  ];

  const quickActions = [
    {
      title: 'Manage Store',
      description: 'Update your store profile and settings',
      href: '/store',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      color: 'bg-blue-50 text-blue-600',
    },
    {
      title: 'Add Products',
      description: 'Create and manage your product listings',
      href: '/products',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      ),
      color: 'bg-green-50 text-green-600',
    },
    {
      title: 'View Orders',
      description: 'Track and manage customer orders',
      href: '/orders',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      color: 'bg-purple-50 text-purple-600',
    },
    {
      title: 'Analytics',
      description: 'View detailed store performance metrics',
      href: '/analytics',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      color: 'bg-orange-50 text-orange-600',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />

          {/* Main Content Area */}
          <main className="flex-1 overflow-y-auto">
            <div className="py-6">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Welcome Section */}
                <div className="mb-8">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Welcome back, {user?.name?.split(' ')[0] || 'Seller'}! 👋
                  </h1>
                  <p className="text-gray-600">Here's what's happening with your store today.</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
                  {stats.map((stat, index) => (
                    <div
                      key={index}
                      className="relative bg-white overflow-hidden rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
                    >
                      <div className="p-5">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-600 mb-1">{stat.name}</p>
                            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                            <div className="mt-2 flex items-center">
                              <span className={`text-xs font-semibold ${
                                stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {stat.change}
                              </span>
                              <span className="text-xs text-gray-500 ml-1">vs last month</span>
                            </div>
                          </div>
                          <div className={`p-3 rounded-lg bg-gradient-to-br ${stat.color} bg-opacity-10`}>
                            <div className={`text-gray-700`}>
                              {stat.icon}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${stat.color}`}></div>
                    </div>
                  ))}
                </div>

                {/* Quick Actions */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
                    <Link href="/store" className="text-sm text-[#0066CC] hover:text-[#0052a3] font-medium">
                      View all →
                    </Link>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {quickActions.map((action, index) => (
                      <Link
                        key={index}
                        href={action.href}
                        className="group bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-[#0066CC] transition-all p-6"
                      >
                        <div className={`inline-flex p-3 rounded-lg ${action.color} mb-4`}>
                          {action.icon}
                        </div>
                        <h3 className="text-base font-semibold text-gray-900 mb-1 group-hover:text-[#0066CC] transition-colors">
                          {action.title}
                        </h3>
                        <p className="text-sm text-gray-600">{action.description}</p>
                        <div className="mt-4 flex items-center text-sm font-medium text-[#0066CC] group-hover:gap-2 transition-all">
                          Get started
                          <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Recent Activity & Performance */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Recent Orders */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="p-6 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">Recent Orders</h3>
                        <Link href="/orders" className="text-sm text-[#0066CC] hover:text-[#0052a3] font-medium">
                          View all
                        </Link>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="text-center py-12">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No orders yet</h3>
                        <p className="mt-1 text-sm text-gray-500">Get started by adding products to your store.</p>
                        <div className="mt-6">
                          <Link
                            href="/products"
                            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#0066CC] hover:bg-[#0052a3]"
                          >
                            Add Products
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Store Performance */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="p-6 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900">Store Performance</h3>
                    </div>
                    <div className="p-6">
                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">Store Completion</span>
                            <span className="text-sm font-semibold text-gray-900">0%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-gradient-to-r from-[#0066CC] to-[#00CC66] h-2 rounded-full" style={{ width: '0%' }}></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">Profile Views</span>
                            <span className="text-sm font-semibold text-gray-900">0</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full" style={{ width: '0%' }}></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">Product Clicks</span>
                            <span className="text-sm font-semibold text-gray-900">0</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full" style={{ width: '0%' }}></div>
                          </div>
                        </div>
                      </div>
                      <div className="mt-6 pt-6 border-t border-gray-200">
                        <Link
                          href="/store"
                          className="block text-center w-full px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Complete Store Setup
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

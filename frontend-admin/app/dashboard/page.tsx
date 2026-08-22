'use client';

import { useEffect, useState, useCallback } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import GlassCard from '@/components/ui/GlassCard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Button from '@/components/ui/Button';
import { adminService, type DashboardStats } from '@/services/admin-service';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const data = await adminService.getDashboard();
      setStats(data);
    } catch {
      setLoadError('Could not load dashboard statistics. Check your connection and API configuration.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner size="lg" />
        </div>
      </AdminLayout>
    );
  }

  if (loadError) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Dashboard</h1>
          </div>
          <GlassCard>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 py-6">
              <p className="text-slate-600 flex-1">{loadError}</p>
              <Button variant="outline" onClick={() => void loadDashboard()}>
                Retry
              </Button>
            </div>
          </GlassCard>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Dashboard</h1>
          <p className="text-slate-500">Welcome to the admin panel</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <GlassCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">Total Users</p>
                <p className="text-3xl font-bold text-slate-900">{stats?.total_users || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-primary/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">Total Sellers</p>
                <p className="text-3xl font-bold text-slate-900">{stats?.total_sellers || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-success/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">Total Products</p>
                <p className="text-3xl font-bold text-slate-900">{stats?.total_products || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-warning/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">Total Revenue</p>
                <p className="text-3xl font-bold text-slate-900">€{stats?.total_revenue?.toFixed(2) || '0.00'}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-success/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </GlassCard>
        </div>

        <GlassCard>
          <h2 className="text-xl font-bold text-slate-900 mb-4">Recent Orders</h2>
          {stats?.recent_orders && stats.recent_orders.length > 0 ? (
            <div className="space-y-3">
              {stats.recent_orders.map((order: { id: number; order_no?: string; customer_name?: string; total?: number; created_at?: string }) => (
                <div key={order.id} className="glass rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">Order #{order.order_no}</p>
                    <p className="text-sm text-slate-500">{order.customer_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900">€{order.total != null ? Number(order.total).toFixed(2) : '0.00'}</p>
                    <p className="text-xs text-slate-500">{order.created_at ? new Date(order.created_at).toLocaleDateString() : ''}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-center py-8">No recent orders</p>
          )}
        </GlassCard>
      </div>
    </AdminLayout>
  );
}

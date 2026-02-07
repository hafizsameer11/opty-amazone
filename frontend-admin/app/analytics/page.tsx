'use client';

import { useEffect, useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import GlassCard from '@/components/ui/GlassCard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { adminService } from '@/services/admin-service';

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const data = await adminService.getAnalytics();
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner size="lg" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Analytics</h1>
          <p className="text-white/70">Platform analytics and insights</p>
        </div>

        <GlassCard>
          <h2 className="text-xl font-bold text-white mb-4">Revenue Analytics</h2>
          <p className="text-white/70">Analytics data will be displayed here with charts</p>
        </GlassCard>

        <GlassCard>
          <h2 className="text-xl font-bold text-white mb-4">User Growth</h2>
          <p className="text-white/70">User growth charts will be displayed here</p>
        </GlassCard>

        <GlassCard>
          <h2 className="text-xl font-bold text-white mb-4">Top Products</h2>
          {analytics?.top_products && analytics.top_products.length > 0 ? (
            <div className="space-y-3">
              {analytics.top_products.map((product: any) => (
                <div key={product.id} className="glass rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-white">{product.name}</p>
                    <p className="text-sm text-white/70">{product.store?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-semibold">{product.view_count || 0} views</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-white/70 text-center py-8">No product data available</p>
          )}
        </GlassCard>
      </div>
    </AdminLayout>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import GlassCard from '@/components/ui/GlassCard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Button from '@/components/ui/Button';
import { adminService } from '@/services/admin-service';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { useLanguage } from '@/contexts/LanguageContext';

type Period = 'day' | 'week' | 'month' | 'year';
type AnalyticsRow = Record<string, unknown>;
type AnalyticsProduct = { id: number | string; name?: string; store?: { name?: string } | null; view_count?: number };
type AnalyticsPayload = { revenue?: AnalyticsRow[]; user_growth?: AnalyticsRow[]; sales_trends?: AnalyticsRow[]; top_products?: AnalyticsProduct[] };

function formatLabel(row: Record<string, unknown>, period: Period, t: (key: string) => string, locale: string): string {
  if (period === 'year' && row.year != null) return String(row.year);
  if (period === 'month' && row.month != null) {
    const month = Number(row.month);
    const year = row.year != null ? String(row.year) : '';
    const name = Number.isFinite(month)
      ? new Date(2000, month - 1, 1).toLocaleString(locale, { month: 'short' })
      : String(row.month);
    return year ? `${name} ${year}` : name;
  }
  if (period === 'week' && row.week != null) return `${t('week')} ${row.week}`;
  if (row.date != null) return String(row.date);
  return '—';
}

function BarList({
  items,
  valueKey,
  maxHint,
}: {
  items: Array<Record<string, unknown>>;
  valueKey: string;
  maxHint?: number;
}) {
  const { t } = useLanguage();
  const max = Math.max(
    maxHint || 0,
    ...items.map((i) => Number(i[valueKey] || 0)),
    1
  );

  if (items.length === 0) {
    return <p className="text-slate-500 text-center py-8">{t('noDataForPeriod')}</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((row, idx) => {
        const value = Number(row[valueKey] || 0);
        const pct = Math.max(2, Math.round((value / max) * 100));
        const label = String(row._label || row.date || row.year || `#${idx + 1}`);
        return (
          <div key={`${label}-${idx}`}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-slate-700 truncate pr-3">{label}</span>
              <span className="text-slate-900 font-semibold shrink-0">
                {valueKey === 'revenue' ? `€${value.toFixed(2)}` : value}
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full rounded-full bg-[#60a5fa]" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AnalyticsPage() {
  const { t, language } = useLanguage();
  const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('month');

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const data = await adminService.getAnalytics(period);
      setAnalytics(data);
    } catch {
      // Keep the last successful dataset visible when the API is temporarily unavailable.
    } finally {
      setLoading(false);
    }
  };

  useLiveRefresh(loadAnalytics);

  const revenueRows = useMemo(() => {
    const rows = (analytics?.revenue || []) as Array<Record<string, unknown>>;
    return rows.map((r) => ({
      ...r,
       _label: formatLabel(r, period, t, language === 'it' ? 'it-IT' : 'en-GB'),
      revenue: Number(r.revenue || 0),
    }));
  }, [analytics, period, language, t]);

  const growthRows = useMemo(() => {
    const rows = (analytics?.user_growth || []) as Array<Record<string, unknown>>;
    return rows.slice(-30).map((r) => ({
      ...r,
      _label: String(r.date || ''),
      count: Number(r.count || 0),
    }));
  }, [analytics]);

  const salesRows = useMemo(() => {
    const rows = (analytics?.sales_trends || []) as Array<Record<string, unknown>>;
    return rows.slice(-30).map((r) => ({
      ...r,
      _label: String(r.date || ''),
      count: Number(r.count || 0),
    }));
  }, [analytics]);

  const totalRevenue = revenueRows.reduce((sum, r) => sum + Number(r.revenue || 0), 0);
  const totalOrders = salesRows.reduce((sum, r) => sum + Number(r.count || 0), 0);
  const totalNewUsers = growthRows.reduce((sum, r) => sum + Number(r.count || 0), 0);

  if (loading && !analytics) {
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">{t('analytics')}</h1>
            <p className="text-slate-500">{t('analyticsDescription')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['day', 'week', 'month', 'year'] as Period[]).map((p) => (
              <Button
                key={p}
                type="button"
                variant={period === p ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setPeriod(p)}
              >
                {t(p)}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <GlassCard>
            <p className="text-slate-500 text-sm">{t('revenueForPeriod', { period: t(period) })}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">€{totalRevenue.toFixed(2)}</p>
          </GlassCard>
          <GlassCard>
            <p className="text-slate-500 text-sm">{t('paidOrdersRecent')}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalOrders}</p>
          </GlassCard>
          <GlassCard>
            <p className="text-slate-500 text-sm">{t('newUsersRecent')}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalNewUsers}</p>
          </GlassCard>
        </div>

        <GlassCard>
          <h2 className="text-xl font-bold text-slate-900 mb-4">{t('revenue')}</h2>
          {loading ? <LoadingSpinner /> : <BarList items={revenueRows} valueKey="revenue" />}
        </GlassCard>

        <GlassCard>
          <h2 className="text-xl font-bold text-slate-900 mb-4">{t('userGrowth')}</h2>
          {loading ? <LoadingSpinner /> : <BarList items={growthRows} valueKey="count" />}
        </GlassCard>

        <GlassCard>
          <h2 className="text-xl font-bold text-slate-900 mb-4">{t('salesTrends')}</h2>
          {loading ? <LoadingSpinner /> : <BarList items={salesRows} valueKey="count" />}
        </GlassCard>

        <GlassCard>
          <h2 className="text-xl font-bold text-slate-900 mb-4">{t('topProductsByViews')}</h2>
          {analytics?.top_products && analytics.top_products.length > 0 ? (
            <div className="space-y-3">
              {analytics.top_products.map((product: AnalyticsProduct) => (
                <div key={product.id} className="glass rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{product.name}</p>
                    <p className="text-sm text-slate-500">{product.store?.name}</p>
                  </div>
                  <div className="text-right">
                     <p className="text-slate-900 font-semibold">{product.view_count || 0} {t('views')}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-center py-8">{t('noProductData')}</p>
          )}
        </GlassCard>
      </div>
    </AdminLayout>
  );
}

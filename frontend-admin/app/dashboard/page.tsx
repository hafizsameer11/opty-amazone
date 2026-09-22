'use client';

import { useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import AdminLayout from '@/components/layout/AdminLayout';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { adminService, type DashboardStats } from '@/services/admin-service';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { statusKey, useLanguage } from '@/contexts/LanguageContext';

type MetricIcon = 'users' | 'store' | 'buyer' | 'product' | 'orders' | 'revenue' | 'stock' | 'alert' | 'warehouse' | 'campaign' | 'support';

const sourceColours: Record<string, string> = {
  orders: '#0875e1',
  ads: '#7c3aed',
  warehouse: '#16a5a8',
};
const statusColours = ['#0875e1', '#14a5a5', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];

const money = (value: number | null | undefined) => new Intl.NumberFormat('en-IE', {
  style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0,
}).format(Number(value || 0));
const compactMoney = (value: number) => new Intl.NumberFormat('en-IE', {
  style: 'currency', currency: 'EUR', notation: 'compact', maximumFractionDigits: 1,
}).format(Number(value || 0));
const number = (value: number | null | undefined) => new Intl.NumberFormat('en-IE').format(Number(value || 0));

export default function DashboardPage() {
  const { language, t } = useLanguage();
  const [months, setMonths] = useState(9);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadDashboard = useCallback(async (requestedMonths = months) => {
    if (!stats) setLoading(true);
    try {
      setLoadError(null);
      setStats(await adminService.getDashboard(requestedMonths));
    } catch {
      setLoadError(t('dashboardLoadFailed'));
    } finally {
      setLoading(false);
    }
  }, [months, stats, t]);

  useLiveRefresh(() => loadDashboard(), true, 15000, true);

  const revenueSources = useMemo(() => (stats?.revenue_sources ?? []).map(source => ({
    ...source,
    label: source.key === 'orders' ? t('dashboardOrderRevenue') : source.key === 'ads' ? t('dashboardAdRevenue') : t('dashboardWarehouseRevenue'),
  })), [stats?.revenue_sources, t]);
  const orderStatuses = useMemo(() => (stats?.order_statuses ?? []).map((item, index) => ({
    ...item,
    label: translatedStatus(item.status, t),
    colour: statusColours[index % statusColours.length],
  })), [stats?.order_statuses, t]);

  const selectRange = (value: number) => {
    setMonths(value);
    void loadDashboard(value);
  };

  const exportReport = () => {
    if (!stats) return;
    const rows = [
      [t('dashboardMetric'), t('dashboardValue')],
      [t('totalUsers'), number(stats.totals.total_users)],
      [t('totalSellers'), number(stats.totals.total_sellers)],
      [t('dashboardTotalBuyers'), number(stats.totals.total_buyers)],
      [t('totalProducts'), number(stats.totals.total_products)],
      [t('dashboardTotalOrders'), number(stats.totals.total_orders)],
      [t('totalRevenue'), money(stats.totals.total_revenue)],
      [t('dashboardOrderRevenue'), money(stats.totals.order_revenue)],
      [t('dashboardAdRevenue'), money(stats.totals.ad_revenue)],
      [t('dashboardWarehouseRevenue'), money(stats.totals.warehouse_revenue)],
    ];
    const blob = new Blob([rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `platform-overview-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading && !stats) {
    return <AdminLayout><div className="flex min-h-[65vh] items-center justify-center"><LoadingSpinner size="lg" className="border-primary border-t-transparent" /></div></AdminLayout>;
  }

  if (loadError && !stats) {
    return <AdminLayout><DashboardError message={loadError} onRetry={() => void loadDashboard()} retryLabel={t('retry')} /></AdminLayout>;
  }

  if (!stats) return null;

  const metrics: Array<{ label: string; value: number; change: number; icon: MetricIcon; tone: string; format?: 'money' }> = [
    { label: t('totalUsers'), value: stats.totals.total_users, change: stats.changes.users, icon: 'users', tone: 'bg-blue-50 text-[#0875e1]' },
    { label: t('totalSellers'), value: stats.totals.total_sellers, change: stats.changes.sellers, icon: 'store', tone: 'bg-violet-50 text-violet-600' },
    { label: t('dashboardTotalBuyers'), value: stats.totals.total_buyers, change: stats.changes.buyers, icon: 'buyer', tone: 'bg-cyan-50 text-cyan-600' },
    { label: t('totalProducts'), value: stats.totals.total_products, change: stats.changes.products, icon: 'product', tone: 'bg-sky-50 text-sky-600' },
    { label: t('dashboardTotalOrders'), value: stats.totals.total_orders, change: stats.changes.orders, icon: 'orders', tone: 'bg-emerald-50 text-emerald-600' },
    { label: t('totalRevenue'), value: stats.totals.total_revenue, change: stats.changes.revenue, icon: 'revenue', tone: 'bg-amber-50 text-amber-600', format: 'money' },
  ];

  return (
    <AdminLayout>
      <div className="mx-auto max-w-[1720px] space-y-4 pb-8">
        <header className="flex flex-col gap-4 px-0.5 pt-0.5 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">{t('dashboardPlatformOverview')}</h1>
            <p className="mt-1 text-sm text-slate-500">{t('dashboardPlatformSubtitle')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm">
              <DashboardIcon name="calendar" className="h-4 w-4 text-slate-500" />
              <select aria-label={t('dashboardDateRange')} value={months} onChange={event => selectRange(Number(event.target.value))} className="cursor-pointer bg-transparent pr-1 outline-none">
                <option value={6}>{t('dashboardLastSixMonths')}</option>
                <option value={9}>{t('dashboardLastNineMonths')}</option>
                <option value={12}>{t('dashboardLastTwelveMonths')}</option>
              </select>
            </label>
            <button type="button" onClick={exportReport} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#0875e1] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0668ca] focus:outline-none focus:ring-4 focus:ring-blue-100">
              <DashboardIcon name="download" className="h-4 w-4" />
              {t('dashboardExportReport')}
            </button>
          </div>
        </header>

        {loadError && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{loadError}</div>}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {metrics.map(metric => <MetricCard key={metric.label} {...metric} changeText={t('dashboardVsPreviousMonth')} />)}
        </section>

        <section className="grid gap-4 xl:grid-cols-12">
          <DashboardCard className="xl:col-span-8" title={t('dashboardRevenuePerformance')}>
            <div className="h-[285px] pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.revenue_trend} margin={{ top: 12, right: 12, left: -14, bottom: 0 }}>
                  <defs>
                    <linearGradient id="ordersRevenueFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#0875e1" stopOpacity={0.20} /><stop offset="100%" stopColor="#0875e1" stopOpacity={0.01} /></linearGradient>
                    <linearGradient id="warehouseRevenueFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#16a5a8" stopOpacity={0.16} /><stop offset="100%" stopColor="#16a5a8" stopOpacity={0.01} /></linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#e9eef5" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={9} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={compactMoney} width={54} />
                  <Tooltip contentStyle={tooltipStyle} formatter={value => money(Number(value))} />
                  <Legend wrapperStyle={{ paddingTop: 12, fontSize: 12 }} iconType="circle" />
                  <Area type="monotone" name={t('dashboardOrderRevenue')} dataKey="order_revenue" stroke="#0875e1" strokeWidth={2.5} fill="url(#ordersRevenueFill)" />
                  <Area type="monotone" name={t('dashboardAdRevenue')} dataKey="ad_revenue" stroke="#7c3aed" strokeWidth={2.25} fill="transparent" />
                  <Area type="monotone" name={t('dashboardWarehouseRevenue')} dataKey="warehouse_revenue" stroke="#16a5a8" strokeWidth={2.25} fill="url(#warehouseRevenueFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </DashboardCard>

          <DashboardCard className="xl:col-span-4" title={t('dashboardOrderStatus')}>
            <div className="grid h-[285px] grid-cols-[minmax(0,1fr)_minmax(145px,0.9fr)] items-center gap-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={orderStatuses} dataKey="count" nameKey="label" innerRadius="58%" outerRadius="84%" paddingAngle={2} stroke="none">
                    {orderStatuses.map(item => <Cell key={item.status} fill={item.colour} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={value => number(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3 pr-2">
                {orderStatuses.length ? orderStatuses.slice(0, 5).map(item => <div key={item.status} className="flex items-center gap-2 text-xs"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.colour }} /><span className="min-w-0 flex-1 truncate text-slate-600">{item.label}</span><span className="font-semibold text-slate-900">{number(item.count)}</span></div>) : <EmptyState label={t('dashboardNoOrderData')} />}
              </div>
            </div>
          </DashboardCard>
        </section>

        <section className="grid gap-4 xl:grid-cols-12">
          <DashboardCard className="xl:col-span-4" title={t('dashboardMonthlyOrdersGmv')}>
            <div className="h-[245px] pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.revenue_trend} margin={{ top: 12, right: 2, left: -15, bottom: 0 }} barGap={5}>
                  <CartesianGrid vertical={false} stroke="#edf1f6" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} dy={8} />
                  <YAxis yAxisId="orders" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} width={28} />
                  <YAxis yAxisId="gmv" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={compactMoney} width={47} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value, label) => label === t('dashboardGmv') ? money(Number(value)) : number(Number(value))} />
                  <Legend wrapperStyle={{ paddingTop: 12, fontSize: 12 }} iconType="circle" />
                  <Bar yAxisId="orders" name={t('dashboardOrders')} dataKey="orders" fill="#0875e1" radius={[4, 4, 0, 0]} maxBarSize={18} />
                  <Bar yAxisId="gmv" name={t('dashboardGmv')} dataKey="order_revenue" fill="#93c5fd" radius={[4, 4, 0, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </DashboardCard>

          <DashboardCard className="xl:col-span-4" title={t('dashboardWarehouseOverview')}>
            <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-4">
              <MiniMetric icon="stock" tone="bg-emerald-50 text-emerald-600" label={t('dashboardTotalStock')} value={number(stats.warehouse.total_stock)} />
              <MiniMetric icon="alert" tone="bg-rose-50 text-rose-500" label={t('dashboardLowStockAlert')} value={number(stats.warehouse.low_stock)} />
              <MiniMetric icon="warehouse" tone="bg-blue-50 text-[#0875e1]" label={t('warehouseOrders')} value={number(stats.warehouse.orders)} />
            </div>
            <div className="pt-4"><p className="mb-2 text-xs font-semibold text-slate-700">{t('dashboardWarehouseTrend')}</p><div className="h-[148px]"><ResponsiveContainer width="100%" height="100%"><LineChart data={stats.warehouse.trend} margin={{ top: 8, right: 6, left: -28, bottom: 0 }}><CartesianGrid vertical={false} stroke="#edf1f6" /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} dy={6} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} allowDecimals={false} /><Tooltip contentStyle={tooltipStyle} formatter={value => number(Number(value))} /><Line type="monotone" dataKey="orders" name={t('warehouseOrders')} stroke="#0875e1" strokeWidth={2.5} dot={{ r: 3, fill: '#0875e1', strokeWidth: 0 }} activeDot={{ r: 5 }} /></LineChart></ResponsiveContainer></div></div>
          </DashboardCard>

          <DashboardCard className="xl:col-span-4" title={t('dashboardRevenueSources')}>
            <div className="grid h-[245px] grid-cols-[minmax(0,1fr)_minmax(150px,0.9fr)] items-center gap-2">
              <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={revenueSources} dataKey="value" nameKey="label" innerRadius="58%" outerRadius="83%" paddingAngle={2} stroke="none">{revenueSources.map(source => <Cell key={source.key} fill={sourceColours[source.key]} />)}</Pie><Tooltip contentStyle={tooltipStyle} formatter={value => money(Number(value))} /></PieChart></ResponsiveContainer>
              <div className="space-y-4 pr-2">{revenueSources.map(source => <div key={source.key} className="flex items-start gap-2 text-xs"><span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: sourceColours[source.key] }} /><div className="min-w-0 flex-1"><p className="truncate text-slate-600">{source.label}</p><p className="mt-0.5 font-bold text-slate-900">{money(source.value)}</p></div></div>)}</div>
            </div>
          </DashboardCard>
        </section>

        <section className="grid gap-4 xl:grid-cols-12">
          <DashboardCard className="xl:col-span-5" title={t('bestSellingProducts')} actionLabel={t('dashboardProducts')}>
            {stats.best_selling_products.length ? <div className="overflow-x-auto"><table className="w-full min-w-[590px] text-left"><thead><tr className="border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wide text-slate-400"><th className="px-0 py-2">#</th><th className="py-2">{t('product')}</th><th className="py-2">{t('dashboardSellerStore')}</th><th className="py-2 text-right">{t('dashboardUnitsSold')}</th><th className="py-2 text-right">{t('revenue')}</th></tr></thead><tbody>{stats.best_selling_products.map((product, index) => <tr key={`${product.product_id}-${product.sku}`} className="border-b border-slate-50 last:border-0"><td className="py-3 text-sm font-semibold text-slate-400">{index + 1}</td><td className="py-3"><div className="flex items-center gap-2.5"><ProductMark name={product.name} index={index} /><div className="min-w-0"><p className="max-w-[145px] truncate text-sm font-semibold text-slate-800">{product.name}</p><p className="mt-0.5 text-xs text-slate-500">{product.sku}</p></div></div></td><td className="py-3 text-sm text-slate-600">{product.store_name}</td><td className="py-3 text-right text-sm font-semibold text-slate-800">{number(product.units_sold)}</td><td className="py-3 text-right text-sm font-semibold text-slate-900">{money(product.revenue)}</td></tr>)}</tbody></table></div> : <EmptyState label={t('dashboardNoSalesData')} />}
          </DashboardCard>

          <DashboardCard className="xl:col-span-4" title={t('dashboardRecentActivity')} actionLabel={t('dashboardLive')}>
            <div className="space-y-4">{stats.recent_activity.length ? stats.recent_activity.slice(0, 5).map(activity => <ActivityRow key={`${activity.kind}-${activity.reference}-${activity.occurred_at}`} activity={activity} locale={language === 'it' ? 'it-IT' : 'en-IE'} t={t} />) : <EmptyState label={t('dashboardNoActivity')} />}</div>
          </DashboardCard>

          <DashboardCard className="xl:col-span-3" title={t('dashboardKeyInsights')}>
            <div className="space-y-2.5"><Insight icon="revenue" tone="emerald" title={stats.changes.revenue >= 0 ? t('dashboardRevenueUp') : t('dashboardRevenueDown')} detail={`${Math.abs(stats.changes.revenue).toFixed(1)}% ${t('dashboardVsPreviousMonth')}`} /><Insight icon="orders" tone="blue" title={t('dashboardOpenOrders')} detail={t('dashboardCountNeedsAttention', { count: number(stats.operations.open_orders) })} /><Insight icon="alert" tone="amber" title={t('dashboardLowStockItems')} detail={t('dashboardCountNeedsAttention', { count: number(stats.warehouse.low_stock) })} /><Insight icon="support" tone="violet" title={t('dashboardOpenSupport')} detail={t('dashboardCountNeedsAttention', { count: number(stats.operations.open_support_tickets) })} /></div>
          </DashboardCard>
        </section>
      </div>
    </AdminLayout>
  );
}

function DashboardCard({ title, children, className = '', actionLabel }: { title: string; children: ReactNode; className?: string; actionLabel?: string }) {
  return <section className={`rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.045)] ${className}`}><div className="mb-2 flex items-center justify-between gap-3"><h2 className="text-base font-bold tracking-tight text-slate-900">{title}</h2>{actionLabel && <span className="text-xs font-semibold text-[#0875e1]">{actionLabel}</span>}</div>{children}</section>;
}

function MetricCard({ label, value, change, icon, tone, format, changeText }: { label: string; value: number; change: number; icon: MetricIcon; tone: string; format?: 'money'; changeText: string }) {
  const rising = change >= 0;
  return <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.045)]"><div className="flex items-start gap-3"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tone}`}><DashboardIcon name={icon} className="h-5 w-5" /></span><div className="min-w-0"><p className="truncate text-xs font-semibold text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{format === 'money' ? money(value) : number(value)}</p><p className={`mt-1 inline-flex items-center gap-1 text-xs font-semibold ${rising ? 'text-emerald-600' : 'text-rose-600'}`}><span>{rising ? '▲' : '▼'} {Math.abs(change).toFixed(1)}%</span><span className="font-medium text-slate-400">{changeText}</span></p></div></div></article>;
}

function MiniMetric({ icon, tone, label, value }: { icon: MetricIcon; tone: string; label: string; value: string }) {
  return <div className="min-w-0"><span className={`mb-2 grid h-8 w-8 place-items-center rounded-lg ${tone}`}><DashboardIcon name={icon} className="h-4 w-4" /></span><p className="truncate text-[11px] font-medium text-slate-500">{label}</p><p className="mt-0.5 text-lg font-bold tracking-tight text-slate-900">{value}</p></div>;
}

function Insight({ icon, tone, title, detail }: { icon: MetricIcon; tone: 'emerald' | 'blue' | 'amber' | 'violet'; title: string; detail: string }) {
  const tones = { emerald: 'border-emerald-100 bg-emerald-50 text-emerald-600', blue: 'border-blue-100 bg-blue-50 text-[#0875e1]', amber: 'border-amber-100 bg-amber-50 text-amber-600', violet: 'border-violet-100 bg-violet-50 text-violet-600' };
  return <div className={`flex gap-2.5 rounded-lg border p-2.5 ${tones[tone]}`}><span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-white/80"><DashboardIcon name={icon} className="h-4 w-4" /></span><div className="min-w-0"><p className="text-xs font-bold text-slate-800">{title}</p><p className="mt-0.5 text-[11px] leading-4 text-slate-600">{detail}</p></div></div>;
}

function ActivityRow({ activity, locale, t }: { activity: DashboardStats['recent_activity'][number]; locale: string; t: (key: string, values?: Record<string, string | number>) => string }) {
  const meta: Record<string, { icon: MetricIcon; tone: string; title: string }> = {
    order: { icon: 'orders', tone: 'bg-blue-50 text-[#0875e1]', title: t('dashboardActivityOrder', { reference: activity.reference }) },
    warehouse: { icon: 'warehouse', tone: 'bg-cyan-50 text-cyan-600', title: t('dashboardActivityWarehouse', { reference: activity.reference }) },
    campaign: { icon: 'campaign', tone: 'bg-amber-50 text-amber-600', title: t('dashboardActivityCampaign', { reference: activity.reference }) },
    seller: { icon: 'store', tone: 'bg-violet-50 text-violet-600', title: t('dashboardActivitySeller', { reference: activity.reference }) },
    support: { icon: 'support', tone: 'bg-rose-50 text-rose-600', title: t('dashboardActivitySupport', { reference: activity.reference }) },
  };
  const item = meta[activity.kind];
  const description = activity.actor || translatedStatus(activity.status || '', t);
  return <div className="flex gap-3"><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${item.tone}`}><DashboardIcon name={item.icon} className="h-4 w-4" /></span><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><p className="truncate text-xs font-semibold text-slate-800">{item.title}</p><time className="shrink-0 text-[11px] text-slate-400">{relativeTime(activity.occurred_at, locale)}</time></div><p className="mt-0.5 truncate text-[11px] text-slate-500">{description}{activity.amount ? ` · ${money(activity.amount)}` : ''}</p></div></div>;
}

function ProductMark({ name, index }: { name: string; index: number }) {
  const tones = ['bg-slate-100 text-slate-700', 'bg-blue-50 text-blue-700', 'bg-cyan-50 text-cyan-700', 'bg-violet-50 text-violet-700', 'bg-amber-50 text-amber-700'];
  return <span className={`grid h-9 w-11 shrink-0 place-items-center rounded-lg text-xs font-bold ${tones[index % tones.length]}`}>{name.trim().slice(0, 2).toUpperCase() || 'OP'}</span>;
}

function EmptyState({ label }: { label: string }) { return <div className="grid min-h-[120px] place-items-center text-center text-sm text-slate-400">{label}</div>; }
function DashboardError({ message, onRetry, retryLabel }: { message: string; onRetry: () => void; retryLabel: string }) { return <div className="mx-auto mt-10 max-w-lg rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm"><p className="text-sm text-slate-600">{message}</p><button type="button" onClick={onRetry} className="mt-4 rounded-lg bg-[#0875e1] px-4 py-2 text-sm font-semibold text-white">{retryLabel}</button></div>; }

function translatedStatus(status: string, t: (key: string) => string) {
  if (!status) return '—';
  const key = statusKey(status);
  const translated = t(key);
  return translated === key ? status.replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase()) : translated;
}

function relativeTime(timestamp: string, locale: string) {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(timestamp).getTime()) / 1000));
  if (seconds < 60) return locale.startsWith('it') ? 'adesso' : 'now';
  if (seconds < 3600) return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-Math.floor(seconds / 60), 'minute');
  if (seconds < 86400) return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-Math.floor(seconds / 3600), 'hour');
  return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-Math.floor(seconds / 86400), 'day');
}

const tooltipStyle = { borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 10px 24px rgba(15,23,42,0.10)', fontSize: 12 };

function DashboardIcon({ name, className = '' }: { name: MetricIcon | 'calendar' | 'download'; className?: string }) {
  const paths: Record<string, ReactNode> = {
    users: <><path d="M16 20v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V20" /><circle cx="9" cy="7" r="3.3" /><path d="M16 4.7a3.3 3.3 0 0 1 0 6.4M22 20v-1.5a4 4 0 0 0-3-3.87" /></>,
    store: <><path d="M3 10h18v10H3zM2 10l2-6h16l2 6M7 10v4a3 3 0 0 0 6 0v-4M3 20h18" /></>,
    buyer: <><circle cx="12" cy="8" r="3.5" /><path d="M5 21a7 7 0 0 1 14 0M18.5 5.5l1.2 1.2 2.3-2.5" /></>,
    product: <><path d="m12 2 8 4.5v9L12 20l-8-4.5v-9L12 2Z" /><path d="m4.5 6.7 7.5 4.2 7.5-4.2M12 11v9" /></>,
    orders: <><path d="M3 4h2l2.3 11.5h10.9L21 7H6.1M9 20.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM18 20.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" /></>,
    revenue: <><circle cx="12" cy="12" r="9" /><path d="M15.2 8.5c-.7-.7-1.8-1.1-3.1-1.1-1.8 0-3.1.9-3.1 2.2 0 3.2 6.1 1.4 6.1 4.7 0 1.4-1.3 2.3-3.2 2.3-1.4 0-2.7-.5-3.5-1.3M12 5.7v12.6" /></>,
    stock: <><path d="m12 2 8 4.5v9L12 20l-8-4.5v-9L12 2Z" /><path d="m4.5 6.7 7.5 4.2 7.5-4.2M12 11v9" /><path d="M16.5 13.4h-4M14.5 11.4v4" /></>,
    alert: <><path d="M10.2 3.6 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.8 3.6a2 2 0 0 0-3.5 0Z" /><path d="M12 8v4.5M12 16h.01" /></>,
    warehouse: <><path d="m3 10 9-6 9 6v10H3zM7 20v-6h10v6M9 10h.01M12 10h.01M15 10h.01" /></>,
    campaign: <><path d="M4 13.5V9.8c0-.8.5-1.5 1.3-1.8l10-3.4A1.3 1.3 0 0 1 17 5.8v11.1a1.3 1.3 0 0 1-1.7 1.2l-10-3.4A1.9 1.9 0 0 1 4 13.5ZM17 8c2 .7 3 2 3 4s-1 3.3-3 4M7 15.2 8.5 20h2.2l-1.4-5.7" /></>,
    support: <><path d="M20 11.5a7.5 7.5 0 0 1-9.2 7.3L6 20l1.2-3.6A7.5 7.5 0 1 1 20 11.5Z" /><path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    download: <><path d="M12 3v12M7.5 10.5 12 15l4.5-4.5M4 21h16" /></>,
  };
  return <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

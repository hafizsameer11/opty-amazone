'use client';

import { useEffect, useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import DataTable from '@/components/ui/DataTable';
import GlassCard from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import { couponService, type Coupon } from '@/services/coupon-service';
import { useToast } from '@/components/ui/Toast';
import { statusKey, useLanguage } from '@/contexts/LanguageContext';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';

type CouponUsage = { id: number; status?: string; order?: { order_no?: string } | null; discount_amount?: number };
type CouponAudit = { id: number; action?: string; created_at: string };

export default function CouponsPage() {
  const { showToast } = useToast();
  const { t } = useLanguage();
  const statusLabel = (value?: string) => {
    if (!value) return t('notAvailable');
    const key = statusKey(value);
    const translated = t(key);
    return translated === key ? value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase()) : translated;
  };
  const typeLabel = (value?: string) => value === 'percentage' ? t('couponPercentage') : value === 'fixed_amount' ? t('couponFixedAmount') : value === 'free_shipping' ? t('couponFreeShipping') : value || t('notAvailable');
  const scopeLabel = (value?: string) => value === 'store' ? t('couponStore') : value === 'products' ? t('couponProducts') : value === 'categories' ? t('couponCategories') : value === 'variants' ? t('couponVariants') : value || t('couponStore');
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [type, setType] = useState('');
  const [scope, setScope] = useState('');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<Coupon | null>(null);
  const [usage, setUsage] = useState<CouponUsage[]>([]);
  const [audits, setAudits] = useState<CouponAudit[]>([]);

  useEffect(() => {
    loadCoupons();
  }, []);

  const loadCoupons = async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = { per_page: 50 };
      if (search) params.search = search;
      if (type) params.type = type;
      if (scope) params.scope = scope;
      if (status) params.status = status;
      const response = await couponService.getAll(params);
      setCoupons(response.data || []);
    } catch {
      showToast('error', t('couponLoadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadCoupons();
  };

  const handleToggle = async (coupon: Coupon) => {
    try {
      setBusyId(coupon.id);
      if (coupon.admin_disabled_at) await couponService.enable(coupon.id);
      else await couponService.disable(coupon.id);
      showToast('success', coupon.admin_disabled_at ? t('couponReenabled') : t('couponDisabled'));
      await loadCoupons();
    } catch {
      showToast('error', t('couponUpdateFailed'));
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (coupon: Coupon) => {
    if (!confirm(`${coupon.code}: ${t('couponArchiveConfirm')}`)) return;
    try {
      setBusyId(coupon.id);
      await couponService.destroy(coupon.id);
      showToast('success', t('couponArchived'));
      await loadCoupons();
    } catch {
      showToast('error', t('couponArchiveFailed'));
    } finally {
      setBusyId(null);
    }
  };

  useLiveRefresh(loadCoupons);

  const openDetails = async (coupon: Coupon) => {
    try {
      setBusyId(coupon.id);
      const [details, history, auditHistory] = await Promise.all([couponService.getOne(coupon.id), couponService.usageHistory(coupon.id), couponService.auditHistory(coupon.id)]);
      setSelected(details); setUsage(history.data || []); setAudits(auditHistory.data || []);
    } catch { showToast('error', t('couponDetailsFailed')); }
    finally { setBusyId(null); }
  };

  const getDiscountDisplay = (coupon: Coupon) => {
    if (coupon.discount_type === 'fixed_amount') return '€' + String(coupon.discount_value) + ' ' + t('couponOff');
    if (coupon.discount_type === 'percentage') {
      return `${coupon.discount_value}% ${t('couponOff')}`;
    } else if (coupon.discount_type === 'fixed_amount') {
      return `â‚¬${coupon.discount_value} ${t('couponOff')}`;
    }
    return coupon.discount_type === 'free_shipping' ? t('couponFreeShipping') : typeLabel(coupon.discount_type);
  };

  const columns = [
    { key: 'code', header: t('couponCode'), sortable: true },
    {
      key: 'store',
      header: t('couponStore'),
      render: (coupon: Coupon) => <span className="text-slate-900">{coupon.store?.name || t('couponUnavailable')}</span>,
    },
    {
      key: 'discount',
      header: t('couponDiscount'),
      render: (coupon: Coupon) => <span className="text-slate-900 font-semibold">{getDiscountDisplay(coupon)}</span>,
    },
    {
      key: 'usages_count',
      header: t('couponUsages'),
      render: (coupon: Coupon) => <span className="text-slate-900">{coupon.usages_count || 0}</span>,
    },
    {
      key: 'is_active',
      header: t('couponStatus'),
      render: (coupon: Coupon) => (
        <Badge variant={coupon.is_active ? 'success' : 'default'}>
          {coupon.resolved_status ? statusLabel(coupon.resolved_status) : (coupon.admin_disabled_at ? t('couponDisabledStatus') : coupon.is_active ? t('couponActive') : t('couponInactive'))}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: t('couponActions'),
      render: (coupon: Coupon) => (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={busyId === coupon.id}
            onClick={() => void handleToggle(coupon)}
          >
            {coupon.admin_disabled_at ? t('couponEnable') : t('couponDisable')}
          </Button>
          <Button size="sm" variant="outline" disabled={busyId === coupon.id} onClick={() => void openDetails(coupon)}>{t('couponView')}</Button>
          <Button
            size="sm"
            variant="danger"
            disabled={busyId === coupon.id}
            onClick={() => void handleDelete(coupon)}
          >
            {t('couponArchive')}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">{t('coupons')}</h1>
          <p className="text-slate-500">{t('couponSubtitle')}</p>
        </div>

        <GlassCard>
          <form onSubmit={handleSearch} className="flex flex-wrap gap-4 mb-6">
            <Input
              type="text"
              placeholder={t('couponSearch')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
            />
            <Button type="submit">{t('couponSearchButton')}</Button>
            <select value={type} onChange={(event) => setType(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2"><option value="">{t('couponAllTypes')}</option><option value="percentage">{t('couponPercentage')}</option><option value="fixed_amount">{t('couponFixedAmount')}</option><option value="free_shipping">{t('couponFreeShipping')}</option></select>
            <select value={scope} onChange={(event) => setScope(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2"><option value="">{t('couponAllScopes')}</option><option value="store">{t('couponStore')}</option><option value="products">{t('couponProducts')}</option><option value="categories">{t('couponCategories')}</option><option value="variants">{t('couponVariants')}</option></select>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2"><option value="">{t('couponAllStatuses')}</option><option value="active">{t('couponActive')}</option><option value="paused">{t('couponPaused')}</option><option value="scheduled">{t('couponScheduled')}</option><option value="expired">{t('couponExpired')}</option><option value="exhausted">{t('couponExhausted')}</option><option value="disabled">{t('couponDisabledStatus')}</option></select>
          </form>

          <DataTable
            data={coupons}
            columns={columns}
            loading={loading}
            keyExtractor={(coupon) => coupon.id}
          />
          {selected && (
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
              <div className="mb-3 flex items-start justify-between gap-4"><div><h2 className="text-lg font-bold text-slate-900">{selected.code}</h2><p className="text-sm text-slate-600">{selected.store?.name || t('couponStore')} Â· {statusLabel(selected.resolved_status || selected.status)}</p></div><Button size="sm" variant="outline" onClick={() => setSelected(null)}>{t('couponClose')}</Button></div>
              <div className="grid gap-3 text-sm sm:grid-cols-3"><p><span className="text-slate-500">{t('couponType')}:</span> {typeLabel(selected.discount_type)}</p><p><span className="text-slate-500">{t('couponScope')}:</span> {scopeLabel(selected.scope)}</p><p><span className="text-slate-500">{t('couponUsage')}:</span> {selected.usages_count || 0}</p></div>
              <div className="mt-4 grid gap-4 lg:grid-cols-2"><div><h3 className="font-semibold text-slate-900">{t('couponUsageHistory')}</h3>{usage.length ? <ul className="mt-2 space-y-1 text-sm text-slate-600">{usage.slice(0, 10).map((row) => <li key={row.id}>{statusLabel(row.status)} Â· {row.order?.order_no || t('couponReservation')} Â· â‚¬{row.discount_amount}</li>)}</ul> : <p className="mt-2 text-sm text-slate-500">{t('couponNoUsage')}</p>}</div><div><h3 className="font-semibold text-slate-900">{t('couponAuditHistory')}</h3>{audits.length ? <ul className="mt-2 space-y-1 text-sm text-slate-600">{audits.slice(0, 10).map((row) => <li key={row.id}>{statusLabel(row.action)} Â· {new Date(row.created_at).toLocaleString()}</li>)}</ul> : <p className="mt-2 text-sm text-slate-500">{t('couponNoAudits')}</p>}</div></div>
            </div>
          )}
        </GlassCard>
      </div>
    </AdminLayout>
  );
}

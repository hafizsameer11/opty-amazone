'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import Sidebar from '@/components/layout/Sidebar';
import { couponService, type Coupon, type CouponStatistics } from '@/services/coupon-service';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Alert from '@/components/ui/Alert';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatLocalSchedule } from '@/lib/schedule-time';

function errorMessage(error: unknown, fallback: string): string {
  const response = (error as { response?: { data?: { message?: unknown } } })?.response;
  return typeof response?.data?.message === 'string' ? response.data.message : fallback;
}

export default function CouponsPage() {
  const { isAuthenticated, loading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [statistics, setStatistics] = useState<CouponStatistics | null>(null);
  const [loadingCoupons, setLoadingCoupons] = useState(true);
  const [search, setSearch] = useState('');
  const searchRef = useRef('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [scopeFilter, setScopeFilter] = useState<string>('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, loading, router]);

  const loadCoupons = useCallback(async () => {
    try {
      setLoadingCoupons(true);
      setError('');
      const params: Record<string, string | number> = {
        per_page: 50,
      };
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.type = typeFilter;
      if (scopeFilter) params.scope = scopeFilter;
      if (searchRef.current) {
        params.search = searchRef.current;
      }
      const response = await couponService.getAll(params);
      setCoupons(response.coupons?.data || []);
      setStatistics(response.statistics || null);
    } catch (err: unknown) {
      setError(errorMessage(err, t('Failed to load coupons')));
    } finally {
      setLoadingCoupons(false);
    }
  }, [scopeFilter, statusFilter, t, typeFilter]);

  useEffect(() => {
    if (isAuthenticated) {
      void loadCoupons();
    }
  }, [isAuthenticated, loadCoupons]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void loadCoupons();
  };

  const handleToggleStatus = async (id: number) => {
    try {
      await couponService.toggleStatus(id);
      setSuccess(t('Coupon status updated successfully'));
      loadCoupons();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: unknown) {
      setError(errorMessage(err, t('Failed to update coupon status')));
    }
  };

  const handlePauseResume = async (coupon: Coupon) => {
    try {
      if (coupon.status === 'paused') await couponService.resume(coupon.id);
      else await couponService.pause(coupon.id);
      setSuccess(t(coupon.status === 'paused' ? 'Coupon resumed successfully' : 'Coupon paused successfully'));
      loadCoupons();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: unknown) {
      setError(errorMessage(err, t('Failed to update coupon lifecycle')));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('Are you sure you want to delete this coupon?'))) return;
    
    try {
      await couponService.delete(id);
      setSuccess(t('Coupon archived successfully'));
      loadCoupons();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: unknown) {
      setError(errorMessage(err, t('Failed to archive coupon')));
    }
  };

  if (loading || loadingCoupons) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0066CC] mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('Loading…')}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const getDiscountDisplay = (coupon: Coupon) => {
    switch (coupon.discount_type) {
      case 'percentage':
        return `${coupon.discount_value}% ${t('OFF')}`;
      case 'fixed_amount':
        return `€${coupon.discount_value} ${t('OFF')}`;
      case 'free_shipping':
        return t('Free Shipping');
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header />
          <main className="flex-1 p-4 sm:p-6 xl:p-8">
            <div className="mx-auto w-full max-w-[1440px]">
              {/* Header */}
              <div className="mb-5 sm:mb-6">
                <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
                  <div className="min-w-0">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{t('Coupons')}</h1>
                    <p className="mt-1 text-sm text-slate-600 sm:text-base">{t('Manage your discount coupons')}</p>
                  </div>
                  <Link href="/coupons/new">
                    <Button className="w-full whitespace-nowrap sm:w-auto">{t('Create Coupon')}</Button>
                  </Link>
                </div>

                {/* Statistics */}
                {statistics && (
                  <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
                    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
                      <div className="text-xs font-medium text-slate-500">{t('Total Coupons')}</div>
                      <div className="mt-1 text-xl font-bold text-slate-950 sm:text-2xl">{statistics.total_coupons}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
                      <div className="text-xs font-medium text-slate-500">{t('Active Coupons')}</div>
                      <div className="mt-1 text-xl font-bold text-emerald-600 sm:text-2xl">{statistics.active_coupons}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
                      <div className="text-xs font-medium text-slate-500">{t('Total Usages')}</div>
                      <div className="mt-1 text-xl font-bold text-[#0066CC] sm:text-2xl">{statistics.total_usages}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
                      <div className="text-xs font-medium text-slate-500">{t('Discount Given')}</div>
                      <div className="mt-1 text-xl font-bold text-violet-600 sm:text-2xl">€{Number(statistics.total_discount_given ?? 0).toFixed(2)}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
                      <div className="text-xs font-medium text-slate-500">{t('Reserved Coupons')}</div>
                      <div className="mt-1 text-xl font-bold text-amber-600 sm:text-2xl">{statistics.reserved_coupons}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
                      <div className="text-xs font-medium text-slate-500">{t('Redeemed Coupons')}</div>
                      <div className="mt-1 text-xl font-bold text-emerald-600 sm:text-2xl">{statistics.redeemed_coupons}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
                      <div className="text-xs font-medium text-slate-500">{t('Revenue Generated')}</div>
                      <div className="mt-1 text-xl font-bold text-slate-950 sm:text-2xl">€{Number(statistics.revenue_generated ?? 0).toFixed(2)}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
                      <div className="text-xs font-medium text-slate-500">{t('Conversions')}</div>
                      <div className="mt-1 text-xl font-bold text-slate-950 sm:text-2xl">{statistics.conversion_count ?? statistics.order_count ?? 0}</div>
                    </div>
                  </div>
                )}

                {/* Alerts */}
                {error && (
                  <div className="mb-4">
                    <Alert type="error" message={error} onClose={() => setError('')} />
                  </div>
                )}
                {success && (
                  <div className="mb-4">
                    <Alert type="success" message={success} onClose={() => setSuccess('')} />
                  </div>
                )}

                {/* Filters */}
                <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
                  <form onSubmit={handleSearch} className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(16rem,1fr)_auto_10.5rem_10.5rem_10.5rem]">
                    <div className="min-w-0">
                      <Input
                        type="text"
                        placeholder={t('Search coupons by code or description...')}
                        value={search}
                        onChange={(e) => {
                          searchRef.current = e.target.value;
                          setSearch(e.target.value);
                        }}
                      />
                    </div>
                    <Button type="submit" className="w-full lg:w-auto">{t('Search')}</Button>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 focus:border-[#0066CC] focus:ring-2 focus:ring-[#0066CC]"
                    >
                      <option value="">{t('All Status')}</option>
                      <option value="active">{t('Active')}</option>
                      <option value="inactive">{t('Inactive')}</option>
                      <option value="paused">{t('Paused')}</option>
                      <option value="scheduled">{t('Scheduled')}</option>
                      <option value="expired">{t('Expired')}</option>
                      <option value="exhausted">{t('Exhausted')}</option>
                    </select>
                    <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-full rounded-lg border-2 border-gray-300 px-4 py-3">
                      <option value="">{t('All Types')}</option><option value="percentage">{t('Percentage')}</option><option value="fixed_amount">{t('Fixed Amount')}</option><option value="free_shipping">{t('Free Shipping')}</option>
                    </select>
                    <select value={scopeFilter} onChange={(e) => setScopeFilter(e.target.value)} className="w-full rounded-lg border-2 border-gray-300 px-4 py-3">
                      <option value="">{t('All Scopes')}</option><option value="store">{t('Entire Store')}</option><option value="products">{t('Products')}</option><option value="categories">{t('Categories')}</option><option value="variants">{t('Variants')}</option>
                    </select>
                  </form>
                </div>
              </div>

              {/* Coupons List */}
              {coupons.length === 0 ? (
                <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm sm:py-20">
                  <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="mt-4 text-lg font-semibold text-slate-950">{t('No coupons')}</h3>
                  <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">{t('Get started by creating a new coupon.')}</p>
                  <div className="mt-6">
                    <Link href="/coupons/new">
                      <Button>{t('Create Coupon')}</Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">{t('Code')}</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">{t('Discount')}</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">{t('Usage')}</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">{t('Valid Period')}</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">{t('Status')}</th>
                          <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">{t('Actions')}</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {coupons.map((coupon) => (
                          <tr key={coupon.id} className="hover:bg-gray-50 transition-colors duration-150">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-semibold text-gray-900 font-mono">{coupon.code}</div>
                              {coupon.description && (
                                <div className="text-xs text-gray-500 mt-1">{coupon.description}</div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-bold text-[#0066CC]">{getDiscountDisplay(coupon)}</div>
                              {coupon.min_order_amount && (
                                <div className="text-xs text-gray-500 mt-1">{t('Min')}: €{coupon.min_order_amount}</div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {coupon.usages_count || 0} / {coupon.usage_limit || '∞'}
                              </div>
                              {coupon.usage_per_user && (
                                <div className="text-xs text-gray-500 mt-1">{coupon.usage_per_user} {t('per user')}</div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {coupon.starts_at ? formatLocalSchedule(coupon.starts_at) : t('No start')}
                              </div>
                              <div className="text-xs text-gray-500">
                                {coupon.ends_at ? formatLocalSchedule(coupon.ends_at) : t('No expiry')}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge variant={(coupon.resolved_status || coupon.status) === 'active' ? 'success' : 'default'} size="sm">
                                {t(coupon.resolved_status || coupon.status)}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex items-center justify-end gap-3">
                                <Link href={`/coupons/${coupon.id}/edit`}>
                                  <button className="text-[#0066CC] hover:text-[#0052a3] font-medium transition-colors">
                                    {t('Edit')}
                                  </button>
                                </Link>
                                <button
                                  onClick={() => handleToggleStatus(coupon.id)}
                                  className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
                                >
                                  {coupon.is_active ? t('Deactivate') : t('Activate')}
                                </button>
                                <button
                                  onClick={() => handlePauseResume(coupon)}
                                  className="text-amber-700 hover:text-amber-900 font-medium transition-colors"
                                >
                                  {coupon.status === 'paused' ? t('Resume') : t('Pause')}
                                </button>
                                <button
                                  onClick={() => handleDelete(coupon.id)}
                                  className="text-red-600 hover:text-red-800 font-medium transition-colors"
                                >
                                  {t('Archive')}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </main>
          <BottomNav />
        </div>
      </div>
    </div>
  );
}

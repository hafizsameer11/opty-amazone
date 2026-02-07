'use client';

import { useEffect, useState } from 'react';
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

export default function CouponsPage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [statistics, setStatistics] = useState<CouponStatistics | null>(null);
  const [loadingCoupons, setLoadingCoupons] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadCoupons();
    }
  }, [isAuthenticated, statusFilter]);

  const loadCoupons = async () => {
    try {
      setLoadingCoupons(true);
      setError('');
      const params: any = {
        per_page: 50,
      };
      if (statusFilter) {
        params.is_active = statusFilter === 'active';
      }
      if (search) {
        params.search = search;
      }
      const response = await couponService.getAll(params);
      setCoupons(response.coupons?.data || []);
      setStatistics(response.statistics || null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load coupons');
    } finally {
      setLoadingCoupons(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadCoupons();
  };

  const handleToggleStatus = async (id: number) => {
    try {
      await couponService.toggleStatus(id);
      setSuccess('Coupon status updated successfully');
      loadCoupons();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update coupon status');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return;
    
    try {
      await couponService.delete(id);
      setSuccess('Coupon deleted successfully');
      loadCoupons();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete coupon');
    }
  };

  if (loading || loadingCoupons) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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

  const getDiscountDisplay = (coupon: Coupon) => {
    switch (coupon.discount_type) {
      case 'percentage':
        return `${coupon.discount_value}% OFF`;
      case 'fixed_amount':
        return `€${coupon.discount_value} OFF`;
      case 'free_shipping':
        return 'Free Shipping';
      case 'bogo':
        return 'Buy One Get One';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <Sidebar />
        <div className="flex-1 lg:ml-64">
          <Header />
          <main className="p-4 lg:p-8">
            <div className="max-w-7xl mx-auto">
              {/* Header */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">Coupons</h1>
                    <p className="text-gray-600 mt-1">Manage your discount coupons</p>
                  </div>
                  <Link href="/coupons/new">
                    <Button>Create Coupon</Button>
                  </Link>
                </div>

                {/* Statistics */}
                {statistics && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                      <div className="text-sm text-gray-600">Total Coupons</div>
                      <div className="text-2xl font-bold text-gray-900 mt-1">{statistics.total_coupons}</div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                      <div className="text-sm text-gray-600">Active Coupons</div>
                      <div className="text-2xl font-bold text-green-600 mt-1">{statistics.active_coupons}</div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                      <div className="text-sm text-gray-600">Total Usages</div>
                      <div className="text-2xl font-bold text-[#0066CC] mt-1">{statistics.total_usages}</div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                      <div className="text-sm text-gray-600">Discount Given</div>
                      <div className="text-2xl font-bold text-purple-600 mt-1">€{statistics.total_discount_given.toFixed(2)}</div>
                    </div>
                  </div>
                )}

                {/* Alerts */}
                {error && (
                  <Alert variant="error" className="mb-4" onClose={() => setError('')}>
                    {error}
                  </Alert>
                )}
                {success && (
                  <Alert variant="success" className="mb-4" onClose={() => setSuccess('')}>
                    {success}
                  </Alert>
                )}

                {/* Filters */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
                  <form onSubmit={handleSearch} className="flex gap-4">
                    <div className="flex-1">
                      <Input
                        type="text"
                        placeholder="Search coupons by code or description..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                    <Button type="submit">Search</Button>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066CC] focus:border-[#0066CC] transition-all"
                    >
                      <option value="">All Status</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </form>
                </div>
              </div>

              {/* Coupons List */}
              {coupons.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="mt-2 text-lg font-semibold text-gray-900">No coupons</h3>
                  <p className="mt-1 text-sm text-gray-500">Get started by creating a new coupon.</p>
                  <div className="mt-6">
                    <Link href="/coupons/new">
                      <Button>Create Coupon</Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Code</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Discount</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Usage</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Valid Period</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
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
                                <div className="text-xs text-gray-500 mt-1">Min: €{coupon.min_order_amount}</div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {coupon.usages_count || 0} / {coupon.usage_limit || '∞'}
                              </div>
                              {coupon.usage_per_user && (
                                <div className="text-xs text-gray-500 mt-1">{coupon.usage_per_user} per user</div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {coupon.starts_at ? new Date(coupon.starts_at).toLocaleDateString() : 'No start'}
                              </div>
                              <div className="text-xs text-gray-500">
                                {coupon.ends_at ? new Date(coupon.ends_at).toLocaleDateString() : 'No expiry'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge variant={coupon.is_active ? 'success' : 'default'} size="sm">
                                {coupon.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex items-center justify-end gap-3">
                                <Link href={`/coupons/${coupon.id}/edit`}>
                                  <button className="text-[#0066CC] hover:text-[#0052a3] font-medium transition-colors">
                                    Edit
                                  </button>
                                </Link>
                                <button
                                  onClick={() => handleToggleStatus(coupon.id)}
                                  className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
                                >
                                  {coupon.is_active ? 'Deactivate' : 'Activate'}
                                </button>
                                <button
                                  onClick={() => handleDelete(coupon.id)}
                                  className="text-red-600 hover:text-red-800 font-medium transition-colors"
                                >
                                  Delete
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

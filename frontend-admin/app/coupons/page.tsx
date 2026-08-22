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

export default function CouponsPage() {
  const { showToast } = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    loadCoupons();
  }, []);

  const loadCoupons = async () => {
    try {
      setLoading(true);
      const params: any = { per_page: 50 };
      if (search) params.search = search;
      const response = await couponService.getAll(params);
      setCoupons(response.data || []);
    } catch (error) {
      showToast('error', 'Failed to load coupons');
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
      await couponService.toggleStatus(coupon.id);
      showToast('success', coupon.is_active ? 'Coupon deactivated' : 'Coupon activated');
      await loadCoupons();
    } catch (error: any) {
      showToast('error', error.response?.data?.message || 'Failed to update coupon');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (coupon: Coupon) => {
    if (!confirm(`Delete coupon ${coupon.code}?`)) return;
    try {
      setBusyId(coupon.id);
      await couponService.destroy(coupon.id);
      showToast('success', 'Coupon deleted');
      await loadCoupons();
    } catch (error: any) {
      showToast('error', error.response?.data?.message || 'Failed to delete coupon');
    } finally {
      setBusyId(null);
    }
  };

  const getDiscountDisplay = (coupon: Coupon) => {
    if (coupon.discount_type === 'percentage') {
      return `${coupon.discount_value}% OFF`;
    } else if (coupon.discount_type === 'fixed_amount') {
      return `€${coupon.discount_value} OFF`;
    }
    return coupon.discount_type;
  };

  const columns = [
    { key: 'code', header: 'Code', sortable: true },
    {
      key: 'store',
      header: 'Store',
      render: (coupon: Coupon) => <span className="text-slate-900">{coupon.store?.name || 'N/A'}</span>,
    },
    {
      key: 'discount',
      header: 'Discount',
      render: (coupon: Coupon) => <span className="text-slate-900 font-semibold">{getDiscountDisplay(coupon)}</span>,
    },
    {
      key: 'usages_count',
      header: 'Usages',
      render: (coupon: Coupon) => <span className="text-slate-900">{coupon.usages_count || 0}</span>,
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (coupon: Coupon) => (
        <Badge variant={coupon.is_active ? 'success' : 'default'}>
          {coupon.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (coupon: Coupon) => (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={busyId === coupon.id}
            onClick={() => void handleToggle(coupon)}
          >
            {coupon.is_active ? 'Deactivate' : 'Activate'}
          </Button>
          <Button
            size="sm"
            variant="danger"
            disabled={busyId === coupon.id}
            onClick={() => void handleDelete(coupon)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Coupons</h1>
          <p className="text-slate-500">View and control seller coupons</p>
        </div>

        <GlassCard>
          <form onSubmit={handleSearch} className="flex gap-4 mb-6">
            <Input
              type="text"
              placeholder="Search coupons..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
            />
            <Button type="submit">Search</Button>
          </form>

          <DataTable
            data={coupons}
            columns={columns}
            loading={loading}
            keyExtractor={(coupon) => coupon.id}
          />
        </GlassCard>
      </div>
    </AdminLayout>
  );
}

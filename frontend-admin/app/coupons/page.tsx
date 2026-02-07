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
      render: (coupon: Coupon) => <span className="text-white">{coupon.store?.name || 'N/A'}</span>,
    },
    {
      key: 'discount',
      header: 'Discount',
      render: (coupon: Coupon) => <span className="text-white font-semibold">{getDiscountDisplay(coupon)}</span>,
    },
    {
      key: 'usages_count',
      header: 'Usages',
      render: (coupon: Coupon) => <span className="text-white">{coupon.usages_count || 0}</span>,
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
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Coupons</h1>
          <p className="text-white/70">View all seller coupons</p>
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

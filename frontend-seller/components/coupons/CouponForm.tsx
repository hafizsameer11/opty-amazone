'use client';

import { useState } from 'react';
import { type Coupon, type CreateCouponData } from '@/services/coupon-service';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Alert from '@/components/ui/Alert';

interface CouponFormProps {
  coupon?: Coupon;
  onSubmit: (data: CreateCouponData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export default function CouponForm({ coupon, onSubmit, onCancel, loading = false }: CouponFormProps) {
  const [formData, setFormData] = useState<CreateCouponData>({
    code: coupon?.code || '',
    description: coupon?.description || '',
    discount_type: coupon?.discount_type || 'percentage',
    discount_value: coupon?.discount_value || 0,
    max_discount: coupon?.max_discount,
    min_order_amount: coupon?.min_order_amount,
    usage_limit: coupon?.usage_limit,
    usage_per_user: coupon?.usage_per_user,
    starts_at: coupon?.starts_at ? new Date(coupon.starts_at).toISOString().slice(0, 16) : '',
    ends_at: coupon?.ends_at ? new Date(coupon.ends_at).toISOString().slice(0, 16) : '',
    is_active: coupon?.is_active ?? true,
    applicable_to: coupon?.applicable_to,
    conditions: coupon?.conditions,
  });

  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.code.trim()) {
      setError('Coupon code is required');
      return;
    }

    if (formData.discount_value <= 0) {
      setError('Discount value must be greater than 0');
      return;
    }

    if (formData.discount_type === 'percentage' && formData.discount_value > 100) {
      setError('Percentage discount cannot exceed 100%');
      return;
    }

    if (formData.starts_at && formData.ends_at && new Date(formData.starts_at) >= new Date(formData.ends_at)) {
      setError('End date must be after start date');
      return;
    }

    try {
      const submitData: CreateCouponData = {
        ...formData,
        starts_at: formData.starts_at || undefined,
        ends_at: formData.ends_at || undefined,
        max_discount: formData.max_discount || undefined,
        min_order_amount: formData.min_order_amount || undefined,
        usage_limit: formData.usage_limit || undefined,
        usage_per_user: formData.usage_per_user || undefined,
      };
      await onSubmit(submitData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save coupon');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="error" onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Input
            label="Coupon Code *"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            placeholder="SAVE20"
            required
            disabled={!!coupon}
          />
          <p className="text-xs text-gray-500 mt-1">Code will be converted to uppercase</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Discount Type *
          </label>
          <select
            value={formData.discount_type}
            onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as any })}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066CC] focus:border-[#0066CC]"
            required
          >
            <option value="percentage">Percentage</option>
            <option value="fixed_amount">Fixed Amount</option>
            <option value="free_shipping">Free Shipping</option>
            <option value="bogo">Buy One Get One</option>
          </select>
        </div>

        <div>
          <Input
            label={formData.discount_type === 'percentage' ? 'Discount Percentage (%) *' : 'Discount Amount (€) *'}
            type="number"
            step="0.01"
            min="0"
            max={formData.discount_type === 'percentage' ? '100' : undefined}
            value={formData.discount_value}
            onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })}
            required
          />
        </div>

        {formData.discount_type === 'percentage' && (
          <div>
            <Input
              label="Maximum Discount (€)"
              type="number"
              step="0.01"
              min="0"
              value={formData.max_discount || ''}
              onChange={(e) => setFormData({ ...formData, max_discount: e.target.value ? parseFloat(e.target.value) : undefined })}
            />
          </div>
        )}

        <div>
          <Input
            label="Minimum Order Amount (€)"
            type="number"
            step="0.01"
            min="0"
            value={formData.min_order_amount || ''}
            onChange={(e) => setFormData({ ...formData, min_order_amount: e.target.value ? parseFloat(e.target.value) : undefined })}
          />
        </div>

        <div>
          <Input
            label="Usage Limit (Total)"
            type="number"
            min="1"
            value={formData.usage_limit || ''}
            onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value ? parseInt(e.target.value) : undefined })}
          />
          <p className="text-xs text-gray-500 mt-1">Leave empty for unlimited</p>
        </div>

        <div>
          <Input
            label="Usage Per User"
            type="number"
            min="1"
            value={formData.usage_per_user || ''}
            onChange={(e) => setFormData({ ...formData, usage_per_user: e.target.value ? parseInt(e.target.value) : undefined })}
          />
          <p className="text-xs text-gray-500 mt-1">Leave empty for unlimited</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Start Date
          </label>
          <Input
            type="datetime-local"
            value={formData.starts_at}
            onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            End Date
          </label>
          <Input
            type="datetime-local"
            value={formData.ends_at}
            onChange={(e) => setFormData({ ...formData, ends_at: e.target.value })}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066CC] focus:border-[#0066CC]"
          rows={3}
          placeholder="Describe this coupon..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Conditions (Optional)
        </label>
        <textarea
          value={formData.conditions || ''}
          onChange={(e) => setFormData({ ...formData, conditions: e.target.value })}
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066CC] focus:border-[#0066CC]"
          rows={3}
          placeholder="Any special conditions or terms..."
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_active"
          checked={formData.is_active}
          onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
          className="w-4 h-4 text-[#0066CC] border-gray-300 rounded focus:ring-[#0066CC]"
        />
        <label htmlFor="is_active" className="text-sm text-gray-700">
          Active (coupon can be used)
        </label>
      </div>

      <div className="flex items-center justify-end gap-4 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : coupon ? 'Update Coupon' : 'Create Coupon'}
        </Button>
      </div>
    </form>
  );
}

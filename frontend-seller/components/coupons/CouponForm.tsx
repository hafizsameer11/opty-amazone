'use client';

import { useEffect, useState } from 'react';
import { couponService, type Coupon, type CouponScope, type CouponTarget, type CouponType, type CreateCouponData } from '@/services/coupon-service';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Alert from '@/components/ui/Alert';
import { useLanguage } from '@/contexts/LanguageContext';
import { browserTimezone, localDateTimeInput, utcFromZonedInput } from '@/lib/schedule-time';
import { getAxiosErrorMessage } from '@/lib/api-client';

interface CouponFormProps {
  coupon?: Coupon;
  onSubmit: (data: CreateCouponData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export default function CouponForm({ coupon, onSubmit, onCancel, loading = false }: CouponFormProps) {
  const { t } = useLanguage();
  const timezone = browserTimezone();
  const [formData, setFormData] = useState<CreateCouponData>({
    code: coupon?.code || '',
    description: coupon?.description || '',
    discount_type: coupon?.discount_type || 'percentage',
    discount_value: coupon?.discount_value || 0,
    min_order_amount: coupon?.min_order_amount ?? undefined,
    usage_limit: coupon?.usage_limit ?? undefined,
    usage_per_user: coupon?.usage_per_user ?? undefined,
    starts_at: coupon?.starts_at ? localDateTimeInput(coupon.starts_at, timezone) : localDateTimeInput(new Date(), timezone),
    ends_at: coupon?.ends_at ? localDateTimeInput(coupon.ends_at, timezone) : '',
    schedule_timezone: timezone,
    launch_mode: coupon ? undefined : 'run_now',
    is_active: coupon?.is_active ?? true,
    status: coupon?.status === 'paused' ? 'paused' : coupon?.is_active === false ? 'inactive' : 'active',
    scope: coupon?.scope || 'store',
    is_public: coupon?.is_public ?? true,
    followers_only: coupon?.followers_only ?? false,
    first_order_only: coupon?.first_order_only ?? false,
    product_ids: coupon?.products?.map((target) => target.id) || [],
    category_ids: coupon?.categories?.map((target) => target.id) || [],
    variant_ids: coupon?.variants?.map((target) => target.id) || [],
  });

  const [error, setError] = useState('');
  const [targets, setTargets] = useState<CouponTarget[]>([]);
  const [targetsLoading, setTargetsLoading] = useState(coupon?.scope !== undefined && coupon.scope !== 'store');

  useEffect(() => {
    const scope = formData.scope;
    if (scope === 'store') return;

    let cancelled = false;
    void couponService.targets(scope)
      .then((availableTargets) => {
        if (!cancelled) setTargets(availableTargets);
      })
      .catch(() => {
        if (!cancelled) setTargets([]);
      })
      .finally(() => {
        if (!cancelled) setTargetsLoading(false);
      });

    return () => { cancelled = true; };
  }, [formData.scope]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.code.trim()) {
      setError(t('Coupon code is required'));
      return;
    }

    if (formData.discount_type !== 'free_shipping' && formData.discount_value <= 0) {
      setError(t('Discount value must be greater than 0'));
      return;
    }

    if (formData.discount_type === 'percentage' && formData.discount_value > 100) {
      setError(t('Percentage discount cannot exceed 100%'));
      return;
    }

    const targetField = ({ products: 'product_ids', categories: 'category_ids', variants: 'variant_ids' } as const)[formData.scope as 'products' | 'categories' | 'variants'];
    if (targetField && !formData[targetField]?.length) {
      const targetMessage = {
        products: 'Select at least one eligible product.',
        categories: 'Select at least one eligible category.',
        variants: 'Select at least one eligible variant.',
      }[formData.scope as 'products' | 'categories' | 'variants'];
      setError(t(targetMessage));
      return;
    }

    if (formData.launch_mode === 'schedule') {
      if (!formData.starts_at || new Date(formData.starts_at).getTime() <= Date.now()) {
        setError(t('Choose a future start time when scheduling a coupon.'));
        return;
      }
    }

    const effectiveStart = formData.launch_mode === 'schedule'
      ? (formData.starts_at || localDateTimeInput(new Date(), timezone))
      : localDateTimeInput(new Date(), timezone);
    if (formData.ends_at && new Date(effectiveStart) >= new Date(formData.ends_at)) {
      setError(t('End date must be after start date'));
      return;
    }

    try {
      const submitData: CreateCouponData = {
        ...formData,
        schedule_timezone: timezone,
        launch_mode: coupon ? undefined : formData.launch_mode,
        starts_at: formData.starts_at ? utcFromZonedInput(formData.starts_at, timezone) : undefined,
        ends_at: formData.ends_at ? utcFromZonedInput(formData.ends_at, timezone) : undefined,
        min_order_amount: formData.min_order_amount || undefined,
        usage_limit: formData.usage_limit || undefined,
        usage_per_user: formData.usage_per_user || undefined,
        discount_value: formData.discount_type === 'free_shipping' ? 0 : formData.discount_value,
        is_active: coupon ? formData.is_active : true,
      };
      await onSubmit(submitData);
    } catch (err: unknown) {
      setError(getAxiosErrorMessage(err) || t('Failed to save coupon'));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert type="error" message={error} onClose={() => setError('')} />
      )}

      {!coupon && (
        <fieldset className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <legend className="px-1 text-sm font-semibold text-blue-950">{t('Coupon activation')}</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-transparent bg-white p-3 text-sm shadow-sm has-[:checked]:border-blue-600">
              <input
                type="radio"
                name="launch_mode"
                checked={formData.launch_mode === 'run_now'}
                onChange={() => setFormData({ ...formData, launch_mode: 'run_now' })}
              />
              <span><span className="block font-semibold text-slate-900">{t('Run now')}</span><span className="mt-0.5 block text-slate-600">{t('This coupon becomes active immediately when it is saved.')}</span></span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-transparent bg-white p-3 text-sm shadow-sm has-[:checked]:border-blue-600">
              <input
                type="radio"
                name="launch_mode"
                checked={formData.launch_mode === 'schedule'}
                onChange={() => setFormData({ ...formData, launch_mode: 'schedule' })}
              />
              <span><span className="block font-semibold text-slate-900">{t('Schedule for later')}</span><span className="mt-0.5 block text-slate-600">{t('This coupon becomes active automatically at the selected local time.')}</span></span>
            </label>
          </div>
          <p className="mt-3 text-xs text-blue-900">{t('Schedule timezone')}: <strong>{timezone}</strong> — {t('The selected time is interpreted in this device timezone and saved in UTC.')}</p>
        </fieldset>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Input
            label={t('Coupon Code *')}
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            placeholder="SAVE20"
            required
          />
          <p className="text-xs text-gray-500 mt-1">{t('Code will be converted to uppercase')}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('Discount Type *')}
          </label>
          <select
            value={formData.discount_type}
            onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as CouponType })}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066CC] focus:border-[#0066CC]"
            required
          >
            <option value="percentage">{t('Percentage')}</option>
            <option value="fixed_amount">{t('Fixed Amount')}</option>
            <option value="free_shipping">{t('Free Shipping')}</option>
          </select>
        </div>

        {formData.discount_type !== 'free_shipping' && <div>
          <Input
            label={formData.discount_type === 'percentage' ? t('Discount Percentage (%) *') : t('Discount Amount (€) *')}
            type="number"
            step="0.01"
            min="0"
            max={formData.discount_type === 'percentage' ? '100' : undefined}
            value={formData.discount_value}
            onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })}
            required
          />
        </div>}

        <div>
          <Input
            label={t('Minimum Order Amount (€)')}
            type="number"
            step="0.01"
            min="0"
            value={formData.min_order_amount || ''}
            onChange={(e) => setFormData({ ...formData, min_order_amount: e.target.value ? parseFloat(e.target.value) : undefined })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('Coupon Scope *')}</label>
          <select
            value={formData.scope}
            onChange={(event) => {
              const scope = event.target.value as CouponScope;
              if (scope !== 'store') setTargetsLoading(true);
              setFormData({ ...formData, scope, product_ids: [], category_ids: [], variant_ids: [] });
            }}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066CC] focus:border-[#0066CC]"
          >
            <option value="store">{t('Entire Store')}</option>
            <option value="products">{t('Selected Products')}</option>
            <option value="categories">{t('Selected Categories')}</option>
            <option value="variants">{t('Selected Variants')}</option>
          </select>
        </div>

        <div>
          <Input
            label={t('Usage Limit (Total)')}
            type="number"
            min="1"
            value={formData.usage_limit || ''}
            onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value ? parseInt(e.target.value) : undefined })}
          />
          <p className="text-xs text-gray-500 mt-1">{t('Leave empty for unlimited')}</p>
        </div>

        <div>
          <Input
            label={t('Usage Per User')}
            type="number"
            min="1"
            value={formData.usage_per_user || ''}
            onChange={(e) => setFormData({ ...formData, usage_per_user: e.target.value ? parseInt(e.target.value) : undefined })}
          />
          <p className="text-xs text-gray-500 mt-1">{t('Leave empty for unlimited')}</p>
        </div>

        {(coupon || formData.launch_mode === 'schedule') && <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('Scheduled activation time')}
          </label>
          <Input
            type="datetime-local"
            value={formData.starts_at}
            onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
            required={formData.launch_mode === 'schedule'}
          />
        </div>}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('End Date')}
          </label>
          <Input
            type="datetime-local"
            value={formData.ends_at}
            onChange={(e) => setFormData({ ...formData, ends_at: e.target.value })}
          />
        </div>
      </div>

      {formData.scope !== 'store' && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div><h3 className="font-semibold text-gray-900">{t('Eligible targets')}</h3><p className="text-xs text-gray-600">{t('Select the exact products, categories, or variants this coupon can discount.')}</p></div>
            {targetsLoading && <span className="text-xs text-gray-500">{t('Loading…')}</span>}
          </div>
          <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
            {targets.map((target) => {
              const key = ({ products: 'product_ids', categories: 'category_ids', variants: 'variant_ids' } as const)[formData.scope as 'products' | 'categories' | 'variants'];
              const selected = formData[key]?.includes(target.id) || false;
              const label = target.name || target.color_name || `${target.product?.name || t('Products')} #${target.id}`;
              return <label key={target.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 text-sm">
                <input type="checkbox" checked={selected} onChange={() => setFormData({ ...formData, [key]: selected ? (formData[key] || []).filter((id) => id !== target.id) : [...(formData[key] || []), target.id] })} />
                <span className="min-w-0 truncate font-medium text-gray-800">{label}{target.sku ? ` · ${target.sku}` : ''}</span>
              </label>;
            })}
            {!targetsLoading && targets.length === 0 && <p className="text-sm text-gray-500">{t('No eligible targets are available for this store.')}</p>}
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('Description')}
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066CC] focus:border-[#0066CC]"
          rows={3}
          placeholder={t('Describe this coupon...')}
        />
      </div>

      <div className="space-y-3 rounded-xl border border-gray-200 p-4">
        <p className="text-sm font-semibold text-gray-900">{t('Availability and buyer eligibility')}</p>
        {coupon && <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_active"
            checked={formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            className="w-4 h-4 text-[#0066CC] border-gray-300 rounded focus:ring-[#0066CC]"
          />
          <label htmlFor="is_active" className="text-sm text-gray-700">
            {t('Active (coupon can be used)')}
          </label>
        </div>}
        <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={formData.is_public} onChange={(event) => setFormData({ ...formData, is_public: event.target.checked })} />{t('Public coupon (buyers can discover it)')}</label>
        <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={formData.followers_only} onChange={(event) => setFormData({ ...formData, followers_only: event.target.checked })} />{t('Followers only')}</label>
        <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={formData.first_order_only} onChange={(event) => setFormData({ ...formData, first_order_only: event.target.checked })} />{t('First paid order only')}</label>
      </div>

      <div className="flex items-center justify-end gap-4 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          {t('Cancel')}
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? t('Saving...') : coupon ? t('Update Coupon') : t('Create Coupon')}
        </Button>
      </div>
    </form>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { couponService, type CouponCard, type CouponValidation } from '@/services/coupon-service';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { useLanguage } from '@/contexts/LanguageContext';

interface CouponInputProps {
  appliedCoupons: CouponValidation[];
  onCouponsChange: (coupons: CouponValidation[]) => void;
  stores?: Array<{ store_id: number; store_name: string }>;
}

/** One coupon per seller store. The server determines the store from each code. */
export default function CouponInput({ appliedCoupons, onCouponsChange, stores = [] }: CouponInputProps) {
  const [code, setCode] = useState('');
  const [validating, setValidating] = useState(false);
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [available, setAvailable] = useState<Record<number, CouponCard[]>>({});

  useEffect(() => {
    let active = true;
    Promise.all(stores.map(async (store) => [store.store_id, await couponService.getStoreCoupons(store.store_id)] as const))
      .then((entries) => { if (active) setAvailable(Object.fromEntries(entries)); })
      .catch(() => { if (active) setAvailable({}); });
    return () => { active = false; };
  }, [stores]);

  const handleApply = async (requestedCode = code, storeId?: number) => {
    if (!requestedCode.trim()) return showToast('warning', t('coupon.enterCode'));
    setValidating(true);
    try {
      const existingCodes = Object.fromEntries(appliedCoupons.flatMap((coupon) => coupon.store_id && coupon.coupon?.code ? [[coupon.store_id, coupon.coupon.code]] : []));
      const next = await couponService.validate(requestedCode.trim(), undefined, storeId, existingCodes);
      if (!next.valid || !next.coupon || !next.store_id) return showToast('error', next.message);
      const existingForStore = appliedCoupons.find((coupon) => coupon.store_id === next.store_id);
      if (existingForStore && existingForStore.coupon?.code !== next.coupon.code) {
        showToast('warning', t('coupon.onePerStore'));
        return;
      }
      onCouponsChange([...appliedCoupons.filter((coupon) => coupon.store_id !== next.store_id), next]);
      setCode('');
      showToast('success', t('coupon.applied'));
    } finally {
      setValidating(false);
    }
  };

  const remove = (storeId?: number) => {
    onCouponsChange(appliedCoupons.filter((coupon) => coupon.store_id !== storeId));
    showToast('success', t('coupon.removed'));
  };

  return (
    <div className="space-y-3">
      {appliedCoupons.map((coupon) => (
        <div key={coupon.store_id} className="rounded-lg border border-green-200 bg-green-50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-green-800">{coupon.coupon?.code} {t('coupon.appliedToStore')}</p>
              <p className="text-xs text-green-700">-€{Number(coupon.discount_amount || 0).toFixed(2)} {t('coupon.eligibleOnly')}</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => remove(coupon.store_id)} className="border-red-300 text-red-600 hover:bg-red-50">{t('common.remove')}</Button>
          </div>
        </div>
      ))}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <label className="mb-2 block text-sm font-medium text-gray-700">{t('coupon.applyCode')}</label>
        <p className="mb-3 text-xs text-gray-500">{t('coupon.storeEligibility')}</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input type="text" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder={t('coupon.enterCode')} className="w-full flex-1" onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void handleApply(); } }} />
          <Button type="button" onClick={() => void handleApply()} disabled={validating || !code.trim()} size="sm" className="w-full sm:w-auto">{validating ? t('coupon.validating') : t('common.apply')}</Button>
        </div>
      </div>
      {stores.some((store) => available[store.store_id]?.length) && (
        <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm font-semibold text-gray-900">{t('coupon.availableByStore')}</p>
          {stores.map((store) => available[store.store_id]?.length ? (
            <div key={store.store_id} className="border-t border-gray-100 pt-3 first:border-t-0 first:pt-0">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{store.store_name}</p>
              <div className="flex flex-wrap gap-2">{available[store.store_id].map((coupon) => <button key={coupon.id} type="button" onClick={() => void handleApply(coupon.code, store.store_id)} disabled={validating || appliedCoupons.some((applied) => applied.store_id === store.store_id)} className="rounded-full border border-[#0066CC]/30 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-[#0066CC] disabled:cursor-not-allowed disabled:opacity-50">{coupon.code} · {coupon.discount_type === 'percentage' ? `${coupon.discount_value}%` : coupon.discount_type === 'fixed_amount' ? `€${coupon.discount_value}` : t('coupon.freeShipping')}</button>)}</div>
            </div>
          ) : null)}
        </div>
      )}
    </div>
  );
}

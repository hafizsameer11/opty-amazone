'use client';

import { useState } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useLanguage } from '@/contexts/LanguageContext';
import type { CouponCard } from '@/services/coupon-service';

export default function PublicCouponList({ coupons, title }: { coupons: CouponCard[]; title?: string }) {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [copied, setCopied] = useState<number | null>(null);
  if (!coupons.length) return null;

  const saveForCheckout = (coupon: CouponCard) => {
    const current = typeof window === 'undefined' ? {} : JSON.parse(sessionStorage.getItem('checkout_coupon_codes') || '{}');
    sessionStorage.setItem('checkout_coupon_codes', JSON.stringify({ ...current, [coupon.store_id]: coupon.code }));
    showToast('success', t('coupon.savedForCheckout'));
  };
  const copy = async (coupon: CouponCard) => {
    try {
      await navigator.clipboard.writeText(coupon.code);
      setCopied(coupon.id);
      showToast('success', t('coupon.codeCopied'));
    } catch { showToast('error', t('coupon.copyFailed')); }
  };
  const label = (coupon: CouponCard) => coupon.discount_type === 'percentage'
    ? `${coupon.discount_value}% ${t('coupon.off')}`
    : coupon.discount_type === 'fixed_amount' ? `€${Number(coupon.discount_value).toFixed(2)} ${t('coupon.off')}` : t('coupon.freeShipping');

  return (
    <section className="border-t border-gray-200 pt-5">
      <h2 className="mb-3 text-lg font-semibold text-gray-900">{title || t('coupon.availableCoupons')}</h2>
      <div className="space-y-3">
        {coupons.map((coupon) => (
          <article key={coupon.id} className="rounded-xl border border-dashed border-[#0066CC]/40 bg-blue-50/60 p-3 sm:p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-mono text-base font-bold tracking-wide text-[#0066CC]">{coupon.code}</p>
                <p className="text-sm font-semibold text-gray-900">{label(coupon)}</p>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => void copy(coupon)}>{copied === coupon.id ? t('coupon.copied') : t('coupon.copyCode')}</Button>
                <Link href="/checkout" onClick={() => saveForCheckout(coupon)}><Button type="button" size="sm">{t('coupon.useAtCheckout')}</Button></Link>
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-600">
              {coupon.minimum_eligible_subtotal ? `${t('coupon.minimum')}: €${Number(coupon.minimum_eligible_subtotal).toFixed(2)} · ` : ''}
              {coupon.ends_at ? `${t('coupon.expires')}: ${new Date(coupon.ends_at).toLocaleDateString()}` : t('coupon.noExpiry')}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

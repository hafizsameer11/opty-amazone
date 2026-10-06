'use client';

import Link from 'next/link';
import StaticPageShell from '@/components/layout/StaticPageShell';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ShippingContent() {
  const { t } = useLanguage();

  return (
    <StaticPageShell titleKey="static.shipping.title">
      <p>{t('static.shipping.intro')}</p>

      <h2 className="text-xl font-semibold text-gray-900 pt-2">{t('static.shipping.quotedHeading')}</h2>
      <p>{t('static.shipping.quotedBody1')}</p>
      <p>{t('static.shipping.quotedBody2')}</p>

      <h2 className="text-xl font-semibold text-gray-900 pt-2">{t('static.shipping.estimateHeading')}</h2>
      <p>{t('static.shipping.estimateBody')}</p>

      <h2 className="text-xl font-semibold text-gray-900 pt-2">{t('static.shipping.trackingHeading')}</h2>
      <p>
        {t('static.shipping.trackingBody1')}{' '}
        <Link href="/orders" className="text-[#0066CC] hover:underline">
          {t('static.myOrders')}
        </Link>
        {t('static.shipping.trackingBody2')}
      </p>

      <h2 className="text-xl font-semibold text-gray-900 pt-2">{t('static.shipping.confirmHeading')}</h2>
      <p>{t('static.shipping.confirmBody')}</p>

      <h2 className="text-xl font-semibold text-gray-900 pt-2">{t('static.shipping.feesHeading')}</h2>
      <p>{t('static.shipping.feesBody')}</p>

      <h2 className="text-xl font-semibold text-gray-900 pt-2">{t('static.shipping.damagedHeading')}</h2>
      <p>{t('static.shipping.damagedBody')}</p>
    </StaticPageShell>
  );
}
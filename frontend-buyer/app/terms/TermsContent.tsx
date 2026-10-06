'use client';

import Link from 'next/link';
import StaticPageShell from '@/components/layout/StaticPageShell';
import { useLanguage } from '@/contexts/LanguageContext';

export default function TermsContent() {
  const { t } = useLanguage();

  return (
    <StaticPageShell titleKey="static.terms.title">
      <p className="text-sm text-gray-500">{t('static.lastUpdated', { year: new Date().getFullYear() })}</p>
      <p>{t('static.terms.intro')}</p>
      <h2 className="text-xl font-semibold text-gray-900 pt-2">{t('static.terms.marketplaceHeading')}</h2>
      <p>{t('static.terms.marketplaceBody')}</p>
      <h2 className="text-xl font-semibold text-gray-900 pt-2">{t('static.terms.accountsHeading')}</h2>
      <p>{t('static.terms.accountsBody')}</p>
      <h2 className="text-xl font-semibold text-gray-900 pt-2">{t('static.terms.productsHeading')}</h2>
      <p>{t('static.terms.productsBody')}</p>
      <h2 className="text-xl font-semibold text-gray-900 pt-2">{t('static.terms.pricingHeading')}</h2>
      <p>{t('static.terms.pricingBody')}</p>
      <h2 className="text-xl font-semibold text-gray-900 pt-2">{t('static.terms.liabilityHeading')}</h2>
      <p>{t('static.terms.liabilityBody')}</p>
      <h2 className="text-xl font-semibold text-gray-900 pt-2">{t('static.terms.governingHeading')}</h2>
      <p>{t('static.terms.governingBody')}</p>
      <h2 className="text-xl font-semibold text-gray-900 pt-2">{t('static.privacy.contactHeading')}</h2>
      <p>
        {t('static.terms.contactBody')}{' '}
        <a href="mailto:info@vistaexpress.it" className="text-[#0066CC] hover:underline">
          info@vistaexpress.it
        </a>
        . {t('static.terms.seeAlso')}{' '}
        <Link href="/privacy" className="text-[#0066CC] hover:underline">
          {t('footer.privacyPolicy')}
        </Link>
        .
      </p>
    </StaticPageShell>
  );
}
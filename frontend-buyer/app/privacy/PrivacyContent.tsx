'use client';

import StaticPageShell from '@/components/layout/StaticPageShell';
import { useLanguage } from '@/contexts/LanguageContext';

export default function PrivacyContent() {
  const { t } = useLanguage();

  return (
    <StaticPageShell titleKey="static.privacy.title">
      <p className="text-sm text-gray-500">{t('static.lastUpdated', { year: new Date().getFullYear() })}</p>
      <p>{t('static.privacy.intro')}</p>
      <h2 className="text-xl font-semibold text-gray-900 pt-2">{t('static.privacy.collectHeading')}</h2>
      <ul className="list-disc pl-5 space-y-2">
        <li>{t('static.privacy.collectAccount')}</li>
        <li>{t('static.privacy.collectOrder')}</li>
        <li>{t('static.privacy.collectTechnical')}</li>
      </ul>
      <h2 className="text-xl font-semibold text-gray-900 pt-2">{t('static.privacy.useHeading')}</h2>
      <p>{t('static.privacy.useBody')}</p>
      <h2 className="text-xl font-semibold text-gray-900 pt-2">{t('static.privacy.legalHeading')}</h2>
      <p>{t('static.privacy.legalBody')}</p>
      <h2 className="text-xl font-semibold text-gray-900 pt-2">{t('static.privacy.retentionHeading')}</h2>
      <p>{t('static.privacy.retentionBody')}</p>
      <h2 className="text-xl font-semibold text-gray-900 pt-2">{t('static.privacy.rightsHeading')}</h2>
      <p>
        {t('static.privacy.rightsBody')}{' '}
        <a href="mailto:info@vistaexpress.it" className="text-[#0066CC] hover:underline">
          info@vistaexpress.it
        </a>
        .
      </p>
      <h2 className="text-xl font-semibold text-gray-900 pt-2">{t('static.privacy.contactHeading')}</h2>
      <p>
        {t('static.privacy.contactBody')}{' '}
        <a href="mailto:info@vistaexpress.it" className="text-[#0066CC] hover:underline">
          info@vistaexpress.it
        </a>
      </p>
    </StaticPageShell>
  );
}
'use client';

import Link from 'next/link';
import StaticPageShell from '@/components/layout/StaticPageShell';
import { useLanguage } from '@/contexts/LanguageContext';

const EMAIL = 'info@vistaexpress.it';

export default function AffiliateContent() {
  const { t } = useLanguage();

  return (
    <StaticPageShell titleKey="static.affiliate.title">
      <p>{t('static.affiliate.intro')}</p>

      <h2 className="text-xl font-semibold text-gray-900 pt-2">{t('static.affiliate.referralHeading')}</h2>
      <p>{t('static.affiliate.referralIntro')}</p>
      <ul className="list-disc pl-5 space-y-2">
        <li>{t('static.affiliate.ref1')}</li>
        <li>{t('static.affiliate.ref2')}</li>
        <li>{t('static.affiliate.ref3')}</li>
        <li>{t('static.affiliate.ref4')}</li>
        <li>{t('static.affiliate.ref5')}</li>
        <li>{t('static.affiliate.ref6')}</li>
      </ul>
      <p>
        {t('static.affiliate.refOutro1')}{' '}
        <Link href="/profile" className="text-[#0066CC] hover:underline">
          {t('static.profileReferrals')}
        </Link>
        {t('static.affiliate.refOutro2')}
      </p>

      <h2 className="text-xl font-semibold text-gray-900 pt-2">{t('static.affiliate.affiliateHeading')}</h2>
      <p>{t('static.affiliate.affiliateIntro')}</p>

      <h3 className="text-lg font-semibold text-gray-900 pt-2">{t('static.affiliate.whoHeading')}</h3>
      <ul className="list-disc pl-5 space-y-2">
        <li>{t('static.affiliate.who1')}</li>
        <li>{t('static.affiliate.who2')}</li>
        <li>{t('static.affiliate.who3')}</li>
        <li>{t('static.affiliate.who4')}</li>
      </ul>

      <h3 className="text-lg font-semibold text-gray-900 pt-2">{t('static.affiliate.howHeading')}</h3>
      <ol className="list-decimal pl-5 space-y-2">
        <li>{t('static.affiliate.how1')}</li>
        <li>{t('static.affiliate.how2')}</li>
        <li>{t('static.affiliate.how3')}</li>
        <li>{t('static.affiliate.how4')}</li>
      </ol>

      <h3 className="text-lg font-semibold text-gray-900 pt-2">{t('static.affiliate.applyHeading')}</h3>
      <p>
        {t('static.affiliate.applyIntro')}{' '}
        <a href={`mailto:${EMAIL}`} className="text-[#0066CC] hover:underline">
          {EMAIL}
        </a>{' '}
        {t('static.affiliate.applyOutro')}
      </p>

      <h2 className="text-xl font-semibold text-gray-900 pt-2">{t('static.affiliate.questionsHeading')}</h2>
      <p>
        {t('static.affiliate.questions1')}{' '}
        <Link href="/profile" className="text-[#0066CC] hover:underline">
          {t('static.affiliate.referralsLabel')}
        </Link>{' '}
        {t('static.affiliate.questions2')}{' '}
        <Link href="/help" className="text-[#0066CC] hover:underline">
          {t('footer.helpCenter')}
        </Link>{' '}
        {t('static.affiliate.questions3')}{' '}
        <a href={`mailto:${EMAIL}`} className="text-[#0066CC] hover:underline">
          {EMAIL}
        </a>
        .
      </p>
    </StaticPageShell>
  );
}
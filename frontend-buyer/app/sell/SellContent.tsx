'use client';

import Link from 'next/link';
import StaticPageShell from '@/components/layout/StaticPageShell';
import { getSellerAppBaseUrl } from '@/lib/seller-app-url';
import { useLanguage } from '@/contexts/LanguageContext';

const EMAIL = 'info@vistaexpress.it';

export default function SellContent() {
  const { t } = useLanguage();
  const sellerBase = getSellerAppBaseUrl();

  return (
    <StaticPageShell titleKey="static.sell.title">
      <p>{t('static.sell.intro')}</p>

      <h2 className="text-xl font-semibold text-gray-900 pt-2">{t('static.sell.whyHeading')}</h2>
      <ul className="list-disc pl-5 space-y-2">
        <li>{t('static.sell.why1')}</li>
        <li>{t('static.sell.why2')}</li>
        <li>{t('static.sell.why3')}</li>
      </ul>

      <h2 className="text-xl font-semibold text-gray-900 pt-2">{t('static.sell.approvalHeading')}</h2>
      <p>{t('static.sell.approvalIntro')}</p>
      <ol className="list-decimal pl-5 space-y-2">
        <li>{t('static.sell.step1')}</li>
        <li>{t('static.sell.step2')}</li>
        <li>{t('static.sell.step3')}</li>
        <li>{t('static.sell.step4')}</li>
      </ol>

      <h2 className="text-xl font-semibold text-gray-900 pt-2">{t('static.sell.liveHeading')}</h2>
      <ul className="list-disc pl-5 space-y-2">
        <li>{t('static.sell.live1')}</li>
        <li>{t('static.sell.live2')}</li>
        <li>{t('static.sell.live3')}</li>
        <li>{t('static.sell.live4')}</li>
        <li>{t('static.sell.live5')}</li>
        <li>{t('static.sell.live6')}</li>
      </ul>

      <h2 className="text-xl font-semibold text-gray-900 pt-2">{t('static.sell.getStartedHeading')}</h2>
      <p>{t('static.sell.getStartedBody')}</p>

      <div className="not-prose my-6 rounded-2xl border border-[#0066CC]/20 bg-gradient-to-br from-[#0066CC]/5 to-[#0052a3]/5 p-6 md:p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#0066CC]">
          {t('static.sell.portalLabel')}
        </p>
        <p className="mt-2 text-[15px] text-gray-700">
          {t('static.sell.opensAt')}{' '}
          <span className="font-medium text-gray-900">{sellerBase}</span>
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <a
            href={`${sellerBase}/auth/register`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-xl bg-[#0066CC] px-6 py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-[#0052a3]"
          >
            {t('static.sell.registerCta')}
          </a>
          <a
            href={`${sellerBase}/auth/login`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-xl border-2 border-[#0066CC] bg-white px-6 py-3 text-center text-sm font-semibold text-[#0066CC] transition hover:bg-[#0066CC]/5"
          >
            {t('static.sell.signInCta')}
          </a>
          <a
            href={sellerBase}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-xl px-6 py-3 text-center text-sm font-semibold text-[#0066CC] underline-offset-2 hover:underline"
          >
            {t('static.sell.homeCta')}
          </a>
        </div>
      </div>

      <p>
        {t('static.sell.businessQuestions')}{' '}
        <a href={`mailto:${EMAIL}`} className="text-[#0066CC] hover:underline">
          {EMAIL}
        </a>
      </p>
      <p>
        <Link href="/auth/register" className="text-[#0066CC] font-semibold hover:underline">
          {t('static.sell.createBuyerAccount')}
        </Link>{' '}
        {t('static.sell.createBuyerTail')}
      </p>
    </StaticPageShell>
  );
}
'use client';

import Link from 'next/link';
import StaticPageShell from '@/components/layout/StaticPageShell';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ReturnsContent() {
  const { t } = useLanguage();

  return (
    <StaticPageShell titleKey="static.returns.title">
      <p>{t('static.returns.intro')}</p>

      <h2 className="text-xl font-semibold text-gray-900 pt-2">{t('static.returns.windowHeading')}</h2>
      <ul className="list-disc pl-5 space-y-2">
        <li>{t('static.returns.window1')}</li>
        <li>{t('static.returns.window2')}</li>
        <li>{t('static.returns.window3')}</li>
      </ul>

      <h2 className="text-xl font-semibold text-gray-900 pt-2">{t('static.returns.excludedHeading')}</h2>
      <p>{t('static.returns.excludedIntro')}</p>
      <ul className="list-disc pl-5 space-y-2">
        <li>{t('static.returns.excluded1')}</li>
        <li>{t('static.returns.excluded2')}</li>
        <li>{t('static.returns.excluded3')}</li>
      </ul>
      <p>{t('static.returns.excludedOutro')}</p>

      <h2 className="text-xl font-semibold text-gray-900 pt-2">{t('static.returns.requestHeading')}</h2>
      <p>{t('static.returns.requestIntro')}</p>
      <ol className="list-decimal pl-5 space-y-2">
        <li>
          {t('static.returns.step1')}{' '}
          <Link href="/orders" className="text-[#0066CC] hover:underline">
            {t('static.myOrders')}
          </Link>
          .
        </li>
        <li>
          {t('static.returns.step2')}{' '}
          <a href="mailto:info@vistaexpress.it" className="text-[#0066CC] hover:underline">
            info@vistaexpress.it
          </a>{' '}
          {t('static.returns.step2Tail')}
        </li>
        <li>{t('static.returns.step3')}</li>
        <li>{t('static.returns.step4')}</li>
      </ol>

      <h2 className="text-xl font-semibold text-gray-900 pt-2">{t('static.returns.refundsHeading')}</h2>
      <ul className="list-disc pl-5 space-y-2">
        <li>{t('static.returns.refund1')}</li>
        <li>
          {t('static.returns.refund2')}{' '}
          <Link href="/profile" className="text-[#0066CC] hover:underline">
            {t('static.profileWallet')}
          </Link>
          .
        </li>
        <li>{t('static.returns.refund3')}</li>
        <li>{t('static.returns.refund4')}</li>
      </ul>

      <h2 className="text-xl font-semibold text-gray-900 pt-2">{t('static.returns.cancellationHeading')}</h2>
      <p>{t('static.returns.cancellationBody')}</p>

      <p>
        {t('static.returns.legalPrefix')}{' '}
        <Link href="/terms" className="text-[#0066CC] hover:underline">
          {t('footer.termsOfService')}
        </Link>
        . {t('static.returns.questionsLabel')}{' '}
        <a href="mailto:info@vistaexpress.it" className="text-[#0066CC] hover:underline">
          info@vistaexpress.it
        </a>
        .
      </p>
    </StaticPageShell>
  );
}
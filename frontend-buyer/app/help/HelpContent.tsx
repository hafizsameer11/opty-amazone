'use client';

import Link from 'next/link';
import StaticPageShell from '@/components/layout/StaticPageShell';
import { useLanguage } from '@/contexts/LanguageContext';

const policyStyle = { fontWeight: 600, color: '#0066CC' } as const;

const EMAIL = 'info@vistaexpress.it';

export default function HelpContent() {
  const { t } = useLanguage();
  const mail = `mailto:${EMAIL}`;

  return (
    <StaticPageShell titleKey="static.help.title">
      <p>
        {t('static.help.intro1')}{' '}
        <a href={mail} className="text-[#0066CC] hover:underline">
          {EMAIL}
        </a>{' '}
        {t('static.help.intro2')}
      </p>

      <h2 className="text-xl font-semibold text-gray-900 pt-2">{t('static.help.shoppingHeading')}</h2>
      <ul className="list-disc pl-5 space-y-2">
        <li>
          <span style={policyStyle}>{t('static.help.shopping1Lead')}</span> {t('static.help.shopping1a')}{' '}
          <Link href="/orders" className="text-[#0066CC] hover:underline">
            {t('static.myOrders')}
          </Link>
          .
        </li>
        <li>
          <span style={policyStyle}>{t('static.help.shopping2Lead')}</span> {t('static.help.shopping2')}
        </li>
        <li>
          <span style={policyStyle}>{t('static.help.shopping3Lead')}</span> {t('static.help.shopping3')}
        </li>
        <li>
          <span style={policyStyle}>{t('static.help.shopping4Lead')}</span> {t('static.help.shopping4')}
        </li>
        <li>
          <span style={policyStyle}>{t('static.help.shopping5Lead')}</span> {t('static.help.shopping5a')}{' '}
          <Link href="/categories" className="text-[#0066CC] hover:underline">
            {t('static.help.category')}
          </Link>{' '}
          {t('static.help.shopping5b')}
        </li>
      </ul>

      <h2 className="text-xl font-semibold text-gray-900 pt-2">{t('static.help.paymentHeading')}</h2>
      <ul className="list-disc pl-5 space-y-2">
        <li>
          <span style={policyStyle}>{t('static.help.payment1Lead')}</span> {t('static.help.payment1')}
        </li>
        <li>
          <span style={policyStyle}>{t('static.help.payment2Lead')}</span> {t('static.help.payment2a')}{' '}
          <Link href="/profile" className="text-[#0066CC] hover:underline">
            {t('static.profileWallet')}
          </Link>
          {t('static.help.payment2b')}
        </li>
        <li>
          <span style={policyStyle}>{t('static.help.payment3Lead')}</span> {t('static.help.payment3')}
        </li>
        <li>
          <span style={policyStyle}>{t('static.help.payment4Lead')}</span> {t('static.help.payment4')}
        </li>
      </ul>

      <h2 className="text-xl font-semibold text-gray-900 pt-2">{t('static.help.deliveryHeading')}</h2>
      <ul className="list-disc pl-5 space-y-2">
        <li>
          <span style={policyStyle}>{t('static.help.delivery1Lead')}</span> {t('static.help.delivery1a')}{' '}
          <Link href="/shipping" className="text-[#0066CC] hover:underline">
            {t('footer.shippingInfo')}
          </Link>{' '}
          {t('static.help.delivery1b')}
        </li>
        <li>
          <span style={policyStyle}>{t('static.help.delivery2Lead')}</span> {t('static.help.delivery2')}
        </li>
        <li>
          <span style={policyStyle}>{t('static.help.delivery3Lead')}</span> {t('static.help.delivery3')}
        </li>
        <li>
          <span style={policyStyle}>{t('static.help.delivery4Lead')}</span> {t('static.help.delivery4')}
        </li>
      </ul>

      <h2 className="text-xl font-semibold text-gray-900 pt-2">{t('static.help.returnsHeading')}</h2>
      <p>
        {t('static.help.returnsIntro1')}{' '}
        <Link href="/returns" className="text-[#0066CC] hover:underline">
          {t('footer.returns')}
        </Link>{' '}
        {t('static.help.returnsIntro2')}
      </p>
      <p>
        <span style={policyStyle}>{t('static.help.returnRequestLead')}</span> {t('static.help.returnRequest1')}{' '}
        <Link href="/orders" className="text-[#0066CC] hover:underline">
          {t('static.myOrders')}
        </Link>
        {t('static.help.returnRequest2')}{' '}
        <a href={mail} className="text-[#0066CC] hover:underline">
          {EMAIL}
        </a>{' '}
        {t('static.help.returnRequest3')}
      </p>

      <h2 className="text-xl font-semibold text-gray-900 pt-2">{t('static.help.accountHeading')}</h2>
      <ul className="list-disc pl-5 space-y-2">
        <li>
          <span style={policyStyle}>{t('static.help.account1Lead')}</span> {t('static.help.account1a')}{' '}
          <Link href="/profile" className="text-[#0066CC] hover:underline">
            {t('static.profile')}
          </Link>
          {t('static.help.account1b')}
        </li>
        <li>
          <span style={policyStyle}>{t('static.help.account2Lead')}</span> {t('static.help.account2')}
        </li>
        <li>
          <span style={policyStyle}>{t('static.help.account3Lead')}</span> {t('static.help.account3')}
        </li>
        <li>
          <span style={policyStyle}>{t('static.help.account4Lead')}</span> {t('static.help.account4')}
        </li>
        <li>
          <span style={policyStyle}>{t('static.help.account5Lead')}</span> {t('static.help.account5a')}{' '}
          <Link href="/privacy" className="text-[#0066CC] hover:underline">
            {t('footer.privacyPolicy')}
          </Link>
          .
        </li>
      </ul>

      <h2 className="text-xl font-semibold text-gray-900 pt-2">{t('static.help.sellingHeading')}</h2>
      <ul className="list-disc pl-5 space-y-2">
        <li>
          <span style={policyStyle}>{t('static.help.selling1Lead')}</span> {t('static.help.selling1a')}{' '}
          <Link href="/sell" className="text-[#0066CC] hover:underline">
            {t('static.sell.title')}
          </Link>{' '}
          {t('static.help.selling1b')}
        </li>
        <li>
          <span style={policyStyle}>{t('static.help.selling2Lead')}</span> {t('static.help.selling2a')}{' '}
          <Link href="/affiliate" className="text-[#0066CC] hover:underline">
            {t('footer.affiliateProgram')}
          </Link>{' '}
          {t('static.help.selling2b')}
        </li>
        <li>
          <span style={policyStyle}>{t('static.help.selling3Lead')}</span> {t('static.help.selling3a')}{' '}
          <Link href="/profile" className="text-[#0066CC] hover:underline">
            {t('static.profileReferrals')}
          </Link>
          {t('static.help.selling3b')}
        </li>
      </ul>

      <h2 className="text-xl font-semibold text-gray-900 pt-2">{t('static.help.contactHeading')}</h2>
      <p>
        {t('static.help.contactEmailLabel')}{' '}
        <a href={mail} className="text-[#0066CC] hover:underline">
          {EMAIL}
        </a>
        <br />
        {t('static.help.contactSellerLabel')}{' '}
        <a href={mail} className="text-[#0066CC] hover:underline">
          {EMAIL}
        </a>
        <br />
        {t('static.help.contactOutro')}
      </p>
    </StaticPageShell>
  );
}
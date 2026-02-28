'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto">
      <div className="w-full px-2 sm:px-3 lg:px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-white font-semibold mb-4">{t('getToKnowUs')}</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/about" className="hover:text-white transition-colors">{t('aboutUs')}</Link></li>
              <li><Link href="/careers" className="hover:text-white transition-colors">{t('careers')}</Link></li>
              <li><Link href="/press" className="hover:text-white transition-colors">{t('pressReleases')}</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-4">{t('makeMoneyWithUs')}</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/sell" className="hover:text-white transition-colors">{t('sellOnOpticalMarket')}</Link></li>
              <li><Link href="/affiliate" className="hover:text-white transition-colors">{t('affiliateProgram')}</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-4">{t('customerService')}</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/help" className="hover:text-white transition-colors">{t('helpCenter')}</Link></li>
              <li><Link href="/returns" className="hover:text-white transition-colors">{t('returns')}</Link></li>
              <li><Link href="/shipping" className="hover:text-white transition-colors">{t('shippingInfo')}</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-4">{t('legal')}</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/privacy" className="hover:text-white transition-colors">{t('privacyPolicy')}</Link></li>
              <li><Link href="/terms" className="hover:text-white transition-colors">{t('termsOfService')}</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} OpticalMarket. {t('allRightsReserved')}</p>
        </div>
      </div>
    </footer>
  );
}


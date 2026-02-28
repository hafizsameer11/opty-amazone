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
            <h3 className="text-white font-semibold mb-4">{t('sellerResources')}</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/dashboard" className="hover:text-white transition-colors">{t('dashboard')}</Link></li>
              <li><Link href="/orders" className="hover:text-white transition-colors">{t('orders')}</Link></li>
              <li><Link href="/products" className="hover:text-white transition-colors">{t('products')}</Link></li>
              <li><Link href="/store" className="hover:text-white transition-colors">{t('storeSettings')}</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-4">{t('marketingTools')}</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/promotions" className="hover:text-white transition-colors">{t('discountCampaigns')}</Link></li>
              <li><Link href="/boost-ads" className="hover:text-white transition-colors">{t('boostAds')}</Link></li>
              <li><Link href="/announcements" className="hover:text-white transition-colors">{t('announcements')}</Link></li>
              <li><Link href="/banners" className="hover:text-white transition-colors">{t('banners')}</Link></li>
              <li><Link href="/subscriptions" className="hover:text-white transition-colors">{t('subscriptions')}</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-4">{t('support')}</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/help" className="hover:text-white transition-colors">{t('helpCenter')}</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">{t('contactSupport')}</Link></li>
              <li><Link href="/faq" className="hover:text-white transition-colors">{t('faq')}</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-4">{t('legal')}</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/privacy" className="hover:text-white transition-colors">{t('privacyPolicy')}</Link></li>
              <li><Link href="/terms" className="hover:text-white transition-colors">{t('termsOfService')}</Link></li>
              <li><Link href="/seller-agreement" className="hover:text-white transition-colors">{t('sellerAgreement')}</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} OpticalMarket Seller Portal. {t('allRightsReserved')}</p>
        </div>
      </div>
    </footer>
  );
}


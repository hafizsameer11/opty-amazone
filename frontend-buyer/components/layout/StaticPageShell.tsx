'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';

type StaticPageShellProps = {
  /** Translation key for the page title. */
  titleKey: string;
  children: React.ReactNode;
};

/**
 * Shared chrome for the static content pages (help, returns, shipping, privacy,
 * terms, sell, affiliate).
 *
 * It is a client component because the title comes from the language context,
 * so every page using it needs the same treatment to get translated output.
 */
export default function StaticPageShell({ titleKey, children }: StaticPageShellProps) {
  const { t } = useLanguage();
  const title = t(titleKey);

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-8 md:py-12">
      <nav className="text-sm text-gray-600 mb-6" aria-label={t('static.breadcrumb')}>
        <Link href="/" className="text-[#0066CC] hover:underline">
          {t('static.home')}
        </Link>
        <span className="mx-2 text-gray-400">/</span>
        <span className="text-gray-900 font-medium">{title}</span>
      </nav>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
      <p className="text-sm text-gray-500 mb-8">{t('static.tagline')}</p>
      <div className="text-gray-700 space-y-5 text-[15px] leading-relaxed">{children}</div>
    </div>
  );
}
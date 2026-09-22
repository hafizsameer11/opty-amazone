'use client';

import { useLanguage } from '@/contexts/LanguageContext';

export default function LanguageSwitcher({
  variant = 'header',
}: {
  variant?: 'header' | 'dock';
}) {
  const { language, setLanguage, t } = useLanguage();

  const shell =
    variant === 'dock'
      ? 'inline-flex items-center rounded-lg border border-gray-200 bg-white p-1 shadow-sm'
      : 'inline-flex items-center rounded-lg border border-gray-200 bg-white p-1';

  const active = 'bg-[#0066CC] text-white';
  const idle = 'text-gray-600 hover:bg-gray-100';

  return (
    <div className={`${shell} notranslate`} role="group" aria-label={t('common.language')}>
      <button
        type="button"
        onClick={() => setLanguage('en')}
        className={`px-2.5 py-1 text-xs font-semibold rounded ${language === 'en' ? active : idle}`}
        aria-pressed={language === 'en'}
        aria-label={t('common.switchTo', { language: t('common.english') })}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLanguage('it')}
        className={`px-2.5 py-1 text-xs font-semibold rounded ${language === 'it' ? active : idle}`}
        aria-pressed={language === 'it'}
        aria-label={t('common.switchTo', { language: t('common.italian') })}
      >
        IT
      </button>
    </div>
  );
}

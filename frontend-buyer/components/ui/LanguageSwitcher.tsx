'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function LanguageSwitcher({
  variant = 'header',
}: {
  variant?: 'header' | 'dock';
}) {
  const { language, setLanguage, t } = useLanguage();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const shell =
    variant === 'dock'
      ? 'inline-flex items-center rounded-lg border border-gray-200 bg-white p-1 shadow-sm'
      : 'inline-flex items-center rounded-md border border-white/20 bg-white/10 p-0.5';

  const active =
    variant === 'dock'
      ? 'bg-[#0066CC] text-white'
      : 'bg-white text-[#131921]';

  const idle =
    variant === 'dock'
      ? 'text-gray-600 hover:bg-gray-100'
      : 'text-white hover:bg-white/20';

  return (
    <div className={`${shell} notranslate`} role="group" aria-label={t('nav.language')}>
      <button
        type="button"
        onClick={() => setLanguage('en')}
        className={`px-2.5 py-1 text-xs font-semibold rounded ${(!mounted || language === 'en') ? active : idle}`}
        aria-pressed={mounted ? language === 'en' : undefined}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLanguage('it')}
        className={`px-2.5 py-1 text-xs font-semibold rounded ${mounted && language === 'it' ? active : idle}`}
        aria-pressed={mounted ? language === 'it' : undefined}
      >
        IT
      </button>
    </div>
  );
}

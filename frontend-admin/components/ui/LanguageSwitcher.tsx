'use client';

import { useLanguage } from '@/contexts/LanguageContext';

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="inline-flex items-center rounded-lg border border-white/30 bg-white/10 p-1">
      <button
        type="button"
        onClick={() => setLanguage('en')}
        className={`px-2 py-1 text-xs font-semibold rounded ${language === 'en' ? 'bg-white text-[#111827]' : 'text-white hover:bg-white/20'}`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLanguage('it')}
        className={`px-2 py-1 text-xs font-semibold rounded ${language === 'it' ? 'bg-white text-[#111827]' : 'text-white hover:bg-white/20'}`}
      >
        IT
      </button>
    </div>
  );
}

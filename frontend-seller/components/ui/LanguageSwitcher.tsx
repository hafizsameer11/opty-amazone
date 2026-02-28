'use client';

import { useLanguage } from '@/contexts/LanguageContext';

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="inline-flex items-center rounded-lg border border-gray-200 bg-white p-1">
      <button
        type="button"
        onClick={() => setLanguage('en')}
        className={`px-2 py-1 text-xs font-semibold rounded ${language === 'en' ? 'bg-[#0066CC] text-white' : 'text-gray-600 hover:bg-gray-100'}`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLanguage('it')}
        className={`px-2 py-1 text-xs font-semibold rounded ${language === 'it' ? 'bg-[#0066CC] text-white' : 'text-gray-600 hover:bg-gray-100'}`}
      >
        IT
      </button>
    </div>
  );
}

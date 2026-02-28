'use client';

import { useEffect } from 'react';
import Script from 'next/script';

declare global {
  interface Window {
    google?: {
      translate?: {
        TranslateElement?: new (
          options: Record<string, unknown>,
          elementId: string
        ) => unknown;
      };
    };
    googleTranslateElementInitAdmin?: () => void;
    __googleTranslateAdminInitialized?: boolean;
  }
}

const ELEMENT_ID = 'google_translate_element_admin';

export default function GoogleTranslateWidget() {
  useEffect(() => {
    window.googleTranslateElementInitAdmin = () => {
      if (window.__googleTranslateAdminInitialized) return;
      if (!window.google?.translate?.TranslateElement) return;

      new window.google.translate.TranslateElement(
        {
          pageLanguage: 'en',
          includedLanguages: 'en,it',
          autoDisplay: false,
        },
        ELEMENT_ID
      );
      window.__googleTranslateAdminInitialized = true;
    };

    if (window.google?.translate?.TranslateElement) {
      window.googleTranslateElementInitAdmin?.();
    }
  }, []);

  return (
    <>
      <Script
        id="google-translate-script-admin"
        src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInitAdmin"
        strategy="afterInteractive"
      />
      <div className="fixed bottom-20 right-3 z-[1000] rounded-md bg-white p-2 shadow-lg">
        <div id={ELEMENT_ID} />
      </div>
    </>
  );
}

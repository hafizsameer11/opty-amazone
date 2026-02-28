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
    googleTranslateElementInitSeller?: () => void;
    __googleTranslateSellerInitialized?: boolean;
  }
}

const ELEMENT_ID = 'google_translate_element_seller';

export default function GoogleTranslateWidget() {
  useEffect(() => {
    window.googleTranslateElementInitSeller = () => {
      if (window.__googleTranslateSellerInitialized) return;
      if (!window.google?.translate?.TranslateElement) return;

      new window.google.translate.TranslateElement(
        {
          pageLanguage: 'en',
          includedLanguages: 'en,it',
          autoDisplay: false,
        },
        ELEMENT_ID
      );
      window.__googleTranslateSellerInitialized = true;
    };

    if (window.google?.translate?.TranslateElement) {
      window.googleTranslateElementInitSeller?.();
    }
  }, []);

  return (
    <>
      <Script
        id="google-translate-script-seller"
        src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInitSeller"
        strategy="afterInteractive"
      />
      <div className="fixed bottom-20 right-3 z-[1000] rounded-md bg-white p-2 shadow-lg">
        <div id={ELEMENT_ID} />
      </div>
    </>
  );
}

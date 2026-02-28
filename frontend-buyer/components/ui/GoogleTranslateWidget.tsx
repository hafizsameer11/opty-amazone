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
    googleTranslateElementInitBuyer?: () => void;
    __googleTranslateBuyerInitialized?: boolean;
  }
}

const ELEMENT_ID = 'google_translate_element_buyer';

export default function GoogleTranslateWidget() {
  useEffect(() => {
    window.googleTranslateElementInitBuyer = () => {
      if (window.__googleTranslateBuyerInitialized) return;
      if (!window.google?.translate?.TranslateElement) return;

      new window.google.translate.TranslateElement(
        {
          pageLanguage: 'en',
          includedLanguages: 'en,it',
          autoDisplay: false,
        },
        ELEMENT_ID
      );
      window.__googleTranslateBuyerInitialized = true;
    };

    if (window.google?.translate?.TranslateElement) {
      window.googleTranslateElementInitBuyer?.();
    }
  }, []);

  return (
    <>
      <Script
        id="google-translate-script-buyer"
        src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInitBuyer"
        strategy="afterInteractive"
      />
      <div className="fixed bottom-20 right-3 z-[1000] rounded-md bg-white p-2 shadow-lg">
        <div id={ELEMENT_ID} />
      </div>
    </>
  );
}

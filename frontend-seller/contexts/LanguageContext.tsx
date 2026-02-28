'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

type Language = 'en' | 'it';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    dashboard: 'Dashboard',
    seller: 'Seller',
    yourProfile: 'Your Profile',
    storeSettings: 'Store Settings',
    signOut: 'Sign out',
    guide: 'Guide',
    store: 'Store',
    products: 'Products',
    lensConfiguration: 'Lens Configuration',
    prescriptionOptions: 'Prescription Options',
    fieldConfiguration: 'Field Configuration',
    orders: 'Orders',
    discountCampaigns: 'Discount Campaigns',
    boostAds: 'Boost Ads',
    announcements: 'Announcements',
    banners: 'Banners',
    analytics: 'Analytics',
    messages: 'Messages',
    viewProfile: 'View Profile',
    user: 'User',
    profile: 'Profile',
    discounts: 'Discounts',
    sellerHub: 'Seller Hub',
    sellerResources: 'Seller Resources',
    marketingTools: 'Marketing Tools',
    support: 'Support',
    legal: 'Legal',
    subscriptions: 'Subscriptions',
    helpCenter: 'Help Center',
    contactSupport: 'Contact Support',
    faq: 'FAQ',
    privacyPolicy: 'Privacy Policy',
    termsOfService: 'Terms of Service',
    sellerAgreement: 'Seller Agreement',
    allRightsReserved: 'All rights reserved.',
  },
  it: {
    dashboard: 'Dashboard',
    seller: 'Venditore',
    yourProfile: 'Il tuo profilo',
    storeSettings: 'Impostazioni negozio',
    signOut: 'Esci',
    guide: 'Guida',
    store: 'Negozio',
    products: 'Prodotti',
    lensConfiguration: 'Configurazione lenti',
    prescriptionOptions: 'Opzioni prescrizione',
    fieldConfiguration: 'Configurazione campi',
    orders: 'Ordini',
    discountCampaigns: 'Campagne sconto',
    boostAds: 'Annunci Boost',
    announcements: 'Annunci',
    banners: 'Banner',
    analytics: 'Analisi',
    messages: 'Messaggi',
    viewProfile: 'Visualizza profilo',
    user: 'Utente',
    profile: 'Profilo',
    discounts: 'Sconti',
    sellerHub: 'Hub Venditore',
    sellerResources: 'Risorse venditore',
    marketingTools: 'Strumenti marketing',
    support: 'Supporto',
    legal: 'Legale',
    subscriptions: 'Abbonamenti',
    helpCenter: 'Centro assistenza',
    contactSupport: 'Contatta supporto',
    faq: 'FAQ',
    privacyPolicy: 'Informativa privacy',
    termsOfService: 'Termini di servizio',
    sellerAgreement: 'Accordo venditore',
    allRightsReserved: 'Tutti i diritti riservati.',
  },
};

const STORAGE_KEY = 'seller_language';

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (saved === 'en' || saved === 'it') {
      setLanguageState(saved);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, language);
      document.documentElement.lang = language;
    }
  }, [language]);

  const setLanguage = (next: Language) => setLanguageState(next);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t: (key: string) => translations[language][key] || key,
    }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

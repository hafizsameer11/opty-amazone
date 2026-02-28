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
    all: 'All',
    account: 'Account',
    signOut: 'Sign Out',
    signIn: 'Sign In',
    register: 'Register',
    allCategories: 'All Categories',
    searchPlaceholder: 'Search for glasses, lenses, and more...',
    search: 'Search',
    cart: 'Cart',
    hello: 'Hello',
    accountLists: 'Account & Lists',
    home: 'Home',
    categories: 'Categories',
    orders: 'Orders',
    profile: 'Profile',
    getToKnowUs: 'Get to Know Us',
    aboutUs: 'About Us',
    careers: 'Careers',
    pressReleases: 'Press Releases',
    makeMoneyWithUs: 'Make Money with Us',
    sellOnOpticalMarket: 'Sell on OpticalMarket',
    affiliateProgram: 'Affiliate Program',
    customerService: 'Customer Service',
    helpCenter: 'Help Center',
    returns: 'Returns',
    shippingInfo: 'Shipping Info',
    legal: 'Legal',
    privacyPolicy: 'Privacy Policy',
    termsOfService: 'Terms of Service',
    allRightsReserved: 'All rights reserved.',
  },
  it: {
    all: 'Tutti',
    account: 'Account',
    signOut: 'Esci',
    signIn: 'Accedi',
    register: 'Registrati',
    allCategories: 'Tutte le categorie',
    searchPlaceholder: 'Cerca occhiali, lenti e altro...',
    search: 'Cerca',
    cart: 'Carrello',
    hello: 'Ciao',
    accountLists: 'Account e Liste',
    home: 'Home',
    categories: 'Categorie',
    orders: 'Ordini',
    profile: 'Profilo',
    getToKnowUs: 'Scopri di più',
    aboutUs: 'Chi siamo',
    careers: 'Carriere',
    pressReleases: 'Comunicati stampa',
    makeMoneyWithUs: 'Guadagna con noi',
    sellOnOpticalMarket: 'Vendi su OpticalMarket',
    affiliateProgram: 'Programma affiliati',
    customerService: 'Servizio clienti',
    helpCenter: 'Centro assistenza',
    returns: 'Resi',
    shippingInfo: 'Info spedizione',
    legal: 'Legale',
    privacyPolicy: 'Informativa sulla privacy',
    termsOfService: 'Termini di servizio',
    allRightsReserved: 'Tutti i diritti riservati.',
  },
};

const STORAGE_KEY = 'buyer_language';

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

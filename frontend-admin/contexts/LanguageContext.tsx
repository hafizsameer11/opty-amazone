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
    users: 'Users',
    sellers: 'Sellers',
    products: 'Products',
    orders: 'Orders',
    categories: 'Categories',
    coupons: 'Coupons',
    analytics: 'Analytics',
    settings: 'Settings',
    activityLogs: 'Activity Logs',
    points: 'Points',
    adminPanel: 'Admin Panel',
    opticalMarketplace: 'Optical Marketplace',
    logout: 'Logout',
    admin: 'Admin',
  },
  it: {
    dashboard: 'Dashboard',
    users: 'Utenti',
    sellers: 'Venditori',
    products: 'Prodotti',
    orders: 'Ordini',
    categories: 'Categorie',
    coupons: 'Coupon',
    analytics: 'Analitiche',
    settings: 'Impostazioni',
    activityLogs: 'Registro attività',
    points: 'Punti',
    adminPanel: 'Pannello Admin',
    opticalMarketplace: 'Marketplace Ottico',
    logout: 'Esci',
    admin: 'Admin',
  },
};

const STORAGE_KEY = 'admin_language';

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

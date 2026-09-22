'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { buyerLegacyCopy, buyerTranslations, type BuyerLanguage } from './buyer-translations';

type Variables = Record<string, string | number>;

interface LanguageContextType {
  language: BuyerLanguage;
  setLanguage: (language: BuyerLanguage) => void;
  toggleLanguage: () => void;
  t: (key: string, variables?: Variables) => string;
}

const STORAGE_KEY = 'buyer_language';
const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const legacyAliases: Record<string, string> = {
  all: 'common.all', account: 'common.account', signOut: 'nav.signOut', signIn: 'nav.signIn', register: 'nav.register',
  allCategories: 'nav.allCategories', searchPlaceholder: 'search.placeholder', search: 'common.search', cart: 'common.cart',
  hello: 'nav.hello', accountLists: 'nav.accountLists', home: 'common.home', categories: 'common.categories',
  orders: 'common.orders', profile: 'common.profile', brandName: 'common.brand', getToKnowUs: 'footer.getToKnowUs',
  aboutUs: 'footer.aboutUs', careers: 'footer.careers', pressReleases: 'footer.pressReleases', makeMoneyWithUs: 'footer.makeMoneyWithUs',
  sellOnOpticalMarket: 'footer.sellOnMarketplace', affiliateProgram: 'footer.affiliateProgram', customerService: 'footer.customerService',
  helpCenter: 'footer.helpCenter', returns: 'footer.returns', shippingInfo: 'footer.shippingInfo', legal: 'footer.legal',
  privacyPolicy: 'footer.privacyPolicy', termsOfService: 'footer.termsOfService', allRightsReserved: 'footer.allRightsReserved',
};

const normalize = (value: string) => value.replace(/\s+/g, ' ').trim();
const interpolate = (value: string, variables: Variables) => value.replace(/\{(\w+)\}/g, (_, name: string) => String(variables[name] ?? `{${name}}`));

function buildEnglishToItalian() {
  const map = new Map<string, string>();
  Object.entries(buyerTranslations.en).forEach(([key, english]) => {
    const italian = buyerTranslations.it[key];
    if (italian && english !== italian) {
      const normalized = normalize(english);
      map.set(normalized, italian);
      map.set(normalized.toLowerCase(), italian);
    }
  });
  Object.entries(buyerLegacyCopy).forEach(([english, italian]) => {
    const normalized = normalize(english);
    map.set(normalized, italian);
    map.set(normalized.toLowerCase(), italian);
  });
  return map;
}

function buildItalianToEnglish() {
  const map = new Map<string, string>();
  const add = (english: string, italian: string) => {
    const source = normalize(english);
    const translated = normalize(italian);
    if (!source || !translated || source === translated) return;
    if (!map.has(translated)) map.set(translated, source);
    if (!map.has(translated.toLowerCase())) map.set(translated.toLowerCase(), source);
  };
  Object.entries(buyerTranslations.en).forEach(([key, english]) => {
    const italian = buyerTranslations.it[key];
    if (italian) add(english, italian);
  });
  Object.entries(buyerLegacyCopy).forEach(([english, italian]) => add(english, italian));
  return map;
}

const textOriginals = new WeakMap<Text, string>();
const attributeOriginals = new WeakMap<Element, Record<string, string>>();

function shouldSkip(element: Element | null) {
  if (!element) return true;
  const protectedElement = element.closest('.notranslate, [data-no-translate]');
  // The document root carries Google's `notranslate` class. It must not
  // prevent the application-owned translator from seeing the buyer UI.
  return Boolean(protectedElement && protectedElement !== document.documentElement);
}

function translateLegacyValue(source: string, language: BuyerLanguage, englishToItalian: Map<string, string>) {
  const clean = normalize(source);
  if (!clean) return source;
  if (language === 'en') return clean;
  const exact = englishToItalian.get(clean) ?? englishToItalian.get(clean.toLowerCase());
  if (exact) return exact;
  let result = clean;
  const exactFallbacks: Record<string, string> = {
    'Loading...': 'Caricamento...', 'Loading…': 'Caricamento…', Pending: 'In attesa', Approved: 'Approvato',
    Rejected: 'Rifiutato', Active: 'Attivo', Inactive: 'Inattivo', Cancelled: 'Annullato', Delivered: 'Consegnato',
    Shipped: 'Spedito', Processing: 'In elaborazione', 'Awaiting payment': 'In attesa di pagamento', Payment: 'Pagamento',
    Delivery: 'Consegna', Order: 'Ordine', Store: 'Negozio', Product: 'Prodotto', Products: 'Prodotti', Reviews: 'Recensioni',
    Followers: 'Follower', Rating: 'Valutazione', Total: 'Totale', Subtotal: 'Subtotale',
  };
  if (exactFallbacks[clean]) return exactFallbacks[clean];
  result = result.replace(/^You have (\d+) unread notification$/, '$1 notifica non letta');
  result = result.replace(/^You have (\d+) unread notifications$/, '$1 notifiche non lette');
  result = result.replace(/^Showing (\d+) of (\d+) products$/, 'Visualizzati $1 di $2 prodotti');
  result = result.replace(/^Showing (\d+) of (\d+) stores$/, 'Visualizzati $1 di $2 negozi');
  result = result.replace(/^Page (\d+) of (\d+)$/, 'Pagina $1 di $2');
  result = result.replace(/^Order #(\d+)$/, 'Ordine n. $1');
  result = result.replace(/^Store Order #(\d+)$/, 'Ordine negozio n. $1');
  result = result.replace(/^Items \((\d+)\)$/, 'Articoli ($1)');
  result = result.replace(/^Quantity: (\d+)$/, 'Quantità: $1');
  result = result.replace(/^Attached: (.+)$/, 'Allegato: $1');
  result = result.replace(/^Only buyer accounts can message stores\. You are signed in as a (.+)\.$/, 'Solo gli account cliente possono inviare messaggi ai negozi. Hai effettuato l’accesso come $1.');
  result = result.replace(/^Open (.+) categories$/, 'Apri le categorie di $1');
  result = result.replace(/^(\d+) store(s?)$/, '$1 negozio$2');
  result = result.replace(/^(\d+) item(s?)$/, '$1 articol$2');
  result = result.replace(/^\+(\d+) more store(s?)$/, '+$1 altri negozi');
  result = result.replace(/^(\d+) out of 5 stars$/, '$1 stelle su 5');
  result = result.replace(/^Withdrawal request of €([\d.]+) submitted successfully$/, 'Richiesta di prelievo di €$1 inviata con successo');
  result = result.replace(/^Redeemed (\d+) points for €([\d.]+) discount$/, 'Riscattati $1 punti per uno sconto di €$2');
  result = result.replace(/^Ticket (.+) was created\.$/, 'Ticket $1 creato.');
  return result;
}

function installBuyerLegacyTranslator(language: BuyerLanguage) {
  if (typeof document === 'undefined') return undefined;
  const englishToItalian = buildEnglishToItalian();
  const italianToEnglish = buildItalianToEnglish();
  const knownItalian = new Set(englishToItalian.values());
  const update = (root: Node) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    let node: Node | null;
    while ((node = walker.nextNode())) nodes.push(node as Text);
    nodes.forEach((textNode) => {
      const parent = textNode.parentElement;
      if (shouldSkip(parent)) return;
      const current = textNode.nodeValue || '';
      const existing = textOriginals.get(textNode);
      const currentNormalized = normalize(current);
      if (!existing) {
        textOriginals.set(textNode, italianToEnglish.get(currentNormalized) ?? italianToEnglish.get(currentNormalized.toLowerCase()) ?? current);
      } else if (currentNormalized !== normalize(existing) && !knownItalian.has(currentNormalized)) {
        textOriginals.set(textNode, current);
      }
      const source = textOriginals.get(textNode) || current;
      const leading = source.match(/^\s*/)?.[0] || '';
      const trailing = source.match(/\s*$/)?.[0] || '';
      const translated = language === 'it' ? translateLegacyValue(source, language, englishToItalian) : normalize(source);
      const next = `${leading}${translated}${trailing}`;
      if (next !== current) textNode.nodeValue = next;
    });
    if (root instanceof Element || root instanceof Document) {
      const descendants = Array.from(root.querySelectorAll<HTMLElement>('[placeholder], [aria-label], [title]'));
      const elements = root instanceof HTMLElement && root.matches('[placeholder], [aria-label], [title]') ? [root, ...descendants] : descendants;
      elements.forEach((element) => {
        if (shouldSkip(element)) return;
        const originals = attributeOriginals.get(element) || {};
        (['placeholder', 'aria-label', 'title'] as const).forEach((attribute) => {
          const current = element.getAttribute(attribute);
          if (current == null) return;
          const currentNormalized = normalize(current);
          if (!originals[attribute]) {
            originals[attribute] = italianToEnglish.get(currentNormalized) ?? italianToEnglish.get(currentNormalized.toLowerCase()) ?? current;
          } else if (current !== originals[attribute] && !englishToItalian.has(currentNormalized) && !knownItalian.has(currentNormalized)) {
            originals[attribute] = current;
          }
          const source = originals[attribute];
          const translated = language === 'it' ? translateLegacyValue(source, language, englishToItalian) : source;
          if (translated !== current) element.setAttribute(attribute, translated);
        });
        attributeOriginals.set(element, originals);
      });
    }
  };
  update(document.body);
  let applying = false;
  const observer = new MutationObserver((mutations) => {
    if (applying) return;
    applying = true;
    mutations.forEach((mutation) => {
      if (mutation.type === 'characterData' && mutation.target.parentElement) update(mutation.target.parentElement);
      mutation.addedNodes.forEach((added) => update(added));
      if (mutation.type === 'attributes' && mutation.target instanceof Element) update(mutation.target);
    });
    applying = false;
  });
  observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['placeholder', 'aria-label', 'title'] });
  return () => observer.disconnect();
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<BuyerLanguage>('en');
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'it') setLanguageState(saved);
  }, []);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
    return installBuyerLegacyTranslator(language);
  }, [language]);
  const setLanguage = useCallback((next: BuyerLanguage) => setLanguageState(next), []);
  const toggleLanguage = useCallback(() => setLanguageState((current) => current === 'en' ? 'it' : 'en'), []);
  const t = useCallback((key: string, variables: Variables = {}) => {
    const resolvedKey = legacyAliases[key] ?? key;
    const value = buyerTranslations[language][resolvedKey] ?? buyerTranslations.en[resolvedKey] ?? buyerLegacyCopy[resolvedKey] ?? resolvedKey;
    return interpolate(value, variables);
  }, [language]);
  const value = useMemo(() => ({ language, setLanguage, toggleLanguage, t }), [language, setLanguage, toggleLanguage, t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within a LanguageProvider');
  return context;
}

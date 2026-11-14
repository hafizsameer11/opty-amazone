'use client';

import { type ReactNode, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * The subscription page contains long-form, operational copy rather than
 * generic Admin labels. Keep that copy in one small, auditable dictionary so
 * the existing EN/IT language selector also works in this new module.
 */
const italian: Record<string, string> = {
  'CRM subscription management': 'Gestione abbonamenti CRM',
  'Manage seller access without changing the marketplace’s existing subscription product. Plan changes only affect new purchases; every paid subscription retains its own saved price and feature snapshot.': 'Gestisci l’accesso dei venditori senza modificare il prodotto di abbonamento esistente del marketplace. Le modifiche ai piani riguardano solo i nuovi acquisti; ogni abbonamento pagato conserva prezzo e funzionalità salvati.',
  'Create plan': 'Crea piano', 'Retry': 'Riprova', 'Available plans': 'Piani disponibili', 'Active subscriptions': 'Abbonamenti attivi', 'Recent payments': 'Pagamenti recenti', 'configured': 'configurati', 'Current result page': 'Pagina dei risultati corrente',
  'Plans and access permissions': 'Piani e permessi di accesso', 'Each feature key is enforced by the CRM backend. Keep': 'Ogni chiave funzionalità è applicata dal backend CRM. Mantieni', 'enabled for any plan that may open the CRM.': 'abilitato per ogni piano che può aprire il CRM.',
  'Refresh plans': 'Aggiorna piani', 'Loading subscription configuration…': 'Caricamento configurazione abbonamenti…', 'Available': 'Disponibile', 'Disabled': 'Disabilitato', 'No plan description has been added.': 'Non è stata aggiunta alcuna descrizione del piano.', 'No active features': 'Nessuna funzionalità attiva',
  'Edit': 'Modifica', 'Disable': 'Disabilita', 'Enable': 'Abilita', 'Seller subscriptions': 'Abbonamenti venditori', 'Suspend or cancel stops CRM APIs as well as the user interface. Manual grants are fully audited.': 'La sospensione o l’annullamento blocca le API CRM oltre all’interfaccia utente. Le concessioni manuali sono completamente registrate.',
  'Seller, shop, or subscription ID': 'Venditore, negozio o ID abbonamento', 'All statuses': 'Tutti gli stati', 'Filter': 'Filtra', 'Manual grant': 'Concessione manuale',
  'Seller / shop': 'Venditore / negozio', 'Plan': 'Piano', 'Term': 'Periodo', 'Status': 'Stato', 'Source': 'Origine', 'Actions': 'Azioni', 'History': 'Cronologia', 'Manage': 'Gestisci', 'No subscriptions match this filter.': 'Nessun abbonamento corrisponde a questo filtro.',
  'Payment history': 'Cronologia pagamenti', 'Provider amounts and statuses are retained with the subscription; admin grants are recorded as zero-value manual payments.': 'Importi e stati del fornitore sono mantenuti con l’abbonamento; le concessioni amministrative sono registrate come pagamenti manuali a valore zero.',
  'Refresh': 'Aggiorna', 'Subscription': 'Abbonamento', 'Provider': 'Fornitore', 'Amount': 'Importo', 'Recorded': 'Registrato', 'No subscription payments yet.': 'Non ci sono ancora pagamenti di abbonamento.',
  'Page': 'Pagina', 'of': 'di', 'Previous': 'Precedente', 'Next': 'Successivo',
  'Create Vista Express 360 plan': 'Crea piano Vista Express 360', 'Prices are stored in cents and versioned automatically. Changing a price never changes an already purchased subscription.': 'I prezzi sono memorizzati in centesimi e versionati automaticamente. La modifica di un prezzo non cambia mai un abbonamento già acquistato.',
  'Plan name': 'Nome piano', 'Stable slug': 'Slug stabile', 'Seller-facing description': 'Descrizione visibile al venditore', 'Display order': 'Ordine di visualizzazione', 'Available for new purchases': 'Disponibile per nuovi acquisti', 'Billing terms': 'Periodi di fatturazione', 'Price in cents': 'Prezzo in centesimi', 'Currency': 'Valuta', 'Offer this term': 'Offri questo periodo', 'CRM features and permissions': 'Funzionalità e permessi CRM', 'Feature keys become backend permission checks in Vista Express 360.': 'Le chiavi funzionalità diventano controlli di autorizzazione backend in Vista Express 360.', 'Add feature': 'Aggiungi funzionalità', 'Feature key': 'Chiave funzionalità', 'Visible label': 'Etichetta visibile', 'Description': 'Descrizione', 'Enabled': 'Abilitata', 'Remove': 'Rimuovi', 'Cancel': 'Annulla', 'Save changes': 'Salva modifiche',
  'Grant seller CRM access': 'Concedi accesso CRM al venditore', 'Use the marketplace seller ID and the store ID belonging to that seller. This creates an auditable manual subscription and does not charge the seller.': 'Usa l’ID venditore del marketplace e l’ID negozio appartenente a quel venditore. Questo crea un abbonamento manuale verificabile e non addebita il venditore.', 'Seller ID': 'ID venditore', 'Store ID': 'ID negozio', 'Access term': 'Periodo di accesso', 'Reason / internal note': 'Motivo / nota interna', 'Grant access': 'Concedi accesso',
  'Subscription history': 'Cronologia abbonamento', 'Loading payment and audit history…': 'Caricamento cronologia pagamenti e audit…', 'Payment records': 'Registrazioni pagamenti', 'No payment records are available for this subscription.': 'Non sono disponibili pagamenti per questo abbonamento.', 'Audited status changes': 'Modifiche di stato registrate', 'No subscription events have been recorded yet.': 'Non sono ancora stati registrati eventi di abbonamento.', 'Close': 'Chiudi',
  'Manage subscription': 'Gestisci abbonamento', 'Authorized action': 'Azione autorizzata', 'Extend current term': 'Estendi il periodo attuale', 'Activate / restore': 'Attiva / ripristina', 'Suspend immediately': 'Sospendi immediatamente', 'Cancel immediately': 'Annulla immediatamente', 'Extension': 'Estensione', 'Suspension and cancellation immediately deny Vista Express 360 CRM backend APIs. Seller marketplace data is preserved.': 'La sospensione e l’annullamento negano immediatamente le API backend del CRM Vista Express 360. I dati del marketplace del venditore sono preservati.', 'Extend term': 'Estendi periodo', 'Activate access': 'Attiva accesso',
  'Monthly (1 month)': 'Mensile (1 mese)', 'Semi-annual (6 months)': 'Semestrale (6 mesi)', 'Annual (12 months)': 'Annuale (12 mesi)',
};

const originals = new WeakMap<Text, string>();
const attributeOriginals = new WeakMap<Element, Record<string, string>>();

function translate(source: string, language: 'en' | 'it'): string {
  if (language === 'en') return source;
  if (italian[source]) return italian[source];
  return Object.entries(italian)
    .filter(([english]) => english.length > 5)
    .sort(([left], [right]) => right.length - left.length)
    .reduce((value, [english, valueIt]) => value.replaceAll(english, valueIt), source);
}

export default function Vista360TranslationScope({ children }: { children: ReactNode }) {
  const { language } = useLanguage();
  const scope = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = scope.current;
    if (!root) return;
    let applying = false;
    const update = () => {
      if (applying) return;
      applying = true;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const nodes: Text[] = [];
      let node: Node | null;
      while ((node = walker.nextNode())) nodes.push(node as Text);
      nodes.forEach((text) => {
        const parent = text.parentElement;
        if (!parent || parent.closest('script, style')) return;
        if (!originals.has(text)) originals.set(text, text.nodeValue || '');
        const original = originals.get(text) || '';
        const next = translate(original, language);
        if (text.nodeValue !== next) text.nodeValue = next;
      });
      root.querySelectorAll<HTMLElement>('[placeholder], [title], [aria-label]').forEach((element) => {
        const values = attributeOriginals.get(element) || {};
        ['placeholder', 'title', 'aria-label'].forEach((attribute) => {
          const current = element.getAttribute(attribute);
          if (current === null) return;
          if (!(attribute in values)) values[attribute] = current;
          const next = translate(values[attribute], language);
          if (next !== current) element.setAttribute(attribute, next);
        });
        attributeOriginals.set(element, values);
      });
      applying = false;
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(root, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [language]);

  return <div ref={scope}>{children}</div>;
}

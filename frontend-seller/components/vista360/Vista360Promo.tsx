'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { vista360Service } from '@/services/vista360-service';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Vista360Promo() {
  const { t } = useLanguage();
  const [active, setActive] = useState(false);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    let mounted = true;
    void vista360Service.subscription()
      .then((current) => { if (mounted) setActive(current.entitlement.active); })
      // The campaign/dashboard should never become unusable if the optional
      // CRM subscription endpoint is temporarily unavailable.
      .catch(() => { if (mounted) setActive(false); });
    return () => { mounted = false; };
  }, []);

  const openCrm = async () => {
    setOpening(true);
    try {
      window.location.assign((await vista360Service.crmLink()).url);
    } catch {
      // The subscription page can explain a changed/expired entitlement and
      // offers the seller the appropriate renewal choice.
      window.location.assign('/vista-express-360');
    } finally {
      setOpening(false);
    }
  };

  return (
    <section className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-[#062b61] via-[#0066CC] to-[#00a983] p-6 text-white shadow-xl sm:p-8">
      <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full border-[28px] border-white/10" />
      <div className="pointer-events-none absolute bottom-[-88px] left-[35%] h-48 w-48 rounded-full bg-cyan-300/20 blur-2xl" />
      <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="max-w-3xl">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-cyan-100">{t('vista360.promoEyebrow')}</p>
          <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t('vista360.promoTitle')}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-50 sm:text-base">{t('vista360.promoDescription')}</p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-blue-50">
            {['inventory', 'customerCare', 'sales', 'orders', 'insights'].map((item) => <span key={item} className="rounded-full border border-white/25 bg-white/10 px-3 py-1.5">{t(`vista360.benefit.${item}`)}</span>)}
          </div>
        </div>
        {active ? (
          <button type="button" disabled={opening} onClick={() => void openCrm()} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#0052A3] shadow-lg transition hover:-translate-y-0.5 hover:bg-cyan-50 disabled:cursor-wait disabled:opacity-70">{opening ? t('vista360.openingCrm') : t('vista360.openCrm')} <span className="ml-2">→</span></button>
        ) : (
          <Link href="/vista-express-360" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#0052A3] shadow-lg transition hover:-translate-y-0.5 hover:bg-cyan-50">{t('vista360.explore')} <span className="ml-2">→</span></Link>
        )}
      </div>
    </section>
  );
}

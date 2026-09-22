'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import GlobalLanguageDock from '@/components/ui/GlobalLanguageDock';

type FeedbackType = 'error' | 'success' | 'info';

interface BuyerAuthShellProps {
  eyebrow: string;
  title: string;
  description: ReactNode;
  children: ReactNode;
  visualTitle?: string;
  visualDescription?: string;
  highlights?: string[];
  wideForm?: boolean;
  footer?: ReactNode;
}

export function BuyerAuthFeedback({
  type,
  message,
  onClose,
}: {
  type: FeedbackType;
  message: string;
  onClose?: () => void;
}) {
  const styles = {
    error: 'border-red-200 bg-red-50 text-red-800',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    info: 'border-cyan-200 bg-cyan-50 text-cyan-800',
  }[type];

  return (
    <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-sm ${styles}`} role="alert">
      <span className="mt-0.5 shrink-0 font-bold" aria-hidden="true">{type === 'error' ? '!' : type === 'success' ? '✓' : 'i'}</span>
      <p className="min-w-0 flex-1 font-medium leading-6">{message}</p>
      {onClose && <button type="button" onClick={onClose} className="shrink-0 text-lg leading-none opacity-60 hover:opacity-100" aria-label="Dismiss message">×</button>}
    </div>
  );
}

function BuyerBrand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center gap-3" aria-label="VistaExpress marketplace home">
      <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#087f8c] shadow-lg shadow-cyan-900/15">
        <span className="absolute h-5 w-8 rounded-full border-[3px] border-white" />
        <span className="absolute h-1.5 w-3 rounded-full bg-[#f7b267]" />
        <span className="absolute bottom-1.5 h-1.5 w-1.5 rounded-full bg-white/80" />
      </span>
      <span className="leading-none">
        <span className={`block text-[1.35rem] font-extrabold tracking-[-0.04em] ${compact ? 'text-slate-950' : 'text-slate-900'}`}>Vista<span className="text-[#087f8c]">Express</span></span>
        <span className="mt-1 block text-[0.57rem] font-semibold uppercase tracking-[0.23em] text-slate-500">Marketplace</span>
      </span>
    </Link>
  );
}

function BuyerIllustration() {
  return (
    <div className="buyer-auth-illustration relative overflow-hidden border border-white/80 bg-white/70 shadow-xl shadow-slate-300/25">
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[#f7b267]/30 blur-2xl" />
      <div className="absolute -bottom-10 -left-10 h-28 w-28 rounded-full bg-cyan-200/60 blur-2xl" />
      <div className="buyer-auth-illustration-art relative flex items-center justify-center">
        <svg viewBox="0 0 360 160" fill="none" className="h-full w-full" aria-hidden="true">
          <path d="M42 70c5-27 30-43 61-41l62 5-10 66-52 2c-34 1-65-7-61-32Z" fill="#d8f2f1" stroke="#087f8c" strokeWidth="6" />
          <path d="M318 70c-5-27-30-43-61-41l-62 5 10 66 52 2c34 1 65-7 61-32Z" fill="#fff0d9" stroke="#087f8c" strokeWidth="6" />
          <path d="M165 41c11-7 19-7 30 0" stroke="#f29b66" strokeWidth="7" strokeLinecap="round" />
          <path d="M75 53c18-12 36-15 56-8M285 53c-18-12-36-15-56-8" stroke="#f29b66" strokeWidth="4" strokeLinecap="round" />
          <circle cx="113" cy="69" r="11" fill="#087f8c" opacity=".8" />
          <circle cx="247" cy="69" r="11" fill="#f29b66" opacity=".8" />
        </svg>
      </div>
      <div className="buyer-auth-illustration-copy relative border-t border-slate-200/80">
        <p className="text-sm font-bold text-slate-900">Find a pair that feels like you.</p>
        <p className="mt-1.5 text-xs leading-5 text-slate-500">Shop eyewear, lenses, and care products from trusted optical stores.</p>
      </div>
    </div>
  );
}

export default function BuyerAuthShell({
  eyebrow,
  title,
  description,
  children,
  visualTitle = 'A better way to see what’s next.',
  visualDescription = 'Discover optical products from trusted stores and keep your whole shopping journey in one place.',
  highlights = ['Curated eyewear from trusted stores', 'Simple checkout and order tracking', 'Rewards that make every purchase count'],
  wideForm = false,
  footer,
}: BuyerAuthShellProps) {
  return (
    <main className="buyer-auth-page h-[100dvh] min-h-[100dvh] max-h-[100dvh] overflow-hidden bg-[#f2f7f8] text-slate-900">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-24 -top-28 h-80 w-80 rounded-full bg-cyan-200/40 blur-3xl" />
        <div className="absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-orange-200/30 blur-3xl" />
      </div>

      <div className="relative mx-auto flex h-full min-h-0 w-full items-stretch">
        <div className={`grid h-full min-h-0 w-full overflow-hidden bg-white ${wideForm ? 'lg:grid-cols-[0.85fr_1.15fr]' : 'lg:grid-cols-[0.95fr_1.05fr]'}`}>
          <aside className="buyer-auth-panel relative hidden h-full min-h-0 overflow-hidden bg-gradient-to-br from-[#d3eee9] via-[#dcecf2] to-[#f9e5c9] px-8 lg:flex lg:flex-col xl:px-12">
            <div className="absolute -right-24 top-20 h-64 w-64 rounded-full border border-white/70" />
            <div className="absolute -bottom-24 -left-20 h-72 w-72 rounded-full border border-white/70" />
            <BuyerBrand />
            <div className="buyer-auth-panel-content relative mt-auto max-w-md pb-2">
              <div className="buyer-auth-panel-badge mb-4 inline-flex items-center gap-2 rounded-full border border-[#087f8c]/15 bg-white/60 px-3 py-1.5 text-xs font-bold text-[#087f8c]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#f29b66]" /> Buyer marketplace
              </div>
              <h2 className="buyer-auth-panel-title max-w-sm font-bold leading-[1.08] tracking-[-0.04em] text-slate-950">{visualTitle}</h2>
              <p className="buyer-auth-panel-description max-w-sm text-slate-600">{visualDescription}</p>
              <BuyerIllustration />
              <div className="buyer-auth-highlights">
                {highlights.map((highlight, index) => (
                  <div key={highlight} className="buyer-auth-highlight flex items-center gap-3 text-slate-700">
                    <span className="buyer-auth-highlight-icon flex shrink-0 items-center justify-center rounded-xl bg-white/80 text-[#087f8c] shadow-sm">{index === 0 ? '✦' : index === 1 ? '✓' : '↗'}</span>
                    <span>{highlight}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <section className="flex h-full min-h-0 min-w-0 flex-col overflow-y-auto bg-white">
            <div className={`mx-auto flex min-h-full w-full min-w-0 flex-1 flex-col px-5 py-7 sm:px-9 sm:py-9 ${wideForm ? 'max-w-[860px] lg:px-10' : 'max-w-[700px] lg:px-12'} lg:py-10`}>
              <div className="mb-9 lg:hidden"><BuyerBrand compact /></div>
              <div className="mb-7 min-w-0">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#087f8c]">{eyebrow}</p>
                <h1 className="text-3xl font-bold tracking-[-0.04em] text-slate-950 sm:text-[2.6rem] sm:leading-tight">{title}</h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500 sm:text-base">{description}</p>
              </div>
              <div className="min-w-0 rounded-[1.75rem] border border-slate-200/80 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.07)] sm:p-8">{children}</div>
              <div className="mt-auto pt-7 text-center text-xs leading-5 text-slate-400">{footer || <>Secure shopping · VistaExpress Marketplace</>}</div>
            </div>
          </section>
        </div>
      </div>
      <GlobalLanguageDock position="top-right" />
    </main>
  );
}

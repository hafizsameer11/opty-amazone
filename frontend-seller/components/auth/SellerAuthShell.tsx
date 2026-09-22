'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import GlobalLanguageDock from '@/components/ui/GlobalLanguageDock';
import { useLanguage } from '@/contexts/LanguageContext';

export type AuthFeedbackType = 'error' | 'success' | 'info';

interface SellerAuthShellProps {
  eyebrow: string;
  title: string;
  description: ReactNode;
  children: ReactNode;
  sideTitle?: string;
  sideDescription?: string;
  steps?: string[];
  activeStep?: number;
  stepsLayout?: 'stacked' | 'grid';
  highlights?: string[];
  wideForm?: boolean;
  footer?: ReactNode;
}

export function AuthFeedback({
  type,
  message,
  onClose,
}: {
  type: AuthFeedbackType;
  message: string;
  onClose?: () => void;
}) {
  const { t } = useLanguage();
  const styles = {
    error: 'border-red-200 bg-red-50 text-red-800',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    info: 'border-blue-200 bg-blue-50 text-blue-800',
  }[type];

  return (
    <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-sm ${styles}`} role="alert">
      <span className="mt-0.5 shrink-0" aria-hidden="true">
        {type === 'error' ? '!' : type === 'success' ? '✓' : 'i'}
      </span>
      <p className="min-w-0 flex-1 font-medium leading-6">{message}</p>
      {onClose && (
        <button type="button" onClick={onClose} className="shrink-0 text-lg leading-none opacity-60 hover:opacity-100" aria-label={t('auth.dismissMessage')}>
          ×
        </button>
      )}
    </div>
  );
}

function BrandMark({ compact = false }: { compact?: boolean }) {
  const { t } = useLanguage();
  return (
    <Link href="/" className={`group inline-flex items-center gap-3 ${compact ? '' : 'text-white'}`} aria-label={t('auth.homeLabel')}>
      <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#27a8e0] shadow-lg shadow-cyan-950/20">
        <span className="absolute h-6 w-8 rounded-full border-[3px] border-white/95" />
        <span className="absolute h-1.5 w-3 rounded-full bg-white/95" />
        <span className="absolute -right-1.5 top-2 h-2 w-2 rounded-full bg-white/80" />
      </span>
      <span className="leading-none">
        <span className={`block text-[1.35rem] font-extrabold tracking-[-0.04em] ${compact ? 'text-slate-900' : 'text-white'}`}>Vista<span className="text-[#39b7ec]">Express</span></span>
        <span className={`mt-1 block text-[0.57rem] font-semibold uppercase tracking-[0.25em] ${compact ? 'text-slate-500' : 'text-slate-300'}`}>{t('auth.opticalSolutions')}</span>
      </span>
    </Link>
  );
}

function SideIllustration() {
  const { t } = useLanguage();
  return (
    <div className="seller-auth-illustration relative overflow-hidden border border-white/10 bg-white/[0.06] shadow-2xl shadow-black/20">
      <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="absolute -bottom-16 -left-12 h-40 w-40 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="seller-auth-illustration-art relative flex items-center justify-center">
        <svg viewBox="0 0 360 170" className="h-full w-full" fill="none" aria-hidden="true">
          <path d="M45 73c5-30 31-48 65-46l55 4-9 67-51 3c-32 2-64-4-60-28Z" stroke="rgba(255,255,255,.92)" strokeWidth="7" />
          <path d="M315 73c-5-30-31-48-65-46l-55 4 9 67 51 3c32 2 64-4 60-28Z" stroke="rgba(255,255,255,.92)" strokeWidth="7" />
          <path d="M165 39c10-7 20-7 30 0" stroke="#39b7ec" strokeWidth="7" strokeLinecap="round" />
          <path d="M74 49c19-13 40-15 61-6M286 49c-19-13-40-15-61-6" stroke="#39b7ec" strokeWidth="5" strokeLinecap="round" opacity=".85" />
          <circle cx="111" cy="64" r="13" fill="#39b7ec" opacity=".75" />
          <circle cx="249" cy="64" r="13" fill="#39b7ec" opacity=".75" />
        </svg>
      </div>
      <div className="seller-auth-illustration-copy relative border-t border-white/10">
        <p className="font-semibold text-white">{t('auth.sideIllustrationTitle')}</p>
        <p className="text-slate-300">{t('auth.sideIllustrationDescription')}</p>
      </div>
    </div>
  );
}

function HighlightIcon({ index }: { index: number }) {
  const paths = [
    <><path d="m12 3 1.4 5.6L19 10l-5.6 1.4L12 17l-1.4-5.6L5 10l5.6-1.4L12 3Z" /><path d="m19 16 .5 2 2 .5-2 .5-.5 2-.5-2-2-.5 2-.5.5-2Z" /></>,
    <><path d="M12 3 20 6v5c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6l8-3Z" /><path d="m8.5 12 2.2 2.2 4.8-5" /></>,
    <><path d="M4 18V9M10 18V5M16 18v-7M22 18V3" /><path d="M2 18h21" /></>,
  ];
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">{paths[index % paths.length]}</svg>;
}

export default function SellerAuthShell({
  eyebrow,
  title,
  description,
  children,
  sideTitle = 'Your store, beautifully managed.',
  sideDescription = 'A professional workspace for independent optical retailers and growing brands.',
  steps,
  activeStep,
  stepsLayout = 'stacked',
  highlights,
  wideForm = false,
  footer,
}: SellerAuthShellProps) {
  const { t } = useLanguage();
  return (
    <main className="seller-auth-page h-[100dvh] min-h-[100dvh] max-h-[100dvh] overflow-hidden bg-[#eef4f8] text-slate-900">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-32 top-[-12rem] h-[28rem] w-[28rem] rounded-full bg-cyan-200/30 blur-3xl" />
        <div className="absolute -right-32 bottom-[-14rem] h-[30rem] w-[30rem] rounded-full bg-blue-200/30 blur-3xl" />
      </div>

      <div className="relative mx-auto flex h-full min-h-0 w-full items-stretch">
        <div className={`grid h-full min-h-0 w-full overflow-hidden bg-white ${wideForm ? 'lg:grid-cols-[0.82fr_1.18fr]' : 'lg:grid-cols-[0.9fr_1.1fr]'}`}>
          <aside className="seller-auth-panel relative hidden h-full min-h-0 overflow-hidden bg-[#091b31] px-8 text-white lg:flex lg:flex-col xl:px-12">
            <div className="absolute right-[-7rem] top-[-7rem] h-72 w-72 rounded-full border border-cyan-300/10" />
            <div className="absolute bottom-[-9rem] left-[-8rem] h-80 w-80 rounded-full border border-blue-300/10" />
            <BrandMark />
            <div className="seller-auth-panel-content relative max-w-md pb-2">
              <div className="seller-auth-panel-badge mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold text-cyan-100">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" /> {t('auth.sellerWorkspace')}
              </div>
              <h2 className="seller-auth-panel-title max-w-sm font-bold leading-[1.08] tracking-[-0.04em]">{sideTitle}</h2>
              <p className="seller-auth-panel-description max-w-sm text-slate-300">{sideDescription}</p>
              <SideIllustration />
              {highlights && highlights.length > 0 && (
                <div className="seller-auth-highlights" aria-label={t('auth.workspaceBenefits')}>
                  {highlights.map((highlight, index) => (
                    <div key={highlight} className="seller-auth-highlight">
                      <span className="seller-auth-highlight-icon"><HighlightIcon index={index} /></span>
                      <span>{highlight}</span>
                    </div>
                  ))}
                </div>
              )}
              {steps && steps.length > 0 && (
                <div className={`seller-auth-steps ${stepsLayout === 'grid' ? 'seller-auth-steps-grid' : 'flex flex-col'}`}>
                  {steps.map((step, index) => {
                    const isActive = activeStep === index;
                    const isComplete = typeof activeStep === 'number' && index < activeStep;
                    return (
                      <div key={step} className={`seller-auth-step flex items-center gap-3 ${isActive ? 'text-white' : 'text-slate-400'}`}>
                        <span className={`seller-auth-step-dot flex shrink-0 items-center justify-center rounded-full border font-bold ${isComplete ? 'border-cyan-300 bg-cyan-300 text-[#091b31]' : isActive ? 'border-cyan-300 text-cyan-200' : 'border-white/20'}`}>
                          {isComplete ? '✓' : index + 1}
                        </span>
                        <span className={isActive ? 'font-semibold' : ''}>{step}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>

          <section className="flex h-full min-h-0 min-w-0 flex-col overflow-y-auto bg-white">
            <div className={`mx-auto flex min-h-full w-full min-w-0 flex-1 flex-col px-5 py-6 sm:px-9 sm:py-8 ${wideForm ? 'max-w-[840px] lg:px-10' : 'max-w-[680px] lg:px-14'} lg:py-10`}>
              <div className="mb-7 lg:hidden"><BrandMark compact /></div>
              <div className="mb-6 min-w-0">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#0789c5]">{eyebrow}</p>
                <h1 className="text-3xl font-bold tracking-[-0.04em] text-slate-950 sm:text-[2.65rem] sm:leading-tight">{title}</h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500 sm:text-base">{description}</p>
              </div>

              <div className="min-w-0 rounded-[1.75rem] border border-slate-200/80 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.07)] sm:p-8">{children}</div>
              <div className="mt-auto pt-8 text-center text-xs leading-5 text-slate-400">{footer || t('auth.secureAccess')}</div>
            </div>
          </section>
        </div>
      </div>
      <GlobalLanguageDock position="top-right" />
    </main>
  );
}

'use client';

import { useState } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

type AuthInputIcon = 'mail' | 'lock' | 'store' | 'phone' | 'link' | 'bank' | 'document';

interface SellerAuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  icon?: AuthInputIcon;
  endAdornment?: ReactNode;
}

function Icon({ name }: { name: AuthInputIcon }) {
  const paths: Record<AuthInputIcon, ReactNode> = {
    mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
    lock: <><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
    store: <><path d="M4 10v10h16V10" /><path d="M3 10 5 4h14l2 6" /><path d="M3 10a3 3 0 0 0 5 2 3 3 0 0 0 5 0 3 3 0 0 0 5 0 3 3 0 0 0 5-2" /><path d="M9 20v-5h6v5" /></>,
    phone: <><rect x="6" y="3" width="12" height="18" rx="2" /><path d="M10 6h4M11 18h2" /></>,
    link: <><path d="M10 13a5 5 0 0 0 7.1.1l1.4-1.4a5 5 0 0 0-7.1-7.1L10.6 5.4" /><path d="M14 11a5 5 0 0 0-7.1-.1l-1.4 1.4a5 5 0 0 0 7.1 7.1l.8-.8" /></>,
    bank: <><path d="m3 9 9-5 9 5" /><path d="M5 10v7M9 10v7M15 10v7M19 10v7M3 20h18M2 17h20" /></>,
    document: <><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v5h5M10 13h5M10 17h5" /></>,
  };

  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">{paths[name]}</svg>;
}

export default function SellerAuthInput({ label, error, hint, icon, endAdornment, type = 'text', className = '', required, ...props }: SellerAuthInputProps) {
  const { t } = useLanguage();
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword && showPassword ? 'text' : type;

  return (
    <div className="min-w-0">
      <label className="mb-2 flex items-center justify-between gap-3 text-sm font-semibold text-slate-800" htmlFor={props.id}>
        <span>{label}{required && <span className="ml-1 text-[#0789c5]">*</span>}</span>
        {hint && <span className="text-xs font-medium text-slate-400">{hint}</span>}
      </label>
      <div className="relative min-w-0">
        {icon && <span className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-400"><Icon name={icon} /></span>}
        <input
          {...props}
          id={props.id}
          type={inputType}
          required={required}
          aria-invalid={Boolean(error)}
          className={`h-[3.25rem] w-full min-w-0 rounded-xl border bg-slate-50/70 px-4 text-[0.95rem] text-slate-950 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-4 ${icon ? 'pl-11' : ''} ${isPassword || endAdornment ? 'pr-12' : ''} ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 hover:border-slate-300 focus:border-[#0795ce] focus:ring-cyan-100'} ${props.disabled ? 'cursor-not-allowed opacity-60' : ''} ${className}`}
        />
        {isPassword ? (
          <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}>
            {showPassword ? '◉' : '◌'}
          </button>
        ) : endAdornment ? <span className="absolute right-3 top-1/2 -translate-y-1/2">{endAdornment}</span> : null}
      </div>
      {error && <p className="mt-1.5 flex items-start gap-1.5 text-xs font-medium leading-5 text-red-600"><span aria-hidden="true">!</span><span>{error}</span></p>}
    </div>
  );
}

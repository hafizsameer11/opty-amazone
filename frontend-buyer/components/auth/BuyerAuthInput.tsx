'use client';

import { useState } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';

type BuyerInputIcon = 'mail' | 'lock' | 'user' | 'phone' | 'gift' | 'key';

interface BuyerAuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  icon?: BuyerInputIcon;
  endAdornment?: ReactNode;
}

function Icon({ name }: { name: BuyerInputIcon }) {
  const paths: Record<BuyerInputIcon, ReactNode> = {
    mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
    lock: <><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
    user: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></>,
    phone: <><rect x="6" y="3" width="12" height="18" rx="2" /><path d="M10 6h4M11 18h2" /></>,
    gift: <><path d="M4 10h16v10H4zM2 7h20v3H2zM12 7v13" /><path d="M12 7H8.5a2.5 2.5 0 1 1 2.5-2.5V7ZM12 7h3.5a2.5 2.5 0 1 0-2.5-2.5V7Z" /></>,
    key: <><circle cx="8" cy="15" r="3" /><path d="m10.2 12.8 8-8M15 7l2 2M17 5l2 2" /></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">{paths[name]}</svg>;
}

export default function BuyerAuthInput({ label, error, hint, icon, endAdornment, type = 'text', className = '', required, ...props }: BuyerAuthInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword && showPassword ? 'text' : type;

  return (
    <div className="min-w-0">
      <label className="mb-2 flex items-center justify-between gap-3 text-sm font-semibold text-slate-800" htmlFor={props.id}>
        <span>{label}{required && <span className="ml-1 text-[#087f8c]">*</span>}</span>
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
          className={`h-[3.3rem] w-full min-w-0 rounded-2xl border bg-slate-50/70 px-4 text-[0.95rem] text-slate-950 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-4 ${icon ? 'pl-11' : ''} ${isPassword || endAdornment ? 'pr-12' : ''} ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 hover:border-slate-300 focus:border-[#087f8c] focus:ring-cyan-100'} ${props.disabled ? 'cursor-not-allowed opacity-60' : ''} ${className}`}
        />
        {isPassword ? (
          <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? '◉' : '◌'}</button>
        ) : endAdornment ? <span className="absolute right-3 top-1/2 -translate-y-1/2">{endAdornment}</span> : null}
      </div>
      {error && <p className="mt-1.5 flex items-start gap-1.5 text-xs font-medium leading-5 text-red-600"><span aria-hidden="true">!</span><span>{error}</span></p>}
    </div>
  );
}

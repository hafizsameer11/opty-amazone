'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_COUNTRY_ISO,
  countryFlag,
  findPhoneCountry,
  searchPhoneCountries,
  type PhoneCountry,
} from '@/lib/phone-countries';

type CountryCodeSelectProps = {
  /** Selected ISO 3166-1 alpha-2 code. */
  value: string;
  onChange: (iso: string) => void;
  label: string;
  searchPlaceholder: string;
  emptyLabel: string;
  requiredLabel: string;
  ariaLabel: string;
  invalid?: boolean;
  id?: string;
};

/**
 * Searchable country selector for the registration form.
 *
 * A native <select> with the full country list is impractical to scan, so the
 * dialling prefix is chosen from a filtered list instead.
 */
export default function CountryCodeSelect({
  value,
  onChange,
  label,
  searchPlaceholder,
  emptyLabel,
  requiredLabel,
  ariaLabel,
  invalid = false,
  id,
}: CountryCodeSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected: PhoneCountry = useMemo(() => findPhoneCountry(value || DEFAULT_COUNTRY_ISO), [value]);
  const results = useMemo(() => searchPhoneCountries(query), [query]);

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const choose = (country: PhoneCountry) => {
    onChange(country.iso);
    setOpen(false);
    setQuery('');
  };

  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-2 flex items-center justify-between gap-3 text-sm font-semibold text-slate-800">
        <span>
          {label}
          <span className="ml-1 text-[#0789c5]">*</span>
        </span>
        <span className="text-xs font-medium text-slate-400">{requiredLabel}</span>
      </label>

      <div className="relative" ref={containerRef}>
        <button
          type="button"
          id={id}
          aria-label={ariaLabel}
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
          className={`flex h-[3.25rem] w-full min-w-0 items-center justify-between gap-2 rounded-xl border bg-slate-50/70 px-3 text-sm font-semibold text-slate-700 outline-none transition focus:bg-white focus:ring-4 ${
            invalid ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 hover:border-slate-300 focus:border-[#0795ce] focus:ring-cyan-100'
          }`}
        >
          <span className="flex min-w-0 items-center gap-2">
            <span aria-hidden="true" className="text-lg leading-none">{countryFlag(selected.iso)}</span>
            <span className="truncate">{selected.dial}</span>
          </span>
          <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 shrink-0 fill-slate-400">
            <path d="M5.5 7.5 10 12l4.5-4.5H5.5Z" />
          </svg>
        </button>

        {open && (
          <div className="absolute z-30 mt-1.5 w-full min-w-[16rem] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-100 p-2">
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                autoComplete="off"
                className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-[#0795ce] focus:bg-white focus:ring-4 focus:ring-cyan-100"
              />
            </div>
            <ul role="listbox" className="max-h-64 overflow-y-auto py-1">
              {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-slate-400">{emptyLabel}</li>}
              {results.map((country) => {
                const isSelected = country.iso === selected.iso;
                return (
                  <li key={country.iso}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => choose(country)}
                      className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition hover:bg-slate-50 ${isSelected ? 'bg-cyan-50/70' : ''}`}
                    >
                      <span aria-hidden="true" className="text-lg leading-none">{countryFlag(country.iso)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-slate-800">{country.name}</span>
                        <span className="block text-xs text-slate-400">{country.iso}</span>
                      </span>
                      <span className="shrink-0 font-semibold text-slate-600">{country.dial}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
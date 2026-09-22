'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import { StoreService } from '@/services/store-service';
import { useLanguage } from '@/contexts/LanguageContext';

type PhoneVisibility = 'public' | 'request' | 'hidden';

const errorMessage = (error: unknown, fallback: string) => {
  if (!error || typeof error !== 'object') return fallback;
  const requestError = error as { response?: { data?: { message?: unknown } } };
  return typeof requestError.response?.data?.message === 'string' ? requestError.response.data.message : fallback;
};

const VISIBILITY_OPTIONS: Array<{
  value: PhoneVisibility;
  title: string;
  description: string;
}> = [
  { value: 'public', title: 'Public', description: 'Anyone can see your store phone number.' },
  { value: 'request', title: 'Request required', description: 'Buyers must request access to your phone number.' },
  { value: 'hidden', title: 'Hidden', description: 'Your phone number is not shown to customers.' },
];

export default function StoreSettingsPanel() {
  const { t } = useLanguage();
  const [visibility, setVisibility] = useState<PhoneVisibility>('request');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await StoreService.getPhoneVisibility();
        const savedVisibility = response.data.phone_visibility;
        if (savedVisibility === 'public' || savedVisibility === 'request' || savedVisibility === 'hidden') {
          setVisibility(savedVisibility);
        }
      } catch (requestError: unknown) {
        setError(errorMessage(requestError, t('storeSettings.loadFailed')));
      } finally {
        setLoading(false);
      }
    };

    void loadSettings();
  }, []);

  const saveSettings = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await StoreService.updatePhoneVisibility(visibility);
      setSuccess(t('storeSettings.saved'));
    } catch (requestError: unknown) {
      setError(errorMessage(requestError, t('storeSettings.saveFailed')));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 via-white to-cyan-50 px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-7">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0066CC]">{t('storeSettings.title')}</p>
          <h2 className="mt-1 text-xl font-bold text-slate-950">{t('storeSettings.subtitle')}</h2>
          <p className="mt-1 text-sm text-slate-600">{t('storeSettings.description')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/store/edit">
            <Button variant="outline" size="sm">{t('storeSettings.editProfile')}</Button>
          </Link>
          <Link href="/store/social-links">
            <Button variant="outline" size="sm">{t('storeSettings.socialLinks')}</Button>
          </Link>
        </div>
      </div>

      <form onSubmit={saveSettings} className="p-5 sm:p-7">
        {error && <Alert type="error" message={error} className="mb-5" />}
        {success && <Alert type="success" message={success} className="mb-5" />}

        {loading ? (
          <div className="flex min-h-44 items-center justify-center text-sm text-slate-500">
            <span className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-[#0066CC] border-t-transparent" />
            Loading store settings…
          </div>
        ) : (
          <>
            <fieldset>
              <legend className="text-sm font-bold text-slate-900">{t('storeSettings.phoneVisibility')}</legend>
              <p className="mt-1 text-sm text-slate-500">{t('storeSettings.phoneDescription')}</p>
              <div className="mt-4 grid gap-3">
                {VISIBILITY_OPTIONS.map((option) => {
                  const selected = visibility === option.value;
                  return (
                    <label
                      key={option.value}
                      className={`flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-4 transition ${selected ? 'border-[#0066CC] bg-blue-50/70' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
                    >
                      <input
                        type="radio"
                        name="phone_visibility"
                        value={option.value}
                        checked={selected}
                        onChange={() => setVisibility(option.value)}
                        className="mt-1 h-4 w-4 accent-[#0066CC]"
                      />
                      <span>
                        <span className="block font-semibold text-slate-900">{t(`storeSettings.${option.value}`)}</span>
                        <span className="mt-1 block text-sm text-slate-600">{t(`storeSettings.${option.value}Description`)}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
              <p className="text-xs text-slate-500">{t('storeSettings.changesApply')}</p>
              <Button type="submit" size="sm" isLoading={saving}>{t('storeSettings.save')}</Button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}

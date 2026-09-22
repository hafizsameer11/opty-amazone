'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { StoreService } from '@/services/store-service';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import SectionBackLink from '@/components/ui/SectionBackLink';
import { useLanguage } from '@/contexts/LanguageContext';

export default function StoreSettingsPage() {
  const { isAuthenticated, loading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [phoneVisibility, setPhoneVisibility] = useState<'public' | 'request' | 'hidden'>('request');

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadSettings();
    }
  }, [isAuthenticated]);

  const loadSettings = async () => {
    try {
      setLoadingSettings(true);
      const response = await StoreService.getPhoneVisibility();
      const v = response.data.phone_visibility;
      if (v === 'public' || v === 'request' || v === 'hidden') {
        setPhoneVisibility(v);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await StoreService.updatePhoneVisibility(phoneVisibility);
      setSuccess(t('store.updated'));
    } catch (error: any) {
      setError(error.response?.data?.message || t('store.updateFailed'));
    } finally {
      setSaving(false);
    }
  };

  if (loading || loadingSettings) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0066CC] mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto">
            <div className="py-4 sm:py-6">
              <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8">
                {/* Page Header */}
                <div className="mb-6">
                  <SectionBackLink href="/store" className="mb-3">
                    {t('store.back')}
                  </SectionBackLink>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('nav.storeSettings')}</h1>
                  <p className="text-gray-600">{t('store.settingsSubtitle')}</p>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:rounded-xl sm:p-6 lg:p-8">
                  {error && <Alert type="error" message={error} className="mb-6" />}
                  {success && <Alert type="success" message={success} className="mb-6" />}

                  <div className="mb-6 pb-6 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900 mb-1">{t('store.privacy')}</h2>
                    <p className="text-sm text-gray-600">{t('store.privacyDescription')}</p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        {t('store.phoneVisibility')}
                      </label>
                      <div className="space-y-3">
                        <label className={`flex items-start p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          phoneVisibility === 'public' 
                            ? 'border-[#0066CC] bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}>
                          <input
                            type="radio"
                            value="public"
                            checked={phoneVisibility === 'public'}
                            onChange={(e) => setPhoneVisibility(e.target.value as any)}
                            className="mt-1 mr-3"
                          />
                          <div>
                            <div className="font-medium text-gray-900">{t('store.public')}</div>
                            <div className="text-sm text-gray-600">{t('store.publicDescription')}</div>
                          </div>
                        </label>

                        <label className={`flex items-start p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          phoneVisibility === 'request' 
                            ? 'border-[#0066CC] bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}>
                          <input
                            type="radio"
                            value="request"
                            checked={phoneVisibility === 'request'}
                            onChange={(e) => setPhoneVisibility(e.target.value as any)}
                            className="mt-1 mr-3"
                          />
                          <div>
                            <div className="font-medium text-gray-900">{t('store.requestRequired')}</div>
                            <div className="text-sm text-gray-600">{t('store.requestDescription')}</div>
                          </div>
                        </label>

                        <label className={`flex items-start p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          phoneVisibility === 'hidden' 
                            ? 'border-[#0066CC] bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}>
                          <input
                            type="radio"
                            value="hidden"
                            checked={phoneVisibility === 'hidden'}
                            onChange={(e) => setPhoneVisibility(e.target.value as any)}
                            className="mt-1 mr-3"
                          />
                          <div>
                            <div className="font-medium text-gray-900">{t('store.hidden')}</div>
                            <div className="text-sm text-gray-600">{t('store.hiddenDescription')}</div>
                          </div>
                        </label>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 border-t border-gray-200 pt-4 sm:flex-row sm:gap-4">
                      <Button 
                        type="submit" 
                        disabled={saving}
                        className="w-full bg-[#0066CC] px-6 font-semibold text-white hover:bg-[#0052a3] sm:w-auto"
                      >
                        {saving ? t('common.loading') : t('store.saveSettings')}
                      </Button>
                      <Link href="/store" className="w-full sm:w-auto">
                        <Button type="button" variant="outline" className="w-full px-6 sm:w-auto">
                          {t('common.cancel')}
                        </Button>
                      </Link>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

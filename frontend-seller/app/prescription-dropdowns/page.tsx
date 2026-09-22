'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import Sidebar from '@/components/layout/Sidebar';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import Loader from '@/components/ui/Loader';
import { getCategoryConfigs, type CategoryPrescriptionConfig } from '@/services/prescription-dropdown-service';
import { useLanguage } from '@/contexts/LanguageContext';

export default function PrescriptionDropdownsPage() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();
  const { t } = useLanguage();
  const [categories, setCategories] = useState<CategoryPrescriptionConfig[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadCategories();
    }
  }, [isAuthenticated]);

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      setError('');
      const data = await getCategoryConfigs();
      setCategories(data);
    } catch (err: any) {
      setError(err.response?.data?.message || t('config.noCategories'));
      console.error('Failed to load categories:', err);
    } finally {
      setLoadingCategories(false);
    }
  };

  const getConfigStatusBadge = (hasConfig: boolean) => {
    return hasConfig ? (
      <span className="px-2 py-1 text-xs font-semibold text-green-700 bg-green-100 rounded-full">
        {t('config.configured')}
      </span>
    ) : (
      <span className="px-2 py-1 text-xs font-semibold text-gray-700 bg-gray-100 rounded-full">
        {t('config.notConfigured')}
      </span>
    );
  };

  const getFieldStatusCount = (configStatus: CategoryPrescriptionConfig['config_status']) => {
    const configuredFields = Object.values(configStatus).filter(Boolean).length;
    const totalFields = Object.keys(configStatus).length;
    return `${configuredFields}/${totalFields}`;
  };

  if (loading || loadingCategories) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-6">
            <Loader />
          </main>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-3 sm:p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6">
              <h1 className="mb-2 text-2xl font-bold text-gray-900 sm:text-3xl">{t('config.prescriptionTitle')}</h1>
              <p className="text-gray-600">
                {t('config.prescriptionDescription')}
              </p>
              <div className="mt-4 rounded-lg border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-950">
                {t('config.contactLensNotice')}
              </div>
            </div>

            {error && (
              <div className="mb-4">
                <Alert type="error" message={error} onClose={() => setError('')} />
              </div>
            )}

            <div className="overflow-hidden rounded-2xl bg-white shadow sm:rounded-lg">
              <div className="space-y-3 p-3 md:hidden">
                {categories.length === 0 ? <p className="px-3 py-8 text-center text-sm text-gray-500">{t('config.noCategories')}</p> : categories.map((category) => <article key={category.id} className="rounded-xl border border-slate-200 p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="truncate font-bold text-slate-900">{category.name}</h2><p className="mt-0.5 truncate text-xs text-slate-500">{category.slug}</p></div>{getConfigStatusBadge(category.has_config)}</div><div className="mt-3 rounded-lg bg-slate-50 p-2.5"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">{t('config.configuredFields')}</p><p className="mt-1 text-sm font-semibold text-slate-800">{getFieldStatusCount(category.config_status)}</p><p className="mt-1 line-clamp-2 text-xs text-slate-500">{Object.entries(category.config_status).filter(([_, configured]) => configured).map(([field]) => field.toUpperCase()).join(', ') || t('common.none')}</p></div><Button onClick={() => router.push(`/prescription-dropdowns/${category.id}`)} className="mt-3 w-full bg-blue-600 text-white hover:bg-blue-700">{t('common.configure')}</Button></article>)}
              </div>
              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                         {t('config.category')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                         {t('common.status')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                         {t('config.configuredFields')}
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                         {t('common.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {categories.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                           {t('config.noCategories')}
                        </td>
                      </tr>
                    ) : (
                      categories.map((category) => (
                        <tr key={category.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{category.name}</div>
                            <div className="text-sm text-gray-500">{category.slug}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getConfigStatusBadge(category.has_config)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {getFieldStatusCount(category.config_status)}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {Object.entries(category.config_status)
                                .filter(([_, configured]) => configured)
                                .map(([field]) => field.toUpperCase())
                                .join(', ') || t('common.none')}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <Button
                              onClick={() => router.push(`/prescription-dropdowns/${category.id}`)}
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                               {t('common.configure')}
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}


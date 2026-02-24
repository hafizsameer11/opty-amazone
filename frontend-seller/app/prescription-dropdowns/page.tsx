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

export default function PrescriptionDropdownsPage() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();
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
      setError(err.response?.data?.message || 'Failed to load categories');
      console.error('Failed to load categories:', err);
    } finally {
      setLoadingCategories(false);
    }
  };

  const getConfigStatusBadge = (hasConfig: boolean) => {
    return hasConfig ? (
      <span className="px-2 py-1 text-xs font-semibold text-green-700 bg-green-100 rounded-full">
        Configured
      </span>
    ) : (
      <span className="px-2 py-1 text-xs font-semibold text-gray-700 bg-gray-100 rounded-full">
        Not Configured
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
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Prescription Options</h1>
              <p className="text-gray-600">
                Configure prescription field dropdown values (SPH, CYL, AXIS, PD, etc.) for parent categories only.
                Sub-categories will automatically inherit configuration from their parent categories.
              </p>
            </div>

            {error && (
              <div className="mb-4">
                <Alert type="error" message={error} onClose={() => setError('')} />
              </div>
            )}

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Configured Fields
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {categories.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                          No categories found
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
                                .join(', ') || 'None'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <Button
                              onClick={() => router.push(`/prescription-dropdowns/${category.id}`)}
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              Configure
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


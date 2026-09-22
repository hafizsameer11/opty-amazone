'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import { categoryFieldConfigService, type CategoryFieldConfig, type CategoryFieldConfigDetail } from '@/services/category-field-config-service';
import { useLanguage } from '@/contexts/LanguageContext';

// Field labels for display
const FIELD_LABELS: Record<string, string> = {
  frame_shape: 'Frame Shape',
  frame_material: 'Frame Material',
  frame_color: 'Frame Color',
  gender: 'Gender',
  lens_type: 'Lens Type',
  lens_index_options: 'Lens Index Options',
  treatment_options: 'Treatment Options',
  base_curve_options: 'Base Curve Options',
  diameter_options: 'Diameter Options',
  powers_range: 'Powers Range',
  replacement_frequency: 'Replacement Frequency',
  contact_lens_brand: 'Contact Lens Brand',
  contact_lens_color: 'Contact Lens Color',
  contact_lens_material: 'Contact Lens Material',
  contact_lens_type: 'Contact Lens Type',
  has_uv_filter: 'Has UV Filter',
  can_sleep_with: 'Can Sleep With',
  water_content: 'Water Content',
  is_medical_device: 'Medical Device',
  size_volume: 'Size/Volume',
  pack_type: 'Pack Type',
  expiry_date: 'Expiry Date',
  model_3d_url: '3D Model URL',
  try_on_image: 'Try-On Image URL',
  color_images: 'Color Images',
  mm_calibers: 'MM Calibers',
};

export default function CategoryFieldConfigPage() {
  const { isAuthenticated, loading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryFieldConfig[]>([]);
  const [expandedCategory, setExpandedCategory] = useState<number | null>(null);
  const [categoryDetail, setCategoryDetail] = useState<CategoryFieldConfigDetail | null>(null);
  const [fieldConfig, setFieldConfig] = useState<Record<string, boolean>>({});
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const productTypeLabel = (productType: string) => {
    const labels: Record<string, string> = {
      frame: t('products.frames'),
      sunglasses: t('products.sunglasses'),
      contact_lens: t('products.contactLenses'),
      eye_hygiene: t('products.eyeHygiene'),
      accessory: t('products.accessories'),
    };
    return labels[productType] ?? productType.replaceAll('_', ' ');
  };

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
      const data = await categoryFieldConfigService.getAll();
      setCategories(data);
    } catch (error: any) {
      setError(error.response?.data?.message || t('config.noCategories'));
    } finally {
      setLoadingCategories(false);
    }
  };

  const loadCategoryDetail = async (categoryId: number) => {
    try {
      setLoadingDetail(true);
      const detail = await categoryFieldConfigService.getOne(categoryId);
      setCategoryDetail(detail);
      setFieldConfig(detail.field_config);
    } catch (error: any) {
      setError(error.response?.data?.message || t('config.loadDetailsFailed'));
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCategoryExpand = (categoryId: number) => {
    if (expandedCategory === categoryId) {
      setExpandedCategory(null);
      setCategoryDetail(null);
      setFieldConfig({});
    } else {
      setExpandedCategory(categoryId);
      loadCategoryDetail(categoryId);
    }
  };

  const handleFieldToggle = (field: string) => {
    setFieldConfig(prev => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleSave = async (categoryId: number) => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      
      await categoryFieldConfigService.update(categoryId, {
        field_config: fieldConfig,
      });

       setSuccess(t('config.saveSuccess'));
      await loadCategories();
      await loadCategoryDetail(categoryId);
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
       setError(error.response?.data?.message || t('config.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const getEnabledCount = (config: Record<string, boolean>): number => {
    return Object.values(config).filter(Boolean).length;
  };

  if (loading || loadingCategories) {
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
              <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8">
                <div className="mb-6">
                   <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{t('config.fieldTitle')}</h1>
                  <p className="mt-2 text-gray-600">
                     {t('config.fieldDescription')}
                  </p>
                </div>

                {error && (
                  <div className="mb-4">
                    <Alert type="error" message={error} onClose={() => setError('')} />
                  </div>
                )}

                {success && (
                  <div className="mb-4">
                    <Alert type="success" message={success} onClose={() => setSuccess('')} />
                  </div>
                )}

                <div className="bg-white rounded-lg shadow">
                  <div className="divide-y divide-gray-200">
                    {categories.map((category) => {
                      const enabledCount = getEnabledCount(category.field_config);
                      return (
                        <div key={category.id} className="p-4 sm:p-6">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0 flex-1">
                              <h3 className="text-lg font-semibold text-gray-900">{category.name}</h3>
                              <p className="text-sm text-gray-500 mt-1">
                                {t('config.productType')}: <span className="capitalize">{productTypeLabel(category.product_type)}</span> ·{' '}
                                {t('config.fieldsEnabled', { enabled: enabledCount, total: Object.keys(category.field_config).length })}
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              onClick={() => handleCategoryExpand(category.id)}
                              className="w-full sm:ml-4 sm:w-auto"
                            >
                               {expandedCategory === category.id ? t('common.collapse') : t('common.configure')}
                            </Button>
                          </div>

                          {expandedCategory === category.id && (
                            <div className="mt-6 space-y-4">
                              {loadingDetail ? (
                                <div className="text-center py-8">
                                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0066CC] mx-auto"></div>
                                   <p className="mt-2 text-gray-600">{t('config.loadingConfig')}</p>
                                </div>
                              ) : categoryDetail ? (
                                <>
                                  <div className="grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {categoryDetail.available_fields.map((field) => (
                                      <label
                                        key={field}
                                        className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={fieldConfig[field] || false}
                                          onChange={() => handleFieldToggle(field)}
                                          className="w-5 h-5 text-[#0066CC] border-gray-300 rounded focus:ring-[#0066CC]"
                                        />
                                        <span className="text-sm font-medium text-gray-700 flex-1">
                                          {FIELD_LABELS[field] ? t(FIELD_LABELS[field]) : field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                        </span>
                                      </label>
                                    ))}
                                  </div>

                                  {/* Save Button */}
                                  <div className="flex justify-end pt-4 border-t border-gray-200">
                                    <Button
                                      onClick={() => handleSave(category.id)}
                                      isLoading={saving}
                                    >
                                       {t('config.save')}
                                    </Button>
                                  </div>
                                </>
                              ) : (
                                <div className="text-center py-8 text-gray-500">
                                   {t('config.failedLoadDetails')}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
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

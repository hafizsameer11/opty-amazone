'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import Sidebar from '@/components/layout/Sidebar';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import Loader from '@/components/ui/Loader';
import Input from '@/components/ui/Input';
import SectionBackLink from '@/components/ui/SectionBackLink';
import {
  getCategoryConfig,
  updateCategoryConfig,
  deleteValue,
  type CategoryPrescriptionConfigDetail,
  type PrescriptionDropdownValue,
} from '@/services/prescription-dropdown-service';
import { useLanguage } from '@/contexts/LanguageContext';

type FieldType = 'sph' | 'cyl' | 'axis' | 'pd' | 'h' | 'year_of_birth' | 'add' | 'base_curve' | 'diameter';

const FIELD_LABELS: Record<FieldType, string> = {
  sph: 'SPH (Sphere)',
  cyl: 'CYL (Cylinder)',
  axis: 'AXIS',
  pd: 'PD (Pupillary Distance)',
  h: 'H (Height)',
  year_of_birth: 'Year of Birth',
  add: 'ADD (Addition)',
  base_curve: 'Base Curve',
  diameter: 'Diameter',
};

const EYE_TYPES = ['left', 'right', 'both'] as const;
const FORM_TYPES = ['distance_vision', 'near_vision', 'progressive', 'contact_lens'] as const;

export default function CategoryPrescriptionConfigPage() {
  const router = useRouter();
  const params = useParams();
  const categoryId = Number(params.categoryId);
  const { isAuthenticated, loading } = useAuth();
  const { t } = useLanguage();
  
  const [config, setConfig] = useState<CategoryPrescriptionConfigDetail | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<FieldType>('sph');

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    if (isAuthenticated && categoryId) {
      loadConfig();
    }
  }, [isAuthenticated, categoryId, t]);

  const loadConfig = async () => {
    try {
      setLoadingConfig(true);
      setError('');
      const data = await getCategoryConfig(categoryId);
      setConfig(data);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || t('prescription.loadFailed');
      const parentCategoryId = err.response?.data?.data?.parent_category_id;
      
      if (parentCategoryId && err.response?.status === 400) {
        // This is a sub-category, redirect to parent
        setError(errorMessage);
        setTimeout(() => {
          router.push(`/prescription-dropdowns/${parentCategoryId}`);
        }, 2000);
      } else {
        setError(errorMessage);
      }
      console.error('Failed to load config:', err);
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleAddValue = (fieldType: FieldType) => {
    if (!config) return;

    const newValue: PrescriptionDropdownValue = {
      id: Date.now(), // Temporary ID
      store_id: 0,
      category_id: categoryId,
      field_type: fieldType,
      value: '',
      label: '',
      eye_type: fieldType === 'sph' || fieldType === 'cyl' || fieldType === 'axis' ? 'both' : undefined,
      form_type: undefined,
      is_active: true,
      sort_order: config.values[fieldType].length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setConfig({
      ...config,
      values: {
        ...config.values,
        [fieldType]: [...config.values[fieldType], newValue],
      },
    });
  };

  const handleUpdateValue = (fieldType: FieldType, index: number, updates: Partial<PrescriptionDropdownValue>) => {
    if (!config) return;

    const updatedValues = [...config.values[fieldType]];
    updatedValues[index] = { ...updatedValues[index], ...updates };

    setConfig({
      ...config,
      values: {
        ...config.values,
        [fieldType]: updatedValues,
      },
    });
  };

  const handleDeleteValue = async (fieldType: FieldType, index: number) => {
    if (!config) return;

    const value = config.values[fieldType][index];
    
    // If it has a real ID (not temporary), delete from backend
    if (value.id > 1000000) { // Temporary IDs are large timestamps
      try {
        await deleteValue(value.id);
      } catch (err: any) {
        setError(err.response?.data?.message || t('prescription.deleteFailed'));
        return;
      }
    }

    // Remove from local state
    const updatedValues = config.values[fieldType].filter((_, i) => i !== index);
    setConfig({
      ...config,
      values: {
        ...config.values,
        [fieldType]: updatedValues,
      },
    });
  };

  const handleBulkImport = (fieldType: FieldType, text: string) => {
    if (!config) return;

    const values = text
      .split(/[,\n]/)
      .map((v) => v.trim())
      .filter((v) => v.length > 0);

    const newValues: PrescriptionDropdownValue[] = values.map((value, index) => ({
      id: Date.now() + index,
      store_id: 0,
      category_id: categoryId,
      field_type: fieldType,
      value,
      label: value,
      eye_type: fieldType === 'sph' || fieldType === 'cyl' || fieldType === 'axis' ? 'both' : undefined,
      form_type: undefined,
      is_active: true,
      sort_order: config.values[fieldType].length + index,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    setConfig({
      ...config,
      values: {
        ...config.values,
        [fieldType]: [...config.values[fieldType], ...newValues],
      },
    });
  };

  const handleSave = async () => {
    if (!config) return;

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      // Flatten all values into a single array
      const allValues = Object.values(config.values).flat();

      await updateCategoryConfig(categoryId, {
        values: allValues.map((v) => ({
          field_type: v.field_type,
          value: v.value,
          label: v.label || undefined,
          eye_type: v.eye_type || undefined,
          form_type: v.form_type || undefined,
          is_active: v.is_active,
          sort_order: v.sort_order,
        })),
      });

      setSuccess(t('prescription.saved'));
      await loadConfig(); // Reload to get updated IDs
    } catch (err: any) {
      setError(err.response?.data?.message || t('prescription.saveFailed'));
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading || loadingConfig) {
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

  if (!config) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-6">
            <Alert type="error" message={t('prescription.categoryNotFound')} />
          </main>
        </div>
        <BottomNav />
      </div>
    );
  }

  const fieldTypes: FieldType[] = ['sph', 'cyl', 'axis', 'pd', 'h', 'year_of_birth', 'add', 'base_curve', 'diameter'];
  const currentValues = config.values[activeTab] || [];

  return (
    <div className="min-h-screen overflow-x-hidden bg-gray-50">
      <Header />
      <div className="flex min-w-0">
        <Sidebar />
        <main className="min-w-0 flex-1 p-3 sm:p-6">
          <div className="mx-auto min-w-0 max-w-7xl">
            <div className="mb-5 sm:mb-6">
              <SectionBackLink href="/prescription-dropdowns" className="mb-3">
                {t('prescription.backToCategories')}
              </SectionBackLink>
              <h1 className="mb-2 break-words text-2xl font-bold text-gray-900 sm:text-3xl">
                {t('config.prescriptionTitle')}: {config.category.name}
              </h1>
              <p className="text-gray-600">
                {t('prescription.detailDescription')}
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

            {/* Tabs */}
            <div className="mb-5 min-w-0 rounded-2xl bg-white shadow-sm sm:mb-6 sm:rounded-lg sm:shadow">
              <div className="border-b border-gray-200">
                <nav className="grid -mb-px grid-cols-2 sm:flex sm:overflow-x-auto" aria-label={t('config.prescriptionTitle')}>
                  {fieldTypes.map((fieldType) => (
                    <button
                      key={fieldType}
                      onClick={() => setActiveTab(fieldType)}
                      className={`min-w-0 border-b-2 px-3 py-2.5 text-left text-xs font-medium leading-snug sm:px-6 sm:py-3 sm:text-sm sm:whitespace-nowrap ${
                        activeTab === fieldType
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {t(FIELD_LABELS[fieldType])}
                      <span className="ml-2 text-xs text-gray-400">
                        ({config.values[fieldType]?.length || 0})
                      </span>
                    </button>
                  ))}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-3 sm:p-6">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="break-words text-lg font-semibold text-gray-900 sm:text-xl">
                    {t(FIELD_LABELS[activeTab])} {t('common.values')}
                  </h2>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleAddValue(activeTab)}
                      className="w-full bg-green-600 text-white hover:bg-green-700 sm:w-auto"
                    >
                      {t('form.addValue')}
                    </Button>
                  </div>
                </div>

                {/* Bulk Import */}
                <div className="mb-4 rounded-xl bg-gray-50 p-3 sm:rounded-lg sm:p-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('form.bulkImport')}
                  </label>
                  <textarea
                    className="block w-full max-w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={3}
                    placeholder={t('form.prescriptionBulkExample')}
                    onBlur={(e) => {
                      if (e.target.value.trim()) {
                        handleBulkImport(activeTab, e.target.value);
                        e.target.value = '';
                      }
                    }}
                  />
                </div>

                {/* Values List */}
                <div className="space-y-2">
                  {currentValues.length === 0 ? (
                    <p className="py-8 text-center text-gray-500">{t('form.noPrescriptionValues')}</p>
                  ) : (
                    currentValues.map((value, index) => (
                      <div
                        key={value.id || index}
                        className="flex min-w-0 flex-col gap-3 rounded-xl border border-gray-200 p-3 hover:bg-gray-50 sm:flex-row sm:gap-4 sm:rounded-lg sm:p-4"
                      >
                        <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                          <Input
                            label={t('form.value')}
                            value={value.value}
                            onChange={(e) =>
                              handleUpdateValue(activeTab, index, { value: e.target.value })
                            }
                            required
                          />
                          <Input
                            label={t('form.labelOptional')}
                            value={value.label || ''}
                            onChange={(e) =>
                              handleUpdateValue(activeTab, index, { label: e.target.value })
                            }
                          />
                          {(activeTab === 'sph' || activeTab === 'cyl' || activeTab === 'axis') && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('form.eyeType')}
                              </label>
                              <select
                                value={value.eye_type || 'both'}
                                onChange={(e) =>
                                  handleUpdateValue(activeTab, index, {
                                    eye_type: e.target.value as any,
                                  })
                                }
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                              >
                                {EYE_TYPES.map((type) => (
                                  <option key={type} value={type}>
                                    {type === 'left' ? t('form.leftEye') : type === 'right' ? t('form.rightEye') : t('common.both')}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              {t('form.sortOrder')}
                            </label>
                            <Input
                              type="number"
                              value={value.sort_order}
                              onChange={(e) =>
                                handleUpdateValue(activeTab, index, {
                                  sort_order: parseInt(e.target.value) || 0,
                                })
                              }
                            />
                          </div>
                        </div>
                        <div className="flex items-end">
                          <Button
                            onClick={() => handleDeleteValue(activeTab, index)}
                            className="w-full bg-red-600 text-white hover:bg-red-700 sm:w-auto"
                          >
                            {t('form.delete')}
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="grid grid-cols-2 gap-3 sm:flex sm:justify-end sm:gap-4">
              <Button
                onClick={() => router.push('/prescription-dropdowns')}
                className="w-full bg-gray-600 text-white hover:bg-gray-700 sm:w-auto"
              >
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-blue-600 text-white hover:bg-blue-700 sm:w-auto"
              >
                {saving ? t('common.saving') : t('config.save')}
              </Button>
            </div>
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}


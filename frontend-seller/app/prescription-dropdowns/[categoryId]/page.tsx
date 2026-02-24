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
import {
  getCategoryConfig,
  updateCategoryConfig,
  deleteValue,
  type CategoryPrescriptionConfigDetail,
  type PrescriptionDropdownValue,
} from '@/services/prescription-dropdown-service';

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
  }, [isAuthenticated, categoryId]);

  const loadConfig = async () => {
    try {
      setLoadingConfig(true);
      setError('');
      const data = await getCategoryConfig(categoryId);
      setConfig(data);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to load configuration';
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
        setError(err.response?.data?.message || 'Failed to delete value');
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

      setSuccess('Configuration saved successfully');
      await loadConfig(); // Reload to get updated IDs
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save configuration');
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
            <Alert type="error" message="Category not found" />
          </main>
        </div>
        <BottomNav />
      </div>
    );
  }

  const fieldTypes: FieldType[] = ['sph', 'cyl', 'axis', 'pd', 'h', 'year_of_birth', 'add', 'base_curve', 'diameter'];
  const currentValues = config.values[activeTab] || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6">
              <Button
                onClick={() => router.push('/prescription-dropdowns')}
                className="mb-4 bg-gray-600 hover:bg-gray-700 text-white"
              >
                ← Back to Categories
              </Button>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Prescription Options: {config.category.name}
              </h1>
              <p className="text-gray-600">
                Configure dropdown values for prescription fields. These will appear in buyer prescription forms.
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
            <div className="bg-white rounded-lg shadow mb-6">
              <div className="border-b border-gray-200">
                <nav className="flex -mb-px overflow-x-auto">
                  {fieldTypes.map((fieldType) => (
                    <button
                      key={fieldType}
                      onClick={() => setActiveTab(fieldType)}
                      className={`px-6 py-3 text-sm font-medium border-b-2 whitespace-nowrap ${
                        activeTab === fieldType
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {FIELD_LABELS[fieldType]}
                      <span className="ml-2 text-xs text-gray-400">
                        ({config.values[fieldType]?.length || 0})
                      </span>
                    </button>
                  ))}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                <div className="mb-4 flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {FIELD_LABELS[activeTab]} Values
                  </h2>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleAddValue(activeTab)}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      + Add Value
                    </Button>
                  </div>
                </div>

                {/* Bulk Import */}
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bulk Import (comma or newline separated)
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={3}
                    placeholder="50.00, 50.50, 51.00, 51.50..."
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
                    <p className="text-gray-500 text-center py-8">No values configured</p>
                  ) : (
                    currentValues.map((value, index) => (
                      <div
                        key={value.id || index}
                        className="flex gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex-1 grid grid-cols-2 gap-4">
                          <Input
                            label="Value"
                            value={value.value}
                            onChange={(e) =>
                              handleUpdateValue(activeTab, index, { value: e.target.value })
                            }
                            required
                          />
                          <Input
                            label="Label (optional)"
                            value={value.label || ''}
                            onChange={(e) =>
                              handleUpdateValue(activeTab, index, { label: e.target.value })
                            }
                          />
                          {(activeTab === 'sph' || activeTab === 'cyl' || activeTab === 'axis') && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Eye Type
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
                                    {type.charAt(0).toUpperCase() + type.slice(1)}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Sort Order
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
                            className="bg-red-600 hover:bg-red-700 text-white"
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end gap-4">
              <Button
                onClick={() => router.push('/prescription-dropdowns')}
                className="bg-gray-600 hover:bg-gray-700 text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {saving ? 'Saving...' : 'Save Configuration'}
              </Button>
            </div>
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}


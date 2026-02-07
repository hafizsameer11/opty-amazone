'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import { categoryLensConfigService, type CategoryLensConfig, type CategoryLensConfigDetail } from '@/services/category-lens-config-service';

export default function CategoryLensConfigPage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryLensConfig[]>([]);
  const [expandedCategory, setExpandedCategory] = useState<number | null>(null);
  const [categoryDetail, setCategoryDetail] = useState<CategoryLensConfigDetail | null>(null);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Selected options for current category
  const [selectedLensTypes, setSelectedLensTypes] = useState<number[]>([]);
  const [selectedTreatments, setSelectedTreatments] = useState<number[]>([]);
  const [selectedCoatings, setSelectedCoatings] = useState<number[]>([]);
  const [selectedThicknessMaterials, setSelectedThicknessMaterials] = useState<number[]>([]);
  const [selectedThicknessOptions, setSelectedThicknessOptions] = useState<number[]>([]);

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
      const data = await categoryLensConfigService.getCategoryConfigs();
      setCategories(data);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to load categories');
    } finally {
      setLoadingCategories(false);
    }
  };

  const loadCategoryDetail = async (categoryId: number) => {
    try {
      setLoadingDetail(true);
      const detail = await categoryLensConfigService.getCategoryConfig(categoryId);
      setCategoryDetail(detail);
      setSelectedLensTypes(detail.configured.lens_types);
      setSelectedTreatments(detail.configured.treatments);
      setSelectedCoatings(detail.configured.coatings);
      setSelectedThicknessMaterials(detail.configured.thickness_materials);
      setSelectedThicknessOptions(detail.configured.thickness_options);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to load category details');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCategoryExpand = (categoryId: number) => {
    if (expandedCategory === categoryId) {
      setExpandedCategory(null);
      setCategoryDetail(null);
    } else {
      setExpandedCategory(categoryId);
      loadCategoryDetail(categoryId);
    }
  };

  const handleSave = async (categoryId: number) => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      
      await categoryLensConfigService.updateCategoryConfig(categoryId, {
        lens_type_ids: selectedLensTypes,
        lens_treatment_ids: selectedTreatments,
        lens_coating_ids: selectedCoatings,
        lens_thickness_material_ids: selectedThicknessMaterials,
        lens_thickness_option_ids: selectedThicknessOptions,
      });

      setSuccess('Configuration saved successfully');
      // Reload categories to update the list
      await loadCategories();
      // Reload detail to refresh
      await loadCategoryDetail(categoryId);
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const toggleSelection = (
    id: number,
    selected: number[],
    setSelected: (ids: number[]) => void
  ) => {
    if (selected.includes(id)) {
      setSelected(selected.filter(item => item !== id));
    } else {
      setSelected([...selected, id]);
    }
  };

  if (loading || loadingCategories) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0066CC] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
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
            <div className="py-6">
              <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-6">
                  <h1 className="text-3xl font-bold text-gray-900">Category Lens Configuration</h1>
                  <p className="mt-2 text-gray-600">
                    Configure lens options (types, treatments, coatings, thickness) for each category. 
                    Products in these categories will use these lens options in the customization popup.
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
                    {categories.map((category) => (
                      <div key={category.id} className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900">{category.name}</h3>
                            <p className="text-sm text-gray-500 mt-1">
                              {category.lens_types.length} lens types, {category.lens_treatments.length} treatments, 
                              {category.lens_coatings.length} coatings configured
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            onClick={() => handleCategoryExpand(category.id)}
                            className="ml-4"
                          >
                            {expandedCategory === category.id ? 'Collapse' : 'Configure'}
                          </Button>
                        </div>

                        {expandedCategory === category.id && (
                          <div className="mt-6 space-y-6">
                            {loadingDetail ? (
                              <div className="text-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0066CC] mx-auto"></div>
                                <p className="mt-2 text-gray-600">Loading options...</p>
                              </div>
                            ) : categoryDetail ? (
                              <>
                                {/* Lens Types */}
                                <div>
                                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                                    Lens Types
                                  </label>
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-48 overflow-y-auto p-3 border border-gray-200 rounded-lg">
                                    {categoryDetail.available.lens_types.map((lensType) => (
                                      <label
                                        key={lensType.id}
                                        className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={selectedLensTypes.includes(lensType.id)}
                                          onChange={() => toggleSelection(lensType.id, selectedLensTypes, setSelectedLensTypes)}
                                          className="w-4 h-4 text-[#0066CC] border-gray-300 rounded focus:ring-[#0066CC]"
                                        />
                                        <span className="text-sm text-gray-700">
                                          {lensType.name}
                                          {Number(lensType.price_adjustment) > 0 && (
                                            <span className="text-gray-500 ml-1">
                                              (+${Number(lensType.price_adjustment).toFixed(2)})
                                            </span>
                                          )}
                                        </span>
                                      </label>
                                    ))}
                                  </div>
                                </div>

                                {/* Treatments */}
                                <div>
                                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                                    Treatments
                                  </label>
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-48 overflow-y-auto p-3 border border-gray-200 rounded-lg">
                                    {categoryDetail.available.treatments.map((treatment) => (
                                      <label
                                        key={treatment.id}
                                        className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={selectedTreatments.includes(treatment.id)}
                                          onChange={() => toggleSelection(treatment.id, selectedTreatments, setSelectedTreatments)}
                                          className="w-4 h-4 text-[#0066CC] border-gray-300 rounded focus:ring-[#0066CC]"
                                        />
                                        <span className="text-sm text-gray-700">
                                          {treatment.name}
                                          {Number(treatment.price) > 0 && (
                                            <span className="text-gray-500 ml-1">
                                              (+${Number(treatment.price).toFixed(2)})
                                            </span>
                                          )}
                                        </span>
                                      </label>
                                    ))}
                                  </div>
                                </div>

                                {/* Coatings */}
                                <div>
                                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                                    Coatings
                                  </label>
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-48 overflow-y-auto p-3 border border-gray-200 rounded-lg">
                                    {categoryDetail.available.coatings.map((coating) => (
                                      <label
                                        key={coating.id}
                                        className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={selectedCoatings.includes(coating.id)}
                                          onChange={() => toggleSelection(coating.id, selectedCoatings, setSelectedCoatings)}
                                          className="w-4 h-4 text-[#0066CC] border-gray-300 rounded focus:ring-[#0066CC]"
                                        />
                                        <span className="text-sm text-gray-700">
                                          {coating.name}
                                          {Number(coating.price_adjustment) > 0 && (
                                            <span className="text-gray-500 ml-1">
                                              (+${Number(coating.price_adjustment).toFixed(2)})
                                            </span>
                                          )}
                                        </span>
                                      </label>
                                    ))}
                                  </div>
                                </div>

                                {/* Thickness Materials */}
                                <div>
                                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                                    Thickness Materials
                                  </label>
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-48 overflow-y-auto p-3 border border-gray-200 rounded-lg">
                                    {categoryDetail.available.thickness_materials.map((material) => (
                                      <label
                                        key={material.id}
                                        className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={selectedThicknessMaterials.includes(material.id)}
                                          onChange={() => toggleSelection(material.id, selectedThicknessMaterials, setSelectedThicknessMaterials)}
                                          className="w-4 h-4 text-[#0066CC] border-gray-300 rounded focus:ring-[#0066CC]"
                                        />
                                        <span className="text-sm text-gray-700">
                                          {material.name}
                                          {Number(material.price) > 0 && (
                                            <span className="text-gray-500 ml-1">
                                              (+${Number(material.price).toFixed(2)})
                                            </span>
                                          )}
                                        </span>
                                      </label>
                                    ))}
                                  </div>
                                </div>

                                {/* Thickness Options */}
                                <div>
                                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                                    Thickness Options
                                  </label>
                                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-48 overflow-y-auto p-3 border border-gray-200 rounded-lg">
                                    {categoryDetail.available.thickness_options.map((option) => (
                                      <label
                                        key={option.id}
                                        className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={selectedThicknessOptions.includes(option.id)}
                                          onChange={() => toggleSelection(option.id, selectedThicknessOptions, setSelectedThicknessOptions)}
                                          className="w-4 h-4 text-[#0066CC] border-gray-300 rounded focus:ring-[#0066CC]"
                                        />
                                        <span className="text-sm text-gray-700">
                                          {option.name}
                                          {option.thickness_value && (
                                            <span className="text-gray-500 ml-1">
                                              ({option.thickness_value})
                                            </span>
                                          )}
                                        </span>
                                      </label>
                                    ))}
                                  </div>
                                </div>

                                {/* Save Button */}
                                <div className="flex justify-end pt-4 border-t border-gray-200">
                                  <Button
                                    onClick={() => handleSave(category.id)}
                                    isLoading={saving}
                                  >
                                    Save Configuration
                                  </Button>
                                </div>
                              </>
                            ) : (
                              <div className="text-center py-8 text-gray-500">
                                Failed to load category details
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}


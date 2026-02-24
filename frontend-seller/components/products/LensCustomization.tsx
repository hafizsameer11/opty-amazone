'use client';

import { CreateProductData } from '@/services/product-service';

interface LensCustomizationProps {
  formData: CreateProductData;
  setFormData: (data: CreateProductData | ((prev: CreateProductData) => CreateProductData)) => void;
}

const LENS_INDEX_OPTIONS = [
  { value: '1.5', label: '1.5 (Standard)' },
  { value: '1.56', label: '1.56 (Thin)' },
  { value: '1.6', label: '1.6 (Thinner)' },
  { value: '1.67', label: '1.67 (High Index)' },
  { value: '1.74', label: '1.74 (Ultra Thin)' },
];

const TREATMENT_OPTIONS = [
  { value: 'anti_reflective', label: 'Anti-Reflective Coating' },
  { value: 'blue_light', label: 'Blue Light Filter' },
  { value: 'uv_protection', label: 'UV Protection' },
  { value: 'photochromic', label: 'Photochromic (Transitions)' },
  { value: 'polarized', label: 'Polarized' },
  { value: 'scratch_resistant', label: 'Scratch Resistant' },
  { value: 'hydrophobic', label: 'Hydrophobic (Water Repellent)' },
];

export default function LensCustomization({ formData, setFormData }: LensCustomizationProps) {
  const lensIndexOptions = Array.isArray(formData.lens_index_options) 
    ? formData.lens_index_options 
    : (formData.lens_index_options ? [formData.lens_index_options] : []);

  const treatmentOptions = Array.isArray(formData.treatment_options)
    ? formData.treatment_options
    : (formData.treatment_options ? [formData.treatment_options] : []);

  const toggleLensIndex = (value: string) => {
    const current = lensIndexOptions;
    const newOptions = current.includes(value)
      ? current.filter(opt => opt !== value)
      : [...current, value];
    setFormData({ ...formData, lens_index_options: newOptions });
  };

  const toggleTreatment = (value: string) => {
    const current = treatmentOptions;
    const newOptions = current.includes(value)
      ? current.filter(opt => opt !== value)
      : [...current, value];
    setFormData({ ...formData, treatment_options: newOptions });
  };

  return (
    <div className="space-y-6 bg-gray-50 p-6 rounded-lg border border-gray-200">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Lens Customization Options</h3>
        <p className="text-sm text-gray-600 mb-4">
          Select which lens options customers can choose when customizing their glasses
        </p>
      </div>

      {/* Lens Index Options */}
      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-3">
          Available Lens Index (Thickness Options)
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {LENS_INDEX_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                lensIndexOptions.includes(option.value)
                  ? 'border-[#0066CC] bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <input
                type="checkbox"
                checked={lensIndexOptions.includes(option.value)}
                onChange={() => toggleLensIndex(option.value)}
                className="w-4 h-4 text-[#0066CC] border-gray-300 rounded focus:ring-[#0066CC] mr-3"
              />
              <span className="text-sm font-medium text-gray-700">{option.label}</span>
            </label>
          ))}
        </div>
        {lensIndexOptions.length === 0 && (
          <p className="text-xs text-gray-500 mt-2">No lens index options selected</p>
        )}
      </div>

      {/* Treatment Options */}
      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-3">
          Available Lens Treatments
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {TREATMENT_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                treatmentOptions.includes(option.value)
                  ? 'border-[#0066CC] bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <input
                type="checkbox"
                checked={treatmentOptions.includes(option.value)}
                onChange={() => toggleTreatment(option.value)}
                className="w-4 h-4 text-[#0066CC] border-gray-300 rounded focus:ring-[#0066CC] mr-3"
              />
              <span className="text-sm font-medium text-gray-700">{option.label}</span>
            </label>
          ))}
        </div>
        {treatmentOptions.length === 0 && (
          <p className="text-xs text-gray-500 mt-2">No treatment options selected</p>
        )}
      </div>

      {/* Lens Type (Optional) */}
      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-2">
          Lens Type Description (Optional)
        </label>
        <textarea
          value={formData.lens_type || ''}
          onChange={(e) => setFormData({ ...formData, lens_type: e.target.value })}
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-[#0066CC] focus:border-[#0066CC]"
          rows={2}
          placeholder="e.g., Single Vision, Progressive, Bifocal"
        />
        <p className="text-xs text-gray-500 mt-1">Describe the type of lenses available for this frame</p>
      </div>
    </div>
  );
}


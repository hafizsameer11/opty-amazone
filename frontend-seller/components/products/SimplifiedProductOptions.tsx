'use client';

import { CreateProductData } from '@/services/product-service';
import Input from '@/components/ui/Input';
import LensCustomization from './LensCustomization';

interface SimplifiedProductOptionsProps {
  formData: CreateProductData;
  setFormData: (data: CreateProductData | ((prev: CreateProductData) => CreateProductData)) => void;
  productType: 'frame' | 'sunglasses' | 'contact_lens' | 'eye_hygiene' | 'accessory';
}

export default function SimplifiedProductOptions({
  formData,
  setFormData,
  productType,
}: SimplifiedProductOptionsProps) {
  // For eye glasses and sunglasses, show lens customization
  const showLensCustomization = productType === 'frame' || productType === 'sunglasses';

  return (
    <div className="space-y-6">
      {/* Frame Information - Only for frames and sunglasses */}
      {showLensCustomization && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Frame Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Frame Shape"
              value={formData.frame_shape || ''}
              onChange={(e) => setFormData({ ...formData, frame_shape: e.target.value })}
              placeholder="e.g., Round, Square, Aviator"
            />
            <Input
              label="Frame Material"
              value={formData.frame_material || ''}
              onChange={(e) => setFormData({ ...formData, frame_material: e.target.value })}
              placeholder="e.g., Acetate, Metal, Titanium"
            />
            <Input
              label="Frame Color"
              value={formData.frame_color || ''}
              onChange={(e) => setFormData({ ...formData, frame_color: e.target.value })}
              placeholder="e.g., Black, Brown, Tortoise"
            />
          </div>
          <div className="mt-4">
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              Gender
            </label>
            <select
              value={formData.gender || 'unisex'}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-[#0066CC] focus:border-[#0066CC]"
            >
              <option value="unisex">Unisex</option>
              <option value="men">Men</option>
              <option value="women">Women</option>
              <option value="kids">Kids</option>
            </select>
          </div>
        </div>
      )}

      {/* Lens Customization - Only for frames and sunglasses */}
      {showLensCustomization && (
        <LensCustomization formData={formData} setFormData={setFormData} />
      )}

      {/* Contact Lens Specific Options */}
      {productType === 'contact_lens' && (
        <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Lens Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Brand"
              value={formData.contact_lens_brand || ''}
              onChange={(e) => setFormData({ ...formData, contact_lens_brand: e.target.value })}
            />
            <Input
              label="Type"
              value={formData.contact_lens_type || ''}
              onChange={(e) => setFormData({ ...formData, contact_lens_type: e.target.value })}
              placeholder="e.g., Daily, Monthly, Toric"
            />
            <Input
              label="Color"
              value={formData.contact_lens_color || ''}
              onChange={(e) => setFormData({ ...formData, contact_lens_color: e.target.value })}
            />
            <Input
              label="Material"
              value={formData.contact_lens_material || ''}
              onChange={(e) => setFormData({ ...formData, contact_lens_material: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Replacement Frequency
              </label>
              <select
                value={formData.replacement_frequency || ''}
                onChange={(e) => setFormData({ ...formData, replacement_frequency: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-[#0066CC] focus:border-[#0066CC]"
              >
                <option value="">Select Frequency</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <Input
              label="Water Content (%)"
              value={formData.water_content || ''}
              onChange={(e) => setFormData({ ...formData, water_content: e.target.value })}
              placeholder="e.g., 38%, 55%"
            />
          </div>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.has_uv_filter || false}
                onChange={(e) => setFormData({ ...formData, has_uv_filter: e.target.checked })}
                className="mr-2 w-4 h-4 text-[#0066CC] border-gray-300 rounded focus:ring-[#0066CC]"
              />
              <span className="text-sm font-medium text-gray-700">Has UV Filter</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.can_sleep_with || false}
                onChange={(e) => setFormData({ ...formData, can_sleep_with: e.target.checked })}
                className="mr-2 w-4 h-4 text-[#0066CC] border-gray-300 rounded focus:ring-[#0066CC]"
              />
              <span className="text-sm font-medium text-gray-700">Extended Wear (Can Sleep With)</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_medical_device !== false}
                onChange={(e) => setFormData({ ...formData, is_medical_device: e.target.checked })}
                className="mr-2 w-4 h-4 text-[#0066CC] border-gray-300 rounded focus:ring-[#0066CC]"
              />
              <span className="text-sm font-medium text-gray-700">Medical Device (Requires Prescription)</span>
            </label>
          </div>
        </div>
      )}

      {/* Eye Hygiene Specific Options */}
      {productType === 'eye_hygiene' && (
        <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Product Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Size/Volume"
              value={formData.size_volume || ''}
              onChange={(e) => setFormData({ ...formData, size_volume: e.target.value })}
              placeholder="e.g., 100ml, 200ml, 500ml"
            />
            <Input
              label="Pack Type"
              value={formData.pack_type || ''}
              onChange={(e) => setFormData({ ...formData, pack_type: e.target.value })}
              placeholder="e.g., Single, Multi-pack, Bulk"
            />
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Expiry Date
              </label>
              <Input
                type="date"
                value={formData.expiry_date || ''}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
              />
            </div>
          </div>
        </div>
      )}

      {/* Accessory Options */}
      {productType === 'accessory' && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Product Details</h3>
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              Gender
            </label>
            <select
              value={formData.gender || 'unisex'}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-[#0066CC] focus:border-[#0066CC]"
            >
              <option value="unisex">Unisex</option>
              <option value="men">Men</option>
              <option value="women">Women</option>
              <option value="kids">Kids</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}


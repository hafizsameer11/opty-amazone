'use client';

import { CreateProductData } from '@/services/product-service';
import Input from '@/components/ui/Input';
import LensCustomization from './LensCustomization';
import ProductLensColorsEditor from './ProductLensColorsEditor';
import EyeHygieneVariantsEditor from './EyeHygieneVariantsEditor';
import { useLanguage } from '@/contexts/LanguageContext';

interface SimplifiedProductOptionsProps {
  formData: CreateProductData;
  setFormData: (data: CreateProductData | ((prev: CreateProductData) => CreateProductData)) => void;
  productType: 'frame' | 'sunglasses' | 'contact_lens' | 'eye_hygiene' | 'accessory';
  /** Denser layout for unified product form */
  compact?: boolean;
}

export default function SimplifiedProductOptions({
  formData,
  setFormData,
  productType,
  compact = false,
}: SimplifiedProductOptionsProps) {
  const { t } = useLanguage();
  // For eye glasses and sunglasses, show lens customization
  const showLensCustomization = productType === 'frame' || productType === 'sunglasses';
  const framePad = compact ? 'p-3' : 'p-6';
  const frameTitle = compact ? 'text-sm font-semibold text-gray-900 mb-2' : 'text-lg font-semibold text-gray-900 mb-4';
  const inputCls = compact
    ? '[&_label]:text-xs [&_label]:mb-1 [&_input]:py-2 [&_input]:px-2 [&_input]:text-sm [&_input]:rounded-md'
    : '';

  return (
    <div className={compact ? 'space-y-3' : 'space-y-6'}>
      {showLensCustomization && (
        <div className={`bg-white ${framePad} rounded-lg border border-gray-200`}>
          <h3 className={frameTitle}>{t('form.frameDefaults')}</h3>
          <p className={compact ? 'text-[11px] text-gray-500 mb-2' : 'text-sm text-gray-500 mb-3'}>
            {t('form.frameDefaultsDescription')}
          </p>
          <div className={`grid grid-cols-1 md:grid-cols-3 ${compact ? 'gap-2' : 'gap-4'} ${inputCls}`}>
            <Input
              label={t('form.frameShape')}
              value={formData.frame_shape || ''}
              onChange={(e) => setFormData({ ...formData, frame_shape: e.target.value })}
              placeholder="Round, square…"
            />
            <Input
              label={t('form.frameMaterial')}
              value={formData.frame_material || ''}
              onChange={(e) => setFormData({ ...formData, frame_material: e.target.value })}
              placeholder="Acetate, metal…"
            />
            <Input
              label={t('form.defaultFrameColor')}
              value={formData.frame_color || ''}
              onChange={(e) => setFormData({ ...formData, frame_color: e.target.value })}
              placeholder="Black, tortoise…"
            />
          </div>
          <div className={compact ? 'mt-2' : 'mt-4'}>
            <label className={`block ${compact ? 'text-xs' : 'text-sm'} font-semibold text-gray-700 mb-1`}>{t('form.gender')}</label>
            <select
              value={formData.gender || 'unisex'}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'men' | 'women' | 'unisex' | 'kids' })}
              className={`w-full border border-gray-300 rounded-md focus:ring-1 focus:ring-[#0066CC] ${
                compact ? 'px-2 py-1.5 text-sm' : 'px-4 py-3 border-2'
              }`}
            >
              <option value="unisex">{t('form.unisex')}</option>
              <option value="men">{t('form.men')}</option>
              <option value="women">{t('form.women')}</option>
              <option value="kids">{t('form.kids')}</option>
            </select>
          </div>
        </div>
      )}

      {showLensCustomization && (
        <LensCustomization formData={formData} setFormData={setFormData} compact={compact} />
      )}

      {showLensCustomization && (
        <ProductLensColorsEditor
          compact={compact}
          value={formData.lens_colors || []}
          onChange={(lens_colors) => setFormData((prev) => ({ ...prev, lens_colors }))}
        />
      )}

      {/* Contact Lens Specific Options */}
      {productType === 'contact_lens' && (
        <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('form.contactLensDetails')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={t('form.contactBrand')}
              value={formData.contact_lens_brand || ''}
              onChange={(e) => setFormData({ ...formData, contact_lens_brand: e.target.value })}
            />
            <Input
              label={t('form.contactType')}
              value={formData.contact_lens_type || ''}
              onChange={(e) => setFormData({ ...formData, contact_lens_type: e.target.value })}
              placeholder="e.g., Daily, Monthly, Toric"
            />
            <Input
              label={t('form.contactColor')}
              value={formData.contact_lens_color || ''}
              onChange={(e) => setFormData({ ...formData, contact_lens_color: e.target.value })}
            />
            <Input
              label={t('form.contactMaterial')}
              value={formData.contact_lens_material || ''}
              onChange={(e) => setFormData({ ...formData, contact_lens_material: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                {t('form.replacementFrequency')}
              </label>
              <select
                value={formData.replacement_frequency || ''}
                onChange={(e) => setFormData({ ...formData, replacement_frequency: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-[#0066CC] focus:border-[#0066CC]"
              >
                <option value="">{t('form.selectLensFrequency')}</option>
                <option value="daily">{t('form.daily')}</option>
                <option value="weekly">{t('form.weekly')}</option>
                <option value="monthly">{t('form.monthly')}</option>
                <option value="yearly">{t('form.yearly')}</option>
              </select>
            </div>
            <Input
              label={t('form.waterContent')}
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
              <span className="text-sm font-medium text-gray-700">{t('form.hasUvFilter')}</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.can_sleep_with || false}
                onChange={(e) => setFormData({ ...formData, can_sleep_with: e.target.checked })}
                className="mr-2 w-4 h-4 text-[#0066CC] border-gray-300 rounded focus:ring-[#0066CC]"
              />
              <span className="text-sm font-medium text-gray-700">{t('form.extendedWear')}</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_medical_device !== false}
                onChange={(e) => setFormData({ ...formData, is_medical_device: e.target.checked })}
                className="mr-2 w-4 h-4 text-[#0066CC] border-gray-300 rounded focus:ring-[#0066CC]"
              />
              <span className="text-sm font-medium text-gray-700">{t('form.medicalDevicePrescription')}</span>
            </label>
          </div>
        </div>
      )}

      {/* Eye Hygiene Specific Options */}
      {productType === 'eye_hygiene' && (
        <div className={`bg-white ${framePad} rounded-lg border border-gray-200 space-y-4`}>
          <h3 className={frameTitle}>{t('form.productSpecificDetails')}</h3>
          <p className={compact ? 'text-[11px] text-gray-500 mb-2' : 'text-sm text-gray-500 mb-3'}>
            {t('form.legacyOptional')}
          </p>
          <div className={`grid grid-cols-1 md:grid-cols-2 ${compact ? 'gap-2' : 'gap-4'} ${inputCls}`}>
            <Input
              label={`Size/Volume ${t('form.listingDefault')}`}
              value={formData.size_volume || ''}
              onChange={(e) => setFormData({ ...formData, size_volume: e.target.value })}
              placeholder="e.g., 100ml, 200ml, 500ml"
            />
            <Input
              label={`Pack type ${t('form.listingDefault')}`}
              value={formData.pack_type || ''}
              onChange={(e) => setFormData({ ...formData, pack_type: e.target.value })}
              placeholder="e.g., Single, Multi-pack, Bulk"
            />
            <div>
              <label
                className={`block ${compact ? 'text-xs' : 'text-sm'} font-semibold text-gray-800 mb-2`}
              >
                {t('form.expiry')} ({t('form.productLevel')})
              </label>
              <Input
                type="date"
                value={formData.expiry_date || ''}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
              />
            </div>
          </div>
          <EyeHygieneVariantsEditor formData={formData} setFormData={setFormData} compact={compact} />
        </div>
      )}

      {/* Accessory Options */}
      {productType === 'accessory' && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('form.productDetails')}</h3>
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              {t('form.gender')}
            </label>
            <select
              value={formData.gender || 'unisex'}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-[#0066CC] focus:border-[#0066CC]"
            >
              <option value="unisex">{t('form.unisex')}</option>
              <option value="men">{t('form.men')}</option>
              <option value="women">{t('form.women')}</option>
              <option value="kids">{t('form.kids')}</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}


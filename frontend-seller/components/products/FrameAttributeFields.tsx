'use client';

import type { CreateProductData } from '@/services/product-service';
import { useLanguage } from '@/contexts/LanguageContext';

export const FRAME_SHAPES = ['Round', 'Oval', 'Square', 'Rectangle', 'Cat-Eye', 'Aviator', 'Geometric', 'Wayfarer', 'Browline', 'Clubmaster', 'Rimless', 'Oversized'];
export const FRAME_MATERIALS = ['Acetate', 'Metal', 'Titanium', 'Stainless Steel', 'TR90', 'Combination', 'Plastic', 'Wood', 'Carbon Fibre'];
export const FRAME_COLORS: Array<{ value: string; hex: string }> = [
  { value: 'Black', hex: '#111827' }, { value: 'Tortoise', hex: '#6B4423' }, { value: 'Brown', hex: '#7C4A2D' },
  { value: 'Transparent', hex: '#F8FAFC' }, { value: 'Grey', hex: '#64748B' }, { value: 'Silver', hex: '#B8C2CC' },
  { value: 'Gold', hex: '#D4A017' }, { value: 'Rose Gold', hex: '#B76E79' }, { value: 'Red', hex: '#DC2626' },
  { value: 'Blue', hex: '#2563EB' }, { value: 'Green', hex: '#15803D' }, { value: 'Purple', hex: '#7E22CE' },
  { value: 'Pink', hex: '#EC4899' }, { value: 'White', hex: '#FFFFFF' }, { value: 'Yellow', hex: '#EAB308' },
];

type Props = {
  formData: CreateProductData;
  setFormData: (data: CreateProductData | ((previous: CreateProductData) => CreateProductData)) => void;
  compact?: boolean;
  enabled?: (field: 'frame_shape' | 'frame_material' | 'frame_color') => boolean;
};

const selectClass = 'w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 outline-none transition focus:border-[#0066CC] focus:ring-4 focus:ring-blue-100';

function valuesWithLegacy(values: string[], current?: string | null) {
  return current && !values.includes(current) ? [current, ...values] : values;
}

export function FrameAttributeFields({ formData, setFormData, compact = false, enabled = () => true }: Props) {
  const { t } = useLanguage();
  const colorValues = FRAME_COLORS.map((color) => color.value);
  const fieldWrap = compact ? '' : 'rounded-xl border border-blue-100 bg-white p-4';
  const labelClass = compact ? 'mb-1 block text-xs font-semibold text-slate-700' : 'mb-2 block text-sm font-semibold text-slate-800';
  const selectedColor = FRAME_COLORS.find((color) => color.value === formData.frame_color);

  return <div className={`grid grid-cols-1 gap-3 md:grid-cols-3 ${compact ? 'gap-2' : 'gap-5'}`}>
    {enabled('frame_shape') ? <div className={fieldWrap}>
      <label className={labelClass}>{t('form.frameShape')}</label>
      <select value={formData.frame_shape || ''} onChange={(event) => setFormData({ ...formData, frame_shape: event.target.value || undefined })} className={selectClass}>
        <option value="">{t('frameOptions.selectShape')}</option>
        {valuesWithLegacy(FRAME_SHAPES, formData.frame_shape).map((value) => <option key={value} value={value}>{value}</option>)}
      </select>
    </div> : null}
    {enabled('frame_material') ? <div className={fieldWrap}>
      <label className={labelClass}>{t('form.frameMaterial')}</label>
      <select value={formData.frame_material || ''} onChange={(event) => setFormData({ ...formData, frame_material: event.target.value || undefined })} className={selectClass}>
        <option value="">{t('frameOptions.selectMaterial')}</option>
        {valuesWithLegacy(FRAME_MATERIALS, formData.frame_material).map((value) => <option key={value} value={value}>{value}</option>)}
      </select>
    </div> : null}
    {enabled('frame_color') ? <div className={fieldWrap}>
      <label className={labelClass}>{t('form.frameColor')}</label>
      <div className="flex items-center gap-2">
        <select value={formData.frame_color || ''} onChange={(event) => setFormData({ ...formData, frame_color: event.target.value || undefined })} className={`${selectClass} min-w-0 flex-1`}>
          <option value="">{t('frameOptions.selectColor')}</option>
          {valuesWithLegacy(colorValues, formData.frame_color).map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <label title={t('frameOptions.customColor')} className="relative grid h-11 w-11 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-xl border-2 border-slate-200 bg-white">
          <span className="h-6 w-6 rounded-full border border-slate-300" style={{ backgroundColor: selectedColor?.hex || (formData.frame_color?.startsWith('#') ? formData.frame_color : '#FFFFFF') }} />
          <input aria-label={t('frameOptions.customColor')} className="absolute inset-0 cursor-pointer opacity-0" type="color" value={formData.frame_color?.startsWith('#') ? formData.frame_color : selectedColor?.hex || '#FFFFFF'} onChange={(event) => setFormData({ ...formData, frame_color: event.target.value.toUpperCase() })} />
        </label>
      </div>
    </div> : null}
  </div>;
}

'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import ProductImageUpload from '@/components/products/ProductImageUpload';
import VariantSizesDraftEditor from '@/components/products/VariantSizesDraftEditor';
import { sumSizes } from '@/components/products/variantSizes';
import { type CreateVariantData } from '@/services/product-service';
import { useLanguage } from '@/contexts/LanguageContext';

interface DraftColorVariationsEditorProps {
  value: CreateVariantData[];
  onChange: (variants: CreateVariantData[]) => void;
  productType: string;
}

function emptyVariant(sortOrder: number): CreateVariantData {
  return {
    color_name: '',
    color_code: '#000000',
    images: [],
    price: undefined,
    stock_quantity: 0,
    stock_status: 'in_stock',
    is_default: sortOrder === 0,
    sort_order: sortOrder,
    // Seeded so the Size section renders as soon as the variant is expanded,
    // rather than appearing only after the product has been saved.
    sizes: [],
  };
}

/**
 * A local variant editor used before a product has an id. It intentionally
 * keeps each variation compact until the seller expands it, and does not make
 * variant images a prerequisite for creating a variation.
 */
export default function DraftColorVariationsEditor({
  value,
  onChange,
  productType,
}: DraftColorVariationsEditorProps) {
  const { t } = useLanguage();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const isEyewear = productType === 'frame' || productType === 'sunglasses';

  if (!isEyewear) return null;

  const updateVariant = (index: number, patch: Partial<CreateVariantData>) => {
    onChange(value.map((variant, currentIndex) => currentIndex === index ? { ...variant, ...patch } : variant));
  };

  const addVariant = () => {
    const nextIndex = value.length;
    onChange([...value, emptyVariant(nextIndex)]);
    setExpandedIndex(nextIndex);
  };

  const removeVariant = (index: number) => {
    const next = value
      .filter((_, currentIndex) => currentIndex !== index)
      .map((variant, currentIndex) => ({ ...variant, sort_order: currentIndex, is_default: variant.is_default || currentIndex === 0 }));
    if (!next.some((variant) => variant.is_default) && next[0]) {
      next[0] = { ...next[0], is_default: true };
    }
    onChange(next);
    setExpandedIndex(null);
  };

  const setDefault = (index: number) => {
    onChange(value.map((variant, currentIndex) => ({ ...variant, is_default: currentIndex === index })));
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-xl">
      <div className="flex flex-col gap-4 bg-gradient-to-r from-sky-600 to-blue-700 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div>
          <h2 className="text-xl font-bold text-white">{t('form.colorVariations')}</h2>
          <p className="mt-1 text-sm text-sky-100">{t('form.colorVariationsDescription')}</p>
        </div>
        <Button type="button" size="sm" onClick={addVariant} className="bg-white text-blue-700 hover:bg-sky-50">
          {t('form.addColorVariation')}
        </Button>
      </div>

      <div className="space-y-3 p-4 sm:p-6">
        {value.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center">
            <p className="text-sm font-medium text-slate-700">{t('form.noColorVariations')}</p>
            <p className="mt-1 text-sm text-slate-500">{t('form.addColorFirstHint')}</p>
          </div>
        )}

        {value.map((variant, index) => {
          const isExpanded = expandedIndex === index;
          return (
            <div key={`${variant.sort_order}-${index}`} className="overflow-hidden rounded-xl border border-slate-200 bg-white transition-shadow hover:shadow-sm">
              <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
                <span
                  className="h-10 w-10 shrink-0 rounded-lg border-2 border-white shadow ring-1 ring-slate-200"
                  style={{ backgroundColor: /^#[0-9A-Fa-f]{6}$/.test(variant.color_code || '') ? variant.color_code : '#94a3b8' }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold text-slate-900">{variant.color_name || t('form.colorName')}</p>
                    {variant.is_default && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">{t('form.defaultFrameColor')}</span>
                    )}
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${variant.stock_status === 'in_stock' ? 'bg-emerald-100 text-emerald-700' : variant.stock_status === 'backorder' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                      {variant.stock_status === 'in_stock' ? t('form.inStock') : variant.stock_status === 'backorder' ? t('form.backorder') : t('form.outOfStock')}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {t('form.stock')}: {variant.stock_quantity} · {t('form.imagesLabel')}: {variant.images?.length || 0}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setExpandedIndex(isExpanded ? null : index)}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                  aria-expanded={isExpanded}
                >
                  <svg className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m6 9 6 6 6-6" />
                  </svg>
                </button>
              </div>

              {isExpanded && (
                <div className="space-y-5 border-t border-slate-100 bg-slate-50/70 p-4 sm:p-5">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Input
                      label={t('form.colorName')}
                      value={variant.color_name}
                      onChange={(event) => updateVariant(index, { color_name: event.target.value })}
                    />
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">{t('form.colorCode')}</label>
                      <div className="flex gap-3">
                        <input
                          type="color"
                          value={/^#[0-9A-Fa-f]{6}$/.test(variant.color_code || '') ? variant.color_code : '#000000'}
                          onChange={(event) => updateVariant(index, { color_code: event.target.value })}
                          className="h-11 w-14 rounded-lg border border-slate-300 bg-white"
                          aria-label={t('form.pickColor')}
                        />
                        <Input
                          value={variant.color_code || ''}
                          onChange={(event) => updateVariant(index, { color_code: event.target.value })}
                          placeholder="#000000"
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <Input
                      label={t('form.price')}
                      type="number"
                      min="0"
                      step="0.01"
                      value={variant.price ?? ''}
                      onChange={(event) => updateVariant(index, { price: event.target.value === '' ? undefined : Math.max(0, Number(event.target.value)) })}
                    />
                    <Input
                      label={t('form.stock')}
                      type="number"
                      min="0"
                      value={variant.stock_quantity}
                      readOnly={(variant.sizes?.length ?? 0) > 0}
                      onChange={(event) => updateVariant(index, { stock_quantity: Math.max(0, Number.parseInt(event.target.value, 10) || 0) })}
                    />
                    {(variant.sizes?.length ?? 0) > 0 && (
                      <p className="-mt-2 text-xs text-slate-500 md:col-span-1">{t('form.sizesDriveStock')}</p>
                    )}
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">{t('form.stockStatus')}</label>
                      <select
                        value={variant.stock_status}
                        onChange={(event) => updateVariant(index, { stock_status: event.target.value as CreateVariantData['stock_status'] })}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-800 outline-none ring-blue-200 focus:ring-4"
                      >
                        <option value="in_stock">{t('form.inStock')}</option>
                        <option value="out_of_stock">{t('form.outOfStock')}</option>
                        <option value="backorder">{t('form.backorder')}</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                      <label className="flex min-h-11 w-full items-center gap-3 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={Boolean(variant.is_default)}
                          onChange={() => setDefault(index)}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        {t('form.setDefaultVariant')}
                      </label>
                    </div>
                  </div>

                  <VariantSizesDraftEditor
                    sizes={variant.sizes || []}
                    onChange={(sizes) => {
                      // The backend derives a variant's stock from the sum of its
                      // sizes, so keep the two in step here rather than letting
                      // the seller enter contradictory numbers.
                      const total = sumSizes(sizes);
                      updateVariant(index, {
                        sizes,
                        stock_quantity: total,
                        stock_status: total > 0 ? 'in_stock' : variant.stock_status,
                      });
                    }}
                  />

                  <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
                    <ProductImageUpload
                      images={variant.images || []}
                      onChange={(images) => updateVariant(index, { images })}
                      maxImages={6}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button type="button" variant="danger" size="sm" onClick={() => removeVariant(index)}>
                      {t('form.delete')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
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
    sizes: [],
  };
}

/**
 * Local variant editor used before a product has an id. Color rows stay
 * compact; all fields for a particular color are managed in its modal.
 */
export default function DraftColorVariationsModalEditor({
  value,
  onChange,
  productType,
}: DraftColorVariationsEditorProps) {
  const { t } = useLanguage();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const isEyewear = productType === 'frame' || productType === 'sunglasses';

  if (!isEyewear) return null;

  const updateVariant = (index: number, patch: Partial<CreateVariantData>) => {
    onChange(value.map((variant, currentIndex) => currentIndex === index ? { ...variant, ...patch } : variant));
  };

  const addVariant = () => {
    const nextIndex = value.length;
    onChange([...value, emptyVariant(nextIndex)]);
    setSelectedIndex(nextIndex);
  };

  const removeVariant = (index: number) => {
    const next = value
      .filter((_, currentIndex) => currentIndex !== index)
      .map((variant, currentIndex) => ({
        ...variant,
        sort_order: currentIndex,
        is_default: variant.is_default || currentIndex === 0,
      }));
    if (!next.some((variant) => variant.is_default) && next[0]) {
      next[0] = { ...next[0], is_default: true };
    }
    onChange(next);
    setSelectedIndex(null);
  };

  const setDefault = (index: number) => {
    onChange(value.map((variant, currentIndex) => ({ ...variant, is_default: currentIndex === index })));
  };

  const selectedVariant = selectedIndex === null ? null : value[selectedIndex];

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

        {value.map((variant, index) => (
          <div key={`${variant.sort_order}-${index}`} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 transition-shadow hover:shadow-sm sm:px-5">
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
                {t('form.stock')}: {variant.stock_quantity} · {t('form.imagesLabel')}: {variant.images?.length || 0} · {t('form.sizesStockForColor')}: {variant.sizes?.length || 0}
              </p>
            </div>
            <div className="flex w-full flex-wrap justify-end gap-2 sm:w-auto">
              <Button type="button" variant="outline" size="sm" onClick={() => setSelectedIndex(index)}>
                {t('form.sizesStockForColor')}
              </Button>
              {!variant.is_default && (
                <Button type="button" variant="outline" size="sm" onClick={() => setDefault(index)}>
                  {t('form.setDefault')}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {selectedVariant && selectedIndex !== null && (
        <Modal
          isOpen
          onClose={() => setSelectedIndex(null)}
          title={`${t('form.sizesStockForColor')}: ${selectedVariant.color_name || t('form.colorName')}`}
          size="lg"
        >
          <div
            className="space-y-5"
            onKeyDown={(event) => {
              if (event.key === 'Enter' && (event.target as HTMLElement).tagName !== 'TEXTAREA') {
                event.preventDefault();
              }
            }}
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label={t('form.colorName')}
                value={selectedVariant.color_name}
                onChange={(event) => updateVariant(selectedIndex, { color_name: event.target.value })}
              />
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{t('form.colorCode')}</label>
                <div className="flex gap-3">
                  <input
                    type="color"
                    value={/^#[0-9A-Fa-f]{6}$/.test(selectedVariant.color_code || '') ? selectedVariant.color_code : '#000000'}
                    onChange={(event) => updateVariant(selectedIndex, { color_code: event.target.value })}
                    className="h-11 w-14 rounded-lg border border-slate-300 bg-white"
                    aria-label={t('form.pickColor')}
                  />
                  <Input
                    value={selectedVariant.color_code || ''}
                    onChange={(event) => updateVariant(selectedIndex, { color_code: event.target.value })}
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
                value={selectedVariant.price ?? ''}
                onChange={(event) => updateVariant(selectedIndex, { price: event.target.value === '' ? undefined : Math.max(0, Number(event.target.value)) })}
              />
              <div>
                <Input
                  label={t('form.stock')}
                  type="number"
                  min="0"
                  value={selectedVariant.stock_quantity}
                  readOnly={(selectedVariant.sizes?.length ?? 0) > 0}
                  onChange={(event) => updateVariant(selectedIndex, { stock_quantity: Math.max(0, Number.parseInt(event.target.value, 10) || 0) })}
                />
                {(selectedVariant.sizes?.length ?? 0) > 0 && (
                  <p className="mt-1 text-xs text-slate-500">{t('form.sizesDriveStock')}</p>
                )}
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">{t('form.stockStatus')}</label>
                <select
                  value={selectedVariant.stock_status}
                  onChange={(event) => updateVariant(selectedIndex, { stock_status: event.target.value as CreateVariantData['stock_status'] })}
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
                    checked={Boolean(selectedVariant.is_default)}
                    onChange={() => setDefault(selectedIndex)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  {t('form.setDefaultVariant')}
                </label>
              </div>
            </div>

            <VariantSizesDraftEditor
              sizes={selectedVariant.sizes || []}
              onChange={(sizes) => {
                const total = sumSizes(sizes);
                updateVariant(selectedIndex, {
                  sizes,
                  stock_quantity: total,
                  stock_status: total > 0 ? 'in_stock' : selectedVariant.stock_status,
                });
              }}
            />

            <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
              <ProductImageUpload
                images={selectedVariant.images || []}
                onChange={(images) => updateVariant(selectedIndex, { images })}
                maxImages={6}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
              <Button type="button" variant="danger" size="sm" onClick={() => removeVariant(selectedIndex)}>
                {t('form.delete')}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setSelectedIndex(null)}>
                {t('form.cancel')}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}

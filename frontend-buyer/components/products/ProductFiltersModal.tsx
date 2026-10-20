'use client';

import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { useLanguage } from '@/contexts/LanguageContext';
import { categoryDisplayName } from '@/lib/category-i18n';
import {
  FILTER_PILL_CLASS,
  FILTER_SELECT_CLASS,
  GENDER_OPTIONS,
  PRODUCT_TYPE_OPTIONS,
  STOCK_OPTIONS,
  type ProductFilterDraft,
} from '@/components/products/product-filter-options';

interface ProductFiltersModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Snapshot the modal edits; nothing is fetched until Apply is pressed. */
  draft: ProductFilterDraft;
  onDraftChange: (patch: Partial<ProductFilterDraft>) => void;
  onClearDraft: () => void;
  onApply: () => void;
  categories: Array<{ id: number; name: string; name_it?: string | null; slug: string }>;
  frameShapes: string[];
  frameMaterials: string[];
}

export default function ProductFiltersModal({
  isOpen,
  onClose,
  draft,
  onDraftChange,
  onClearDraft,
  onApply,
  categories,
  frameShapes,
  frameMaterials,
}: ProductFiltersModalProps) {
  const { t, language } = useLanguage();

  const pillGroup = (
    label: string,
    options: Array<{ value: string; labelKey: string; icon?: string }>,
    activeValue: string,
    onChange: (value: string) => void
  ) => (
    <div>
      <p className="block text-sm font-semibold text-gray-900 mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = activeValue === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(active ? '' : option.value)}
              className={FILTER_PILL_CLASS(active)}
            >
              {option.icon && <span className="mr-1" aria-hidden="true">{option.icon}</span>}
              {t(option.labelKey)}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('static.products.allFilters')} size="lg">
      <p className="mb-5 text-sm text-gray-600">{t('static.products.filterHint')}</p>

      <div className="space-y-5">
        {pillGroup(t('static.products.quickType'), PRODUCT_TYPE_OPTIONS, draft.type, (value) =>
          onDraftChange({ type: value })
        )}

        {pillGroup(t('static.products.quickGender'), GENDER_OPTIONS, draft.gender, (value) =>
          onDraftChange({ gender: value })
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="filter-category" className="block text-sm font-semibold text-gray-900 mb-2">
              {t('static.products.category')}
            </label>
            <select
              id="filter-category"
              value={draft.category}
              onChange={(event) => onDraftChange({ category: event.target.value })}
              className={FILTER_SELECT_CLASS}
            >
              <option value="">{t('static.products.allCategories')}</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id.toString()}>
                  {categoryDisplayName(cat, language)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="filter-rating" className="block text-sm font-semibold text-gray-900 mb-2">
              {t('static.products.minimumRating')}
            </label>
            <select
              id="filter-rating"
              value={draft.minRating}
              onChange={(event) => onDraftChange({ minRating: event.target.value })}
              className={FILTER_SELECT_CLASS}
            >
              <option value="">{t('static.products.anyRating')}</option>
              <option value="4.5">{t('static.products.stars45')}</option>
              <option value="4.0">{t('static.products.stars40')}</option>
              <option value="3.5">{t('static.products.stars35')}</option>
              <option value="3.0">{t('static.products.stars30')}</option>
            </select>
          </div>
        </div>

        {frameShapes.length > 0 && (
          <div>
            <label htmlFor="filter-shape" className="block text-sm font-semibold text-gray-900 mb-2">
              {t('static.products.frameShape')}
            </label>
            <select
              id="filter-shape"
              value={draft.frameShape}
              onChange={(event) => onDraftChange({ frameShape: event.target.value })}
              className={FILTER_SELECT_CLASS}
            >
              <option value="">{t('static.products.allShapes')}</option>
              {frameShapes.map((shape) => (
                <option key={shape} value={shape}>
                  {shape.charAt(0).toUpperCase() + shape.slice(1)}
                </option>
              ))}
            </select>
          </div>
        )}

        {frameMaterials.length > 0 && (
          <div>
            <label htmlFor="filter-material" className="block text-sm font-semibold text-gray-900 mb-2">
              {t('static.products.frameMaterial')}
            </label>
            <select
              id="filter-material"
              value={draft.frameMaterial}
              onChange={(event) => onDraftChange({ frameMaterial: event.target.value })}
              className={FILTER_SELECT_CLASS}
            >
              <option value="">{t('static.products.allMaterials')}</option>
              {frameMaterials.map((material) => (
                <option key={material} value={material}>
                  {material.charAt(0).toUpperCase() + material.slice(1)}
                </option>
              ))}
            </select>
          </div>
        )}

        {pillGroup(t('static.products.stockStatus'), STOCK_OPTIONS, draft.stockStatus, (value) =>
          onDraftChange({ stockStatus: value })
        )}

        <div>
          <p className="block text-sm font-semibold text-gray-900 mb-2">{t('static.products.priceRange')}</p>
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="number"
              min="0"
              placeholder={t('static.products.minPrice')}
              value={draft.minPrice}
              onChange={(event) => onDraftChange({ minPrice: event.target.value })}
            />
            <Input
              type="number"
              min="0"
              placeholder={t('static.products.maxPrice')}
              value={draft.maxPrice}
              onChange={(event) => onDraftChange({ maxPrice: event.target.value })}
            />
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col-reverse gap-3 border-t border-gray-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <Button type="button" variant="outline" size="md" onClick={onClearDraft}>
          {t('static.products.clearAllFilters')}
        </Button>
        <Button type="button" variant="primary" size="md" className="sm:min-w-48" onClick={onApply}>
          {t('static.products.applyFilters')}
        </Button>
      </div>
    </Modal>
  );
}

'use client';

import { useMemo } from 'react';
import type { Category } from '@/services/product-service';
import {
  getContactLensSubCategories,
  mergeContactLensSubCategory,
  splitContactLensSubCategory,
} from '@/lib/contact-lens-categories';
import { useLanguage } from '@/contexts/LanguageContext';

interface ContactLensCategorySelectProps {
  categories: Category[];
  mainCategoryId?: number;
  value?: number;
  onChange: (subCategoryId: number | undefined) => void;
}

export default function ContactLensCategorySelect({
  categories,
  mainCategoryId,
  value,
  onChange,
}: ContactLensCategorySelectProps) {
  const { t } = useLanguage();
  const subCategories = useMemo(
    () => getContactLensSubCategories(categories, mainCategoryId),
    [categories, mainCategoryId]
  );

  const { subCategoryId, subSubCategoryId } = useMemo(
    () => splitContactLensSubCategory(categories, mainCategoryId, value),
    [categories, mainCategoryId, value]
  );

  const subSubCategories = useMemo(() => {
    const sub = subCategories.find((s) => s.id === subCategoryId);
    return sub?.children ?? [];
  }, [subCategories, subCategoryId]);

  const showSubSub = subSubCategories.length > 0;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-2">{t('form.subCategory')}</label>
        <select
          value={subCategoryId ?? ''}
          onChange={(e) => {
            const nextSub = e.target.value ? Number(e.target.value) : undefined;
            onChange(mergeContactLensSubCategory(nextSub, undefined));
          }}
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-md"
        >
          <option value="">{t('form.selectSubCategory')}</option>
          {subCategories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {showSubSub && (
        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">{t('form.lensType')}</label>
          <select
            value={subSubCategoryId ?? ''}
            onChange={(e) => {
              const nextChild = e.target.value ? Number(e.target.value) : undefined;
              onChange(mergeContactLensSubCategory(subCategoryId, nextChild));
            }}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-md"
            required={showSubSub}
          >
            <option value="">{t('form.selectLensType')}</option>
            {subSubCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            {t('form.contactLensTypeHint')}
          </p>
        </div>
      )}
    </div>
  );
}

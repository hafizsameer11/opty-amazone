import type { Category } from '@/services/product-service';

export function getContactLensSubCategories(
  categories: Category[],
  mainCategoryId?: number
): Category[] {
  const main = categories.find((c) => c.id === mainCategoryId);
  return main?.children ?? [];
}

/** Split stored sub_category_id into parent sub + optional child (Spherical, etc.). */
export function splitContactLensSubCategory(
  categories: Category[],
  mainCategoryId: number | undefined,
  storedSubCategoryId: number | undefined
): { subCategoryId: number | undefined; subSubCategoryId: number | undefined } {
  if (!storedSubCategoryId) {
    return { subCategoryId: undefined, subSubCategoryId: undefined };
  }

  const subs = getContactLensSubCategories(categories, mainCategoryId);
  const direct = subs.find((s) => s.id === storedSubCategoryId);
  if (direct) {
    return { subCategoryId: direct.id, subSubCategoryId: undefined };
  }

  for (const sub of subs) {
    const child = sub.children?.find((c) => c.id === storedSubCategoryId);
    if (child) {
      return { subCategoryId: sub.id, subSubCategoryId: child.id };
    }
  }

  return { subCategoryId: storedSubCategoryId, subSubCategoryId: undefined };
}

/** Value persisted on product.sub_category_id — leaf when child exists. */
export function mergeContactLensSubCategory(
  subCategoryId: number | undefined,
  subSubCategoryId: number | undefined
): number | undefined {
  return subSubCategoryId ?? subCategoryId;
}

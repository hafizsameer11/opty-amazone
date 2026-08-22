/**
 * Localized category display name (EN name / Italian name_it).
 */
export type CategoryLike = {
  name: string;
  name_it?: string | null;
};

export function categoryDisplayName(
  category: CategoryLike | null | undefined,
  language: 'en' | 'it'
): string {
  if (!category) return '';
  if (language === 'it' && category.name_it && String(category.name_it).trim()) {
    return String(category.name_it).trim();
  }
  return category.name || '';
}

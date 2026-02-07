import { Product } from '@/services/product-service';

/**
 * Main category IDs for lens-enabled categories:
 * - 23: eye glasses
 * - 28: sun glasses
 * - 29: opty kids
 */
const LENS_CATEGORY_IDS = [23, 28, 29];

/**
 * Main category slugs for lens-enabled categories
 */
const LENS_CATEGORY_SLUGS = ['eye-glasses', 'sun-glasses', 'opty-kids'];

/**
 * Check if a product should show lens configuration options.
 * Products in eye glasses, sun glasses, or opty kids categories (and their subcategories)
 * should show lens options, as well as products with frame or sunglasses product_type.
 */
export function shouldShowLensOptions(product: Product): boolean {
  // Check by product type first (most reliable)
  if (product.product_type === 'frame' || product.product_type === 'sunglasses') {
    return true;
  }

  // Check by category
  if (product.category) {
    const categorySlug = product.category.slug?.toLowerCase() || '';
    const categoryName = product.category.name?.toLowerCase() || '';
    
    // Check by category ID (handles parent categories)
    if (LENS_CATEGORY_IDS.includes(product.category.id)) {
      return true;
    }
    
    // Check by category slug patterns (handles subcategories)
    // Eye glasses subcategories: men, women, etc.
    if (categorySlug === 'eye-glasses' || categorySlug === 'eye-glasses' || 
        categorySlug.startsWith('eye-glasses-') ||
        categoryName === 'eye glasses' || categoryName.startsWith('eye glasses')) {
      return true;
    }
    
    // Sun glasses subcategories: men-glasses, women-glasses, etc.
    if (categorySlug === 'sun-glasses' || categorySlug === 'sun-glasses' ||
        categorySlug.startsWith('sun-glasses-') ||
        categorySlug.includes('men-glasses') || categorySlug.includes('women-glasses') ||
        categoryName === 'sun glasses' || categoryName.startsWith('sun glasses')) {
      return true;
    }
    
    // Opty kids subcategories: baby-girl, baby-boy, etc.
    if (categorySlug === 'opty-kids' || categorySlug.startsWith('opty-kids-') ||
        categorySlug.includes('baby-girl') || categorySlug.includes('baby-boy') ||
        categoryName === 'opty kids' || categoryName.startsWith('opty kids') ||
        categoryName.includes('baby girl') || categoryName.includes('baby boy')) {
      return true;
    }
    
    // Check if slug matches any main category
    if (LENS_CATEGORY_SLUGS.some(slug => categorySlug === slug)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a product is in the eye glasses, sun glasses, or opty kids category tree.
 * This is used for determining if color variants should be shown.
 */
export function isEyeProductCategory(product: Product): boolean {
  return shouldShowLensOptions(product);
}

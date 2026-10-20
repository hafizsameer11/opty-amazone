/**
 * Product filter vocabulary shared by the listing page and its filter modal.
 *
 * The option arrays hold translation *keys* rather than labels because they are
 * module scope and therefore cannot call the `t` function; callers translate at
 * render time.
 */

export const PRODUCT_TYPE_OPTIONS = [
  { value: 'frame', labelKey: 'static.products.typeFrames', icon: '🕶️' },
  { value: 'sunglasses', labelKey: 'static.products.typeSunglasses', icon: '😎' },
  { value: 'contact_lens', labelKey: 'static.products.typeContactLenses', icon: '👁️' },
  { value: 'eye_hygiene', labelKey: 'static.products.typeEyeHygiene', icon: '💧' },
  { value: 'accessory', labelKey: 'static.products.typeAccessories', icon: '🎁' },
];

export const GENDER_OPTIONS = [
  { value: 'men', labelKey: 'static.products.genderMen' },
  { value: 'women', labelKey: 'static.products.genderWomen' },
  { value: 'unisex', labelKey: 'static.products.genderUnisex' },
  { value: 'kids', labelKey: 'static.products.genderKids' },
];

export const STOCK_OPTIONS = [
  { value: 'in_stock', labelKey: 'static.products.stockIn' },
  { value: 'out_of_stock', labelKey: 'static.products.stockOut' },
  { value: 'backorder', labelKey: 'static.products.stockBackorder' },
];

export const SORT_OPTIONS = [
  { value: 'created_at_desc', labelKey: 'static.products.sortNewest' },
  { value: 'created_at_asc', labelKey: 'static.products.sortOldest' },
  { value: 'price_asc', labelKey: 'static.products.sortPriceAsc' },
  { value: 'price_desc', labelKey: 'static.products.sortPriceDesc' },
  { value: 'rating_desc', labelKey: 'static.products.sortRating' },
  { value: 'view_count_desc', labelKey: 'static.products.sortViews' },
];

/**
 * The filters the modal edits. It is a separate object from the page's live
 * state so that closing the modal without applying leaves results untouched.
 */
export interface ProductFilterDraft {
  category: string;
  type: string;
  gender: string;
  frameShape: string;
  frameMaterial: string;
  stockStatus: string;
  minRating: string;
  minPrice: string;
  maxPrice: string;
}

export const EMPTY_PRODUCT_FILTER_DRAFT: ProductFilterDraft = {
  category: '',
  type: '',
  gender: '',
  frameShape: '',
  frameMaterial: '',
  stockStatus: '',
  minRating: '',
  minPrice: '',
  maxPrice: '',
};

/** Pill button styling shared by the type / gender / stock groups. */
export const FILTER_PILL_CLASS = (active: boolean) =>
  `rounded-full px-3 py-1.5 text-xs font-semibold border transition-all duration-200 ${
    active
      ? 'bg-[#0066CC] text-white border-[#0066CC] shadow-sm scale-105'
      : 'bg-white text-gray-700 border-gray-300 hover:border-[#0066CC] hover:text-[#0066CC] hover:-translate-y-0.5'
  }`;

/** Native select styling shared by the modal and the listing toolbar. */
export const FILTER_SELECT_CLASS =
  'w-full px-3 py-2.5 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-[#0066CC] focus:border-[#0066CC] transition-all';

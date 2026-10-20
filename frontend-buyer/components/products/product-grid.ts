/**
 * Responsive column ramp shared by every buyer-side product grid.
 *
 * Products start at two columns on phones and step up to six on extra-wide
 * screens, which is what gives the listing page a true six-column layout
 * without collapsing the narrower grids used on the homepage, search and
 * category pages.
 *
 * Defined here rather than in `lib/` on purpose: Tailwind only scans
 * `app/`, `pages/` and `components/` for class names, so a constant living
 * outside those folders would be purged from the stylesheet.
 */
export const PRODUCT_GRID_CLASS =
  'grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6';

/**
 * Image stage shared by every buyer-side product card: a pure white box
 * whose image fills as much of it as possible while staying fully visible.
 */
export const PRODUCT_IMAGE_STAGE_CLASS = 'relative w-full overflow-hidden bg-white';

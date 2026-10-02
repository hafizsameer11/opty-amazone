'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { productService, type Product, type ProductListParams } from '@/services/product-service';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

const PRODUCTS_PER_PAGE = 24;

/** Debounce so a fast typist sends one request instead of one per keystroke. */
const SEARCH_DEBOUNCE_MS = 350;

const SORT_OPTIONS = [
  { value: 'created_at_desc', label: 'Newest first' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'rating_desc', label: 'Top rated' },
  { value: 'name_asc', label: 'Name: A to Z' },
  { value: 'name_desc', label: 'Name: Z to A' },
];

const PRODUCT_TYPES = [
  { value: '', label: 'All types' },
  { value: 'frame', label: 'Frames' },
  { value: 'sunglasses', label: 'Sunglasses' },
  { value: 'contact_lens', label: 'Contact lenses' },
  { value: 'eye_hygiene', label: 'Eye hygiene' },
  { value: 'accessory', label: 'Accessories' },
];

const GENDERS = [
  { value: '', label: 'Everyone' },
  { value: 'men', label: 'Men' },
  { value: 'women', label: 'Women' },
  { value: 'unisex', label: 'Unisex' },
  { value: 'kids', label: 'Kids' },
];

const STOCK_STATUSES = [
  { value: '', label: 'Any availability' },
  { value: 'in_stock', label: 'In stock' },
  { value: 'backorder', label: 'On backorder' },
  { value: 'out_of_stock', label: 'Out of stock' },
];

const RATINGS = [
  { value: '', label: 'Any rating' },
  { value: '4.5', label: '4.5+ stars' },
  { value: '4', label: '4.0+ stars' },
  { value: '3.5', label: '3.5+ stars' },
  { value: '3', label: '3.0+ stars' },
];

type StoreProductBrowserProps = {
  storeId: number;
  /** Rendered for each product, so the page keeps control of its own card. */
  renderProduct: (product: Product) => ReactNode;
};

const selectClass =
  'w-full px-3 py-2.5 border border-gray-300 rounded-xl bg-white text-sm text-gray-900 focus:ring-2 focus:ring-[#0066CC] focus:border-[#0066CC] transition-all';

/**
 * Searchable, filterable product listing for a single store.
 *
 * Search and filters are sent to the API rather than applied to the fetched
 * page, so a match on page four is as reachable as one on page one.
 */
export default function StoreProductBrowser({ storeId, renderProduct }: StoreProductBrowserProps) {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [productType, setProductType] = useState('');
  const [gender, setGender] = useState('');
  const [frameShape, setFrameShape] = useState('');
  const [frameMaterial, setFrameMaterial] = useState('');
  const [stockStatus, setStockStatus] = useState('');
  const [minRating, setMinRating] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sort, setSort] = useState('created_at_desc');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [availableShapes, setAvailableShapes] = useState<string[]>([]);
  const [availableMaterials, setAvailableMaterials] = useState<string[]>([]);

  // Debounce the text query so typing does not fan out into a request per key.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const buildParams = useCallback(
    (page: number): ProductListParams => {
      const [sortBy, sortOrder] = sort.split('_') as [string, 'asc' | 'desc'];
      const params: ProductListParams = {
        store_id: storeId,
        per_page: PRODUCTS_PER_PAGE,
        page,
        sort_by: sortBy,
        sort_order: sortOrder,
      };

      if (search) params.search = search;
      if (productType) params.product_type = productType;
      if (gender) params.gender = gender;
      if (frameShape) params.frame_shape = frameShape;
      if (frameMaterial) params.frame_material = frameMaterial;
      if (stockStatus) params.stock_status = stockStatus as ProductListParams['stock_status'];
      if (minRating) params.min_rating = parseFloat(minRating);
      // Only send a bound the user actually filled in, so an empty box is not
      // read as a price of zero.
      if (minPrice) params.min_price = parseFloat(minPrice);
      if (maxPrice) params.max_price = parseFloat(maxPrice);

      return params;
    },
    [search, productType, gender, frameShape, frameMaterial, stockStatus, minRating, minPrice, maxPrice, sort, storeId],
  );

  const collectFacets = useCallback((rows: Product[], append: boolean) => {
    const shapes = new Set<string>();
    const materials = new Set<string>();
    rows.forEach((product) => {
      if (product.frame_shape) shapes.add(product.frame_shape);
      if (product.frame_material) materials.add(product.frame_material);
    });
    setAvailableShapes((current) =>
      append ? Array.from(new Set([...current, ...shapes])).sort() : Array.from(shapes).sort(),
    );
    setAvailableMaterials((current) =>
      append ? Array.from(new Set([...current, ...materials])).sort() : Array.from(materials).sort(),
    );
  }, []);

  const load = useCallback(
    async (page: number, append: boolean) => {
      if (append) setLoadingMore(true);
      else setLoading(true);

      try {
        const data = await productService.getAll(buildParams(page));
        const rows: Product[] = data.data || [];

        setProducts((current) => {
          if (!append) return rows;
          // A repeated filter could otherwise append the same row twice.
          const knownIds = new Set(current.map((product) => product.id));
          return [...current, ...rows.filter((product) => !knownIds.has(product.id))];
        });

        const resolvedPage = data.current_page || page;
        setCurrentPage(resolvedPage);
        setHasMore(resolvedPage < (data.last_page || resolvedPage));
        setTotal(data.total || 0);
        collectFacets(rows, append);
      } catch (error) {
        console.error('Failed to load products:', error);
        if (!append) {
          setProducts([]);
          setHasMore(false);
          setTotal(0);
        }
      } finally {
        if (append) setLoadingMore(false);
        else setLoading(false);
      }
    },
    [buildParams, collectFacets],
  );

  // Any change to the query restarts from the first page, otherwise a filter
  // could leave the viewer stranded on a page that no longer exists.
  const filterSignature = useMemo(
    () => JSON.stringify([storeId, search, productType, gender, frameShape, frameMaterial, stockStatus, minRating, minPrice, maxPrice, sort]),
    [storeId, search, productType, gender, frameShape, frameMaterial, stockStatus, minRating, minPrice, maxPrice, sort],
  );

  useEffect(() => {
    void load(1, false);
    // load is intentionally omitted: filterSignature is the full description of
    // what load reads, so listing it alone keeps this from re-running on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterSignature]);

  const clearFilters = () => {
    setSearchInput('');
    setSearch('');
    setProductType('');
    setGender('');
    setFrameShape('');
    setFrameMaterial('');
    setStockStatus('');
    setMinRating('');
    setMinPrice('');
    setMaxPrice('');
    setSort('created_at_desc');
  };

  const activeFilters = useMemo(() => {
    const chips: { key: string; label: string; clear: () => void }[] = [];
    if (search) chips.push({ key: 'search', label: `Search: ${search}`, clear: () => { setSearchInput(''); setSearch(''); } });
    if (productType) chips.push({ key: 'type', label: PRODUCT_TYPES.find((o) => o.value === productType)?.label || productType, clear: () => setProductType('') });
    if (gender) chips.push({ key: 'gender', label: GENDERS.find((o) => o.value === gender)?.label || gender, clear: () => setGender('') });
    if (frameShape) chips.push({ key: 'shape', label: frameShape, clear: () => setFrameShape('') });
    if (frameMaterial) chips.push({ key: 'material', label: frameMaterial, clear: () => setFrameMaterial('') });
    if (stockStatus) chips.push({ key: 'stock', label: STOCK_STATUSES.find((o) => o.value === stockStatus)?.label || stockStatus, clear: () => setStockStatus('') });
    if (minRating) chips.push({ key: 'rating', label: `${minRating}+ stars`, clear: () => setMinRating('') });
    if (minPrice) chips.push({ key: 'minPrice', label: `Min \u20ac${minPrice}`, clear: () => setMinPrice('') });
    if (maxPrice) chips.push({ key: 'maxPrice', label: `Max \u20ac${maxPrice}`, clear: () => setMaxPrice('') });
    return chips;
  }, [search, productType, gender, frameShape, frameMaterial, stockStatus, minRating, minPrice, maxPrice]);

  const noResults = Boolean(search) || activeFilters.length > 0;

  return (
    <div className="mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h2 className="text-2xl font-bold text-gray-900">
          Products{loading ? '' : ` (${total})`}
        </h2>
        <div className="flex items-center gap-2">
          <div className="flex-1 sm:w-64">
            <Input
              type="search"
              placeholder="Search products..."
              aria-label="Search products in this store"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
            aria-controls="store-product-filters"
            className="inline-flex h-[46px] shrink-0 items-center gap-2 rounded-xl border border-gray-300 px-3 text-sm font-semibold text-gray-700 transition-colors hover:border-[#0066CC] hover:text-[#0066CC]"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 5c.5 0 .5.5.5 1v5.5l3.5 2a.6.6 0 0 1-.5 1l-3.5-2a.5.5 0 0 1-.5-.5V6c0-.5 0-1 .5-1ZM5 5h14M7 19h10" />
            </svg>
            Filters
            {activeFilters.length > 0 && (
              <span className="rounded-full bg-[#0066CC] px-1.5 text-xs font-bold text-white">{activeFilters.length}</span>
            )}
          </button>
        </div>
      </div>

      {activeFilters.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {activeFilters.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.clear}
              className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-[#0066CC] transition-colors hover:bg-blue-100"
            >
              {chip.label}
              <span aria-hidden="true">\u00d7</span>
              <span className="sr-only">Remove filter</span>
            </button>
          ))}
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs font-semibold text-gray-500 underline transition-colors hover:text-gray-700"
          >
            Clear all
          </button>
        </div>
      )}

      {filtersOpen && (
        <div id="store-product-filters" className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label htmlFor="filter-sort" className="mb-2 block text-sm font-semibold text-gray-900">Sort by</label>
              <select id="filter-sort" className={selectClass} value={sort} onChange={(e) => setSort(e.target.value)}>
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="filter-type" className="mb-2 block text-sm font-semibold text-gray-900">Product type</label>
              <select id="filter-type" className={selectClass} value={productType} onChange={(e) => setProductType(e.target.value)}>
                {PRODUCT_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="filter-gender" className="mb-2 block text-sm font-semibold text-gray-900">Audience</label>
              <select id="filter-gender" className={selectClass} value={gender} onChange={(e) => setGender(e.target.value)}>
                {GENDERS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="filter-stock" className="mb-2 block text-sm font-semibold text-gray-900">Availability</label>
              <select id="filter-stock" className={selectClass} value={stockStatus} onChange={(e) => setStockStatus(e.target.value)}>
                {STOCK_STATUSES.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="filter-rating" className="mb-2 block text-sm font-semibold text-gray-900">Minimum rating</label>
              <select id="filter-rating" className={selectClass} value={minRating} onChange={(e) => setMinRating(e.target.value)}>
                {RATINGS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="filter-shape" className="mb-2 block text-sm font-semibold text-gray-900">Frame shape</label>
              <select id="filter-shape" className={selectClass} value={frameShape} onChange={(e) => setFrameShape(e.target.value)}>
                <option value="">Any shape</option>
                {availableShapes.map((shape) => (
                  <option key={shape} value={shape}>{shape}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="filter-material" className="mb-2 block text-sm font-semibold text-gray-900">Frame material</label>
              <select id="filter-material" className={selectClass} value={frameMaterial} onChange={(e) => setFrameMaterial(e.target.value)}>
                <option value="">Any material</option>
                {availableMaterials.map((material) => (
                  <option key={material} value={material}>{material}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-2">
              <label htmlFor="filter-price" className="mb-2 block text-sm font-semibold text-gray-900">Price range (\u20ac)</label>
              <div className="grid grid-cols-2 gap-2">
                <Input id="filter-price" type="number" min={0} placeholder="Min" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
                <Input id="filter-price-max" type="number" min={0} placeholder="Max" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
              </div>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:border-[#0066CC] hover:text-[#0066CC]"
            >
              Clear all filters
            </button>
            <button
              type="button"
              onClick={() => setFiltersOpen(false)}
              className="rounded-xl bg-[#0066CC] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0055aa]"
            >
              Show {total} {total === 1 ? 'product' : 'products'}
            </button>
          </div>
        </div>
      )}

      {!loading && products.length > 0 && (
        <p className="mb-4 text-sm text-gray-600">
          Showing {products.length} of {total} {total === 1 ? 'product' : 'products'}
        </p>
      )}

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {[...Array(8)].map((_, index) => (
            <div key={index} className="h-64 animate-pulse rounded-xl bg-gray-200" />
          ))}
        </div>
      ) : products.length > 0 ? (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => renderProduct(product))}
          </div>
          {loadingMore && (
            <div className="mt-6 flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#0066CC]" />
            </div>
          )}
          {/*
            Kept outside the results branch on purpose: when a query matches
            nothing the viewer still needs a way to reach later pages.
          */}
          {hasMore && !loadingMore && (
            <div className="mt-6 text-center">
              <Button onClick={() => void load(currentPage + 1, true)} variant="outline" size="lg">
                Load more products
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          {noResults ? (
            <>
              <p className="text-gray-600">No products match your search or filters.</p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-3 text-sm font-semibold text-[#0066CC] underline transition-colors hover:text-[#0055aa]"
              >
                Clear filters
              </button>
            </>
          ) : (
            <p className="text-gray-600">No products found in this store.</p>
          )}
        </div>
      )}
    </div>
  );
}
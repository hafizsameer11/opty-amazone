'use client';
import PromotionalBanners from '@/components/campaigns/PromotionalBanners';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
// Layout components are now handled by app/template.tsx
import { productService, type Product, type ProductListParams } from '@/services/product-service';
import { isEyeProductCategory } from '@/utils/product-utils';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import ProductListCard from '@/components/products/ProductListCard';
import { getFullImageUrl, isLocalhostImage } from '@/lib/image-utils';
import DiscountCampaignIndicator from '@/components/campaigns/DiscountCampaignIndicator';
import { useLanguage } from '@/contexts/LanguageContext';
import { categoryDisplayName } from '@/lib/category-i18n';
import ProductFiltersModal from '@/components/products/ProductFiltersModal';
import {
  EMPTY_PRODUCT_FILTER_DRAFT,
  GENDER_OPTIONS,
  PRODUCT_TYPE_OPTIONS,
  SORT_OPTIONS,
  STOCK_OPTIONS,
  type ProductFilterDraft,
} from '@/components/products/product-filter-options';
import { PRODUCT_GRID_CLASS, PRODUCT_IMAGE_STAGE_CLASS } from '@/components/products/product-grid';

const PRODUCTS_PER_PAGE = 20;

function ProductCard({ product }: { product: Product }) {
  const { t } = useLanguage();
  const [hoveredVariantId, setHoveredVariantId] = useState<number | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  
  // Check if product has variants and is an eye product category or frame/sunglasses type
  const isEyeProduct = isEyeProductCategory(product);
  const hasVariants = product.variants && product.variants.length > 0;
  const showColorSwatches = isEyeProduct && hasVariants;
  
  // Get default variant or first variant
  const defaultVariant = hasVariants && product.variants
    ? product.variants.find(v => v.is_default) || product.variants[0]
    : null;
  
  // Determine which image to show - prioritize selected, then hovered, then default
  const getDisplayImage = () => {
    const activeVariantId = selectedVariantId || hoveredVariantId;
    
    if (showColorSwatches && activeVariantId) {
      const variant = product.variants?.find(v => v.id === activeVariantId);
      if (variant && variant.images && variant.images.length > 0) {
        return variant.images[0];
      }
    }
    if (defaultVariant && defaultVariant.images && defaultVariant.images.length > 0) {
      return defaultVariant.images[0];
    }
    const images = product.images || [];
    return images[0] || '/file.svg';
  };

  const displayImage = getDisplayImage();
  const displayImageUrl = getFullImageUrl(displayImage);
  const activeVariantId = selectedVariantId || hoveredVariantId;
  const displayPrice = activeVariantId && hasVariants && product.variants
    ? product.variants.find(v => v.id === activeVariantId)?.price ?? product.price
    : (defaultVariant?.price ?? product.price);
  const displayPricing = activeVariantId && hasVariants && product.variants
    ? product.variants.find(v => v.id === activeVariantId)?.pricing ?? product.pricing
    : defaultVariant?.pricing ?? product.pricing;

  return (
    <Link
      href={`/products/${product.id}`}
      className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 overflow-hidden group relative flex flex-col h-full"
    >
      <div className={`${PRODUCT_IMAGE_STAGE_CLASS} h-48 sm:h-56 border-b border-gray-100`}>
        <div className="absolute inset-0 flex items-center justify-center p-3">
          <Image
            src={displayImageUrl}
            alt={product.name}
            width={200}
            height={200}
            className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
            unoptimized={isLocalhostImage(displayImageUrl)}
          />
        </div>
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-[#0066CC] transition-colors text-sm sm:text-base">
          {product.name}
        </h3>
        <div className="flex items-center gap-1 mb-2">
          <div className="flex text-yellow-400 text-xs">
            {[...Array(5)].map((_, i) => (
              <svg
                key={i}
                className={`w-3.5 h-3.5 ${
                  i < Math.floor(product.rating || 0) ? 'fill-current' : 'text-gray-300'
                }`}
                viewBox="0 0 20 20"
              >
                <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
              </svg>
            ))}
          </div>
          <span className="text-xs text-gray-500 ml-1">
            ({product.review_count || 0})
          </span>
        </div>
        {showColorSwatches && product.variants && (
          <div className="mb-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-gray-600 font-medium">{t('static.products.colors')}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {product.variants.map((variant) => {
                const isSelected = selectedVariantId === variant.id;
                const isHovered = hoveredVariantId === variant.id;
                return (
                  <button
                    key={variant.id}
                    type="button"
                    onMouseEnter={() => setHoveredVariantId(variant.id)}
                    onMouseLeave={() => setHoveredVariantId(null)}
                    className={`w-6 h-6 rounded-full border-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#0066CC] ring-2 ring-[#0066CC]/30 scale-125 shadow-md'
                        : isHovered
                        ? 'border-[#0066CC] ring-1 ring-[#0066CC]/20 scale-110'
                        : 'border-gray-300 hover:border-gray-400 hover:scale-110'
                    }`}
                    style={{
                      backgroundColor: variant.color_code || '#ccc',
                    }}
                    title={variant.color_name}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedVariantId(variant.id);
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}
        <DiscountCampaignIndicator pricing={displayPricing} compact className="mb-2" />
        <div className="mt-auto flex items-center justify-between">
          <div className="text-lg sm:text-xl font-bold text-[#0066CC]">
            €{Number(displayPrice || 0).toFixed(2)}
          </div>
          {product.compare_at_price && Number(product.compare_at_price) > Number(displayPrice || 0) && (
            <span className="text-xs sm:text-sm text-gray-500 line-through">
              €{Number(product.compare_at_price || 0).toFixed(2)}
            </span>
          )}
        </div>
        {product.store && (
          <p className="text-xs text-gray-500 mt-2">by {product.store.name}</p>
        )}
      </div>
    </Link>
  );
}

export default function ProductsPage() {
  const { t, language } = useLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMoreProducts, setLoadingMoreProducts] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreProducts, setHasMoreProducts] = useState(false);
  const [total, setTotal] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedGender, setSelectedGender] = useState<string>('');
  const [selectedFrameShape, setSelectedFrameShape] = useState<string>('');
  const [selectedFrameMaterial, setSelectedFrameMaterial] = useState<string>('');
  const [selectedStockStatus, setSelectedStockStatus] = useState<string>('');
  const [minRating, setMinRating] = useState<string>('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Filter modal: edits a draft copy so results only change when Apply is pressed.
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterDraft, setFilterDraft] = useState<ProductFilterDraft>(EMPTY_PRODUCT_FILTER_DRAFT);

  const [categories, setCategories] = useState<Array<{ id: number; name: string; name_it?: string | null; slug: string }>>([]);
  const [availableFrameShapes, setAvailableFrameShapes] = useState<string[]>([]);
  const [availableFrameMaterials, setAvailableFrameMaterials] = useState<string[]>([]);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await productService.getCategories(true);
      setCategories(data || []);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadProducts = useCallback(async (page = 1, append = false) => {
    try {
      if (append) {
        setLoadingMoreProducts(true);
      } else {
        setLoading(true);
      }
      const params: ProductListParams = {
        per_page: PRODUCTS_PER_PAGE,
        page,
        sort_by: sortBy,
        sort_order: sortOrder,
      };

      if (search) params.search = search;
      if (selectedCategory) params.category_id = parseInt(selectedCategory);
      if (selectedType) params.product_type = selectedType;
      if (selectedGender) params.gender = selectedGender;
      if (selectedFrameShape) params.frame_shape = selectedFrameShape;
      if (selectedFrameMaterial) params.frame_material = selectedFrameMaterial;
      if (selectedStockStatus) params.stock_status = selectedStockStatus as 'in_stock' | 'out_of_stock' | 'backorder';
      if (minRating) params.min_rating = parseFloat(minRating);
      if (minPrice) params.min_price = parseFloat(minPrice);
      if (maxPrice) params.max_price = parseFloat(maxPrice);

      const data = await productService.getAll(params);
      const productsData = data.data || [];
      setProducts((current) => {
        if (!append) return productsData;
        const knownIds = new Set(current.map((product) => product.id));
        return [...current, ...productsData.filter((product: Product) => !knownIds.has(product.id))];
      });
      setCurrentPage(data.current_page || page);
      setHasMoreProducts((data.current_page || page) < (data.last_page || page));
      setTotal(data.total || 0);

      // Extract unique frame shapes and materials from products
      const shapes = new Set<string>();
      const materials = new Set<string>();
      productsData.forEach((product: Product) => {
        if (product.frame_shape) shapes.add(product.frame_shape);
        if (product.frame_material) materials.add(product.frame_material);
      });
      setAvailableFrameShapes((current) =>
        append ? Array.from(new Set([...current, ...shapes])).sort() : Array.from(shapes).sort()
      );
      setAvailableFrameMaterials((current) =>
        append ? Array.from(new Set([...current, ...materials])).sort() : Array.from(materials).sort()
      );
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      if (append) {
        setLoadingMoreProducts(false);
      } else {
        setLoading(false);
      }
    }
  }, [search, selectedCategory, selectedType, selectedGender, selectedFrameShape, selectedFrameMaterial, selectedStockStatus, minRating, minPrice, maxPrice, sortBy, sortOrder]);

  useEffect(() => {
    void loadProducts(1);
  }, [loadProducts]);

  const loadMoreProducts = () => {
    if (!hasMoreProducts || loadingMoreProducts) return;
    void loadProducts(currentPage + 1, true);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedCategory('');
    setSelectedType('');
    setSelectedGender('');
    setSelectedFrameShape('');
    setSelectedFrameMaterial('');
    setSelectedStockStatus('');
    setMinRating('');
    setMinPrice('');
    setMaxPrice('');
    setSortBy('created_at');
    setSortOrder('desc');
    setFilterDraft({ ...EMPTY_PRODUCT_FILTER_DRAFT });
    setCurrentPage(1);
  };

  /** Seed the modal from the live filters so it always opens on current values. */
  const openFilters = () => {
    setFilterDraft({
      category: selectedCategory,
      type: selectedType,
      gender: selectedGender,
      frameShape: selectedFrameShape,
      frameMaterial: selectedFrameMaterial,
      stockStatus: selectedStockStatus,
      minRating,
      minPrice,
      maxPrice,
    });
    setFiltersOpen(true);
  };

  const applyFilters = () => {
    setSelectedCategory(filterDraft.category);
    setSelectedType(filterDraft.type);
    setSelectedGender(filterDraft.gender);
    setSelectedFrameShape(filterDraft.frameShape);
    setSelectedFrameMaterial(filterDraft.frameMaterial);
    setSelectedStockStatus(filterDraft.stockStatus);
    setMinRating(filterDraft.minRating);
    setMinPrice(filterDraft.minPrice);
    setMaxPrice(filterDraft.maxPrice);
    setCurrentPage(1);
    setFiltersOpen(false);
  };

  // Active filters as removable chips: each one can be dismissed on its own.
  const activeFilterChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; clear: () => void }> = [];
    const add = (key: string, label: string, clear: () => void) => chips.push({ key, label, clear });

    if (search) {
      add('search', t('static.products.chipSearch', { value: search }), () => { setSearch(''); setCurrentPage(1); });
    }
    if (selectedCategory) {
      const category = categories.find((c) => c.id.toString() === selectedCategory);
      add(
        'category',
        t('static.products.chipCategory', { value: category ? categoryDisplayName(category, language) : selectedCategory }),
        () => { setSelectedCategory(''); setCurrentPage(1); }
      );
    }
    if (selectedType) {
      const option = PRODUCT_TYPE_OPTIONS.find((o) => o.value === selectedType);
      add(
        'type',
        t('static.products.chipType', { value: option ? t(option.labelKey) : selectedType }),
        () => { setSelectedType(''); setCurrentPage(1); }
      );
    }
    if (selectedGender) {
      const option = GENDER_OPTIONS.find((o) => o.value === selectedGender);
      add(
        'gender',
        t('static.products.chipGender', { value: option ? t(option.labelKey) : selectedGender }),
        () => { setSelectedGender(''); setCurrentPage(1); }
      );
    }
    if (selectedFrameShape) {
      add('shape', t('static.products.chipShape', { value: selectedFrameShape }), () => { setSelectedFrameShape(''); setCurrentPage(1); });
    }
    if (selectedFrameMaterial) {
      add('material', t('static.products.chipMaterial', { value: selectedFrameMaterial }), () => { setSelectedFrameMaterial(''); setCurrentPage(1); });
    }
    if (selectedStockStatus) {
      const option = STOCK_OPTIONS.find((o) => o.value === selectedStockStatus);
      add(
        'stock',
        t('static.products.chipStock', { value: option ? t(option.labelKey) : selectedStockStatus }),
        () => { setSelectedStockStatus(''); setCurrentPage(1); }
      );
    }
    if (minRating) {
      add('minRating', t('static.products.chipMinRating', { value: minRating }), () => { setMinRating(''); setCurrentPage(1); });
    }
    if (minPrice) {
      add('minPrice', t('static.products.chipMinPrice', { value: minPrice }), () => { setMinPrice(''); setCurrentPage(1); });
    }
    if (maxPrice) {
      add('maxPrice', t('static.products.chipMaxPrice', { value: maxPrice }), () => { setMaxPrice(''); setCurrentPage(1); });
    }

    return chips;
  }, [
    search,
    selectedCategory,
    categories,
    selectedType,
    selectedGender,
    selectedFrameShape,
    selectedFrameMaterial,
    selectedStockStatus,
    minRating,
    minPrice,
    maxPrice,
    t,
    language,
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 w-full">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">{t('static.products.title')}</h1>
          <p className="text-gray-600">{t('static.products.intro')}</p>
        </div>

        <div className="mt-2">
          {/* Search bar */}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-stretch">
            <form onSubmit={handleSearch} className="flex flex-1 items-stretch gap-2" role="search">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
                  </svg>
                </span>
                <Input
                  type="text"
                  aria-label={t('static.products.searchProducts')}
                  placeholder={t('static.products.searchProducts')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10"
                />
              </div>
              <Button type="submit" variant="primary" size="md" className="shrink-0">
                {t('static.products.searchSubmit')}
              </Button>
            </form>
            <Button
              type="button"
              variant="outline"
              size="md"
              className="shrink-0"
              aria-haspopup="dialog"
              aria-expanded={filtersOpen}
              onClick={openFilters}
            >
              <span className="inline-flex items-center gap-2">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M7 12h10M10 18h4" />
                </svg>
                {t('static.products.filters')}
                {activeFilterChips.length > 0 && (
                  <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[#0066CC] px-1.5 text-[11px] font-bold text-white">
                    {activeFilterChips.length}
                  </span>
                )}
              </span>
            </Button>
          </div>

          {/* Active filters, each removable on its own */}
          {activeFilterChips.length > 0 ? (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {activeFilterChips.map((chip) => (
                <span
                  key={chip.key}
                  className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-[#0066CC]"
                >
                  {chip.label}
                  <button
                    type="button"
                    onClick={chip.clear}
                    aria-label={t('static.products.removeFilter', { label: chip.label })}
                    className="rounded-full p-0.5 text-[#0066CC]/70 transition-colors hover:bg-[#0066CC] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#0066CC]"
                  >
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-full px-3 py-1 text-xs font-semibold text-gray-600 transition-colors hover:text-[#0066CC] hover:underline"
              >
                {t('static.products.clearAllFilters')}
              </button>
            </div>
          ) : null}

          {/* Sidebar banners keep their width; the narrow sidebar is gone. */}
          <div className="mb-6 max-w-md">
            <PromotionalBanners placement="sidebar" />
          </div>


          {/* Products Grid */}
          <div>
            {/* Toolbar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  {t('static.products.showing', { shown: products.length, total })}
                </span>
                {activeFilterChips.length > 0 && (
                  <span className="rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-xs font-semibold text-[#0066CC]">
                    {t('static.products.filtersActive', { count: activeFilterChips.length })}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4">
                {/* Sort */}
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">{t('static.products.sort')}</label>
                  <select
                    value={`${sortBy}_${sortOrder}`}
                    onChange={(e) => {
                      const [by, order] = e.target.value.split('_');
                      setSortBy(by);
                      setSortOrder(order as 'asc' | 'desc');
                      setCurrentPage(1);
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066CC] focus:border-[#0066CC] text-sm"
                  >
                    {SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {t(option.labelKey)}
                      </option>
                    ))}
                  </select>
                </div>
                {/* View Mode */}
                <div className="flex items-center gap-2 border border-gray-300 rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    aria-label={t('static.products.viewGrid')}
                    aria-pressed={viewMode === 'grid'}
                    className={`p-2 rounded ${viewMode === 'grid' ? 'bg-[#0066CC] text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    aria-label={t('static.products.viewList')}
                    aria-pressed={viewMode === 'list'}
                    className={`p-2 rounded ${viewMode === 'list' ? 'bg-[#0066CC] text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Products */}
            {loading ? (
              <div className={viewMode === 'grid'
                ? PRODUCT_GRID_CLASS
                : 'space-y-4'
              }>
                {[...Array(12)].map((_, i) => (
                  <div key={i} className={viewMode === 'grid' ? 'h-80 bg-gray-200 rounded-xl animate-pulse' : 'h-48 bg-gray-200 rounded-xl animate-pulse'}></div>
                ))}
              </div>
            ) : products.length > 0 ? (
              <>
                <div className={viewMode === 'grid'
                  ? PRODUCT_GRID_CLASS
                  : 'space-y-4'
                }>
                  {products.map((product) => (
                    viewMode === 'grid' ? (
                      <ProductCard key={product.id} product={product} />
                    ) : (
                      <ProductListCard key={product.id} product={product} />
                    )
                  ))}
                </div>

                {hasMoreProducts && (
                  <div className="mt-8 flex flex-col items-center gap-3">
                    <Button
                      variant="outline"
                      size="md"
                      onClick={loadMoreProducts}
                      isLoading={loadingMoreProducts}
                      disabled={loadingMoreProducts}
                      className="min-w-48 rounded-full"
                    >
                      {t('static.products.showMore')}
                    </Button>
                    <p className="text-xs text-gray-500">{t('static.products.showMoreHint')}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <svg
                  className="w-16 h-16 mx-auto text-gray-400 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                  />
                </svg>
                <p className="text-gray-600 mb-4">{t('static.products.empty')}</p>
                <Button onClick={clearFilters} variant="primary">
                  {t('static.products.clearFilters')}
                </Button>
              </div>
            )}
          </div>
        </div>

      <ProductFiltersModal
        isOpen={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        draft={filterDraft}
        onDraftChange={(patch) => setFilterDraft((current) => ({ ...current, ...patch }))}
        onClearDraft={() => setFilterDraft({ ...EMPTY_PRODUCT_FILTER_DRAFT })}
        onApply={applyFilters}
        categories={categories}
        frameShapes={availableFrameShapes}
        frameMaterials={availableFrameMaterials}
      />
    </div>
  );
}


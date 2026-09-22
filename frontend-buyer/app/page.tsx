'use client';
import SponsoredProducts from '@/components/products/SponsoredProducts';

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
// Layout components are now handled by app/template.tsx
import { productService, type Product } from "@/services/product-service";
import { StoreService, type PublicStore } from "@/services/store-service";
import PromotionalBanners from '@/components/campaigns/PromotionalBanners';
import { getFullImageUrl, isLocalhostImage } from "@/lib/image-utils";
import { isEyeProductCategory } from "@/utils/product-utils";
import DiscountCampaignIndicator from '@/components/campaigns/DiscountCampaignIndicator';

const HOME_PRODUCTS_PER_PAGE = 20;

type HomeCategory = {
  id: number;
  name: string;
  slug: string;
};

function ProductCard({ product }: { product: Product }) {
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
      <div className="relative w-full h-32 sm:h-36 bg-gradient-to-br from-gray-50 to-gray-100 border-b border-gray-100">
        <div className="absolute inset-0 flex items-center justify-center">
          <Image
            src={displayImageUrl}
            alt={product.name}
            width={180}
            height={130}
            className="object-contain max-h-[70%] transition-all duration-300 group-hover:scale-105"
            unoptimized={isLocalhostImage(displayImageUrl)}
          />
        </div>
      </div>
      <div className="p-3 md:p-4 flex-1 flex flex-col min-h-[170px]">
        <h3 className="font-semibold text-gray-900 mb-1.5 line-clamp-2 group-hover:text-[#0066CC] transition-colors text-sm md:text-[15px] break-words">
          {product.name}
        </h3>
        <div className="flex items-center gap-1 mb-1.5">
          <div className="flex text-yellow-400 text-xs">
            {[...Array(5)].map((_, i) => (
              <svg
                key={i}
                className={`w-3.5 h-3.5 ${
                  i < Math.floor(product.rating) ? 'fill-current' : 'text-gray-300'
                }`}
                viewBox="0 0 20 20"
              >
                <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
              </svg>
            ))}
          </div>
          <span className="text-xs text-gray-500 ml-1">
            ({product.review_count})
          </span>
        </div>
        {showColorSwatches && product.variants && (
          <div className="mb-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-gray-600 font-medium">Colors:</span>
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
          <div className="text-base md:text-lg font-bold text-[#0066CC]">
            €{Number(displayPrice || 0).toFixed(2)}
          </div>
          {product.compare_at_price && Number(product.compare_at_price) > Number(displayPrice || 0) && (
            <span className="text-xs text-gray-500 line-through">
              €{Number(product.compare_at_price || 0).toFixed(2)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<PublicStore[]>([]);
  const [categories, setCategories] = useState<HomeCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMoreProducts, setLoadingMoreProducts] = useState(false);
  const [productsPage, setProductsPage] = useState(1);
  const [hasMoreProducts, setHasMoreProducts] = useState(false);
  const [loadingStores, setLoadingStores] = useState(true);
  const [isStoreSliderPaused, setIsStoreSliderPaused] = useState(false);
  const storeSliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void loadProducts();
    void loadStores();
    void loadCategories();
  }, []);

  const loadProducts = async (page = 1, append = false) => {
    try {
      if (append) {
        setLoadingMoreProducts(true);
      } else {
        setLoading(true);
      }
      const data = await productService.getAll({
        per_page: HOME_PRODUCTS_PER_PAGE,
        page,
        sort_by: 'view_count',
        sort_order: 'desc',
      });
      const nextProducts = data.data || [];
      setProducts((current) => {
        if (!append) return nextProducts;
        const knownIds = new Set(current.map((product) => product.id));
        return [...current, ...nextProducts.filter((product: Product) => !knownIds.has(product.id))];
      });
      setProductsPage(data.current_page || page);
      setHasMoreProducts((data.current_page || page) < (data.last_page || page));
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      if (append) {
        setLoadingMoreProducts(false);
      } else {
        setLoading(false);
      }
    }
  };

  const loadMoreProducts = () => {
    if (!hasMoreProducts || loadingMoreProducts) return;
    void loadProducts(productsPage + 1, true);
  };

  const moveStoreSlider = useCallback((direction: 'previous' | 'next') => {
    const slider = storeSliderRef.current;
    if (!slider) return;

    const firstCard = slider.querySelector<HTMLElement>('[data-store-card]');
    const gap = Number.parseFloat(window.getComputedStyle(slider).columnGap) || 16;
    const step = firstCard ? firstCard.offsetWidth + gap : slider.clientWidth;
    const maxScrollLeft = slider.scrollWidth - slider.clientWidth;
    const atStart = slider.scrollLeft <= 4;
    const atEnd = slider.scrollLeft >= maxScrollLeft - 4;

    const target = direction === 'next'
      ? atEnd ? 0 : Math.min(slider.scrollLeft + step, maxScrollLeft)
      : atStart ? maxScrollLeft : Math.max(slider.scrollLeft - step, 0);

    slider.scrollTo({ left: target, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const slider = storeSliderRef.current;
    if (!slider || isStoreSliderPaused || slider.scrollWidth <= slider.clientWidth) return;

    const interval = window.setInterval(() => moveStoreSlider('next'), 5000);
    return () => window.clearInterval(interval);
  }, [isStoreSliderPaused, moveStoreSlider, stores.length]);

  const loadStores = async () => {
    try {
      setLoadingStores(true);
      const data = await StoreService.getAllStores({ per_page: 6 });
      setStores(data.stores || []);
    } catch (error) {
      console.error('Failed to load stores:', error);
    } finally {
      setLoadingStores(false);
    }
  };


  const loadCategories = async () => {
    try {
      const data = await productService.getCategories(true);
      setCategories(data || []);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-5 px-3 sm:px-4 md:space-y-8 lg:px-0">

        <PromotionalBanners placement="homepage_hero" />
        <PromotionalBanners placement="homepage_featured" />

        <SponsoredProducts placement="homepage" />
        {/* Top selling products */}
        <section className="w-full pb-4 md:pb-6">
          <div className="rounded-t-2xl bg-[#0052a3] text-white px-3 py-3 sm:px-4 flex items-center justify-between gap-3">
            <h2 className="text-sm md:text-base font-semibold uppercase tracking-wide inline-flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20" aria-hidden="true">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </span>
              Top Selling Products
            </h2>
            <Link
              href="/products"
              className="text-xs md:text-sm font-semibold hover:text-blue-100 inline-flex items-center gap-1"
            >
              View All
              <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="bg-white rounded-b-2xl shadow-sm px-2.5 sm:px-3.5 py-3.5 sm:py-5">
            {loading ? (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                {[...Array(HOME_PRODUCTS_PER_PAGE)].map((_, i) => (
                  <div key={i} className="h-64 bg-gray-200 animate-pulse rounded-xl"></div>
                ))}
              </div>
            ) : products.length > 0 ? (
              <>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                  {products.map((product) => (
                    <div key={product.id} className="h-full">
                      <ProductCard product={product} />
                    </div>
                  ))}
                </div>
                {hasMoreProducts && (
                  <div className="mt-6 flex justify-center">
                    <button
                      type="button"
                      onClick={loadMoreProducts}
                      disabled={loadingMoreProducts}
                      className="inline-flex min-w-44 items-center justify-center gap-2 rounded-full border border-[#0066CC] bg-white px-5 py-2.5 text-sm font-semibold text-[#0066CC] shadow-sm transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loadingMoreProducts ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#0066CC]/30 border-t-[#0066CC]" />
                          Loading products…
                        </>
                      ) : (
                        <>
                          Show More
                          <span aria-hidden="true">↓</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <p className="text-center text-gray-600 py-8">No products available</p>
            )}
          </div>
        </section>

        {/* Categories Section */}
        <section className="w-full pb-4 md:pb-6">
          <div className="rounded-t-2xl bg-[#0066CC] text-white px-3 py-3 sm:px-4 flex items-center justify-between gap-3">
            <h2 className="text-sm md:text-base font-semibold uppercase tracking-wide inline-flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20" aria-hidden="true">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </span>
              Categories
            </h2>
            <Link
              href="/categories"
              className="text-xs md:text-sm font-semibold hover:text-blue-100 inline-flex items-center gap-1"
            >
              View All
              <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="bg-white rounded-b-2xl shadow-sm px-2.5 py-3.5 sm:px-4 sm:py-5">
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
            {categories.length > 0 ? (
              categories.map((category) => {
                // Map category names to icons
                const getCategoryIcon = (name: string) => {
                  const nameLower = name.toLowerCase();
                  if (nameLower.includes('eye') && nameLower.includes('glass')) return '👓';
                  if (nameLower.includes('sun') || nameLower.includes('sunglass')) return '🕶️';
                  if (nameLower.includes('contact') || nameLower.includes('lens')) return '🔍';
                  if (nameLower.includes('hygiene')) return '💧';
                  if (nameLower.includes('accessor')) return '🎁';
                  if (nameLower.includes('kid') || nameLower.includes('baby')) return '👶';
                  return '📦';
                };
                
                const getCategoryColor = (index: number) => {
                  const colors = [
                    "from-blue-500/15 to-blue-500/0",
                    "from-sky-500/15 to-sky-500/0",
                    "from-indigo-500/15 to-indigo-500/0",
                    "from-cyan-500/15 to-cyan-500/0",
                    "from-blue-600/15 to-blue-600/0",
                    "from-slate-500/15 to-slate-500/0",
                  ];
                  return colors[index % colors.length];
                };

                return (
                  <Link
                    key={category.id}
                    href={`/categories/${category.slug}`}
                    className="group relative min-w-0 rounded-xl border border-gray-200 bg-white p-2.5 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md sm:p-5"
                  >
                    <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${getCategoryColor(categories.indexOf(category))} opacity-0 group-hover:opacity-100 transition-opacity`} />
                    <div className="relative flex flex-col items-center">
                      <div className="mb-1.5 text-2xl sm:mb-2 sm:text-3xl">{getCategoryIcon(category.name)}</div>
                      <div className="line-clamp-2 min-h-9 font-semibold text-gray-900 text-xs leading-4 sm:min-h-0 sm:text-base">
                        {category.name}
                      </div>
                      <span className="mt-1 hidden text-[11px] uppercase tracking-[0.16em] text-gray-500 sm:inline">
                        Shop now
                      </span>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="text-center text-gray-500 py-4 w-full">Loading categories...</div>
            )}
            </div>
          </div>
        </section>

        {/* Stores / Top sellers */}
        <section className="w-full pb-8 md:pb-10">
          <div className="rounded-t-2xl bg-[#00CC66] text-white px-3 py-3 sm:px-4 flex items-center justify-between gap-3">
            <h2 className="text-sm md:text-base font-semibold uppercase tracking-wide inline-flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20" aria-hidden="true">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </span>
              Top Stores
            </h2>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => moveStoreSlider('previous')}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25 focus:outline-none focus:ring-2 focus:ring-white/70"
                aria-label="Previous stores"
                aria-controls="top-stores-slider"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="m15 18-6-6 6-6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => moveStoreSlider('next')}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25 focus:outline-none focus:ring-2 focus:ring-white/70"
                aria-label="Next stores"
                aria-controls="top-stores-slider"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="m9 18 6-6-6-6" />
                </svg>
              </button>
              <Link
                href="/stores"
                className="ml-1 text-xs font-semibold hover:text-emerald-100 sm:ml-2 sm:text-sm"
              >
                View All <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
          <div className="bg-white rounded-b-2xl shadow-sm px-2.5 py-3.5 sm:px-4 sm:py-5">
            {loadingStores ? (
              <div className="flex gap-3 overflow-hidden pb-2 sm:gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-[250px] w-[calc((100%-0.75rem)/2)] flex-none rounded-2xl bg-gray-200 animate-pulse sm:h-[290px] sm:w-[calc((100%-1rem)/2)] lg:w-[calc((100%-2rem)/3)]"></div>
                ))}
              </div>
            ) : stores.length > 0 ? (
              <div
                ref={storeSliderRef}
                id="top-stores-slider"
                aria-label="Top stores"
                className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth scrollbar-hide pb-2 sm:gap-4"
                onMouseEnter={() => setIsStoreSliderPaused(true)}
                onMouseLeave={() => setIsStoreSliderPaused(false)}
                onFocusCapture={() => setIsStoreSliderPaused(true)}
                onBlurCapture={() => setIsStoreSliderPaused(false)}
              >
                {stores.map((store) => {
                  const bannerImageUrl = getFullImageUrl(store.banner_image_url || store.banner_image);
                  const profileImageUrl = getFullImageUrl(store.profile_image_url || store.profile_image);
                  const hasBanner = Boolean(store.banner_image_url || store.banner_image);
                  const hasProfile = Boolean(store.profile_image_url || store.profile_image);

                  return (
                    <article
                      key={store.id}
                      data-store-card
                      className="w-[calc((100%-0.75rem)/2)] flex-none snap-start overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md sm:w-[calc((100%-1rem)/2)] lg:w-[calc((100%-2rem)/3)]"
                    >
                      <Link href={`/stores/${store.id}`} className="group block">
                        <div className="relative h-20 overflow-visible bg-gradient-to-br from-emerald-100 via-sky-100 to-blue-100 sm:h-32">
                          {hasBanner ? (
                            <Image
                              src={bannerImageUrl}
                              alt={`${store.name} banner`}
                              fill
                              className="object-cover transition-transform duration-300 group-hover:scale-105"
                              unoptimized={isLocalhostImage(bannerImageUrl)}
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#0066CC] to-[#00A0FF] text-4xl font-bold text-white/80">
                              {store.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="absolute bottom-0 left-3 translate-y-1/2 overflow-hidden rounded-full border-2 border-white bg-white shadow-lg sm:left-5 sm:border-4">
                            {hasProfile ? (
                              <Image
                                src={profileImageUrl}
                                alt={`${store.name} profile`}
                                width={48}
                                height={48}
                                className="h-12 w-12 object-cover sm:h-16 sm:w-16"
                                unoptimized={isLocalhostImage(profileImageUrl)}
                              />
                            ) : (
                              <div className="flex h-12 w-12 items-center justify-center bg-gradient-to-br from-[#0066CC] to-[#0052a3] text-lg font-bold text-white sm:h-16 sm:w-16 sm:text-2xl">
                                {store.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="px-3 pb-3 pt-8 sm:px-5 sm:pb-4 sm:pt-11">
                          <p className="hidden text-[11px] font-semibold uppercase tracking-[0.14em] text-[#00A85A] sm:block">Featured seller</p>
                          <h3 className="mt-1 truncate text-sm font-bold text-gray-900 transition-colors group-hover:text-[#0066CC] sm:text-lg">
                            {store.name}
                          </h3>
                          <p className="mt-1 min-h-10 line-clamp-2 text-xs leading-4 text-gray-600 sm:text-sm">
                            {store.description || 'Quality optical products and professional service.'}
                          </p>
                          <dl className="mt-3 grid grid-cols-3 divide-x divide-gray-100 rounded-lg bg-gray-50 py-1.5 text-center sm:mt-4 sm:rounded-xl sm:py-2">
                            <div className="px-1 sm:px-2">
                              <dt className="text-[8px] font-semibold uppercase tracking-wide text-gray-500 sm:text-[10px]">Products</dt>
                              <dd className="mt-0.5 text-xs font-bold text-gray-900 sm:text-sm">{store.products_count || 0}</dd>
                            </div>
                            <div className="px-1 sm:px-2">
                              <dt className="text-[8px] font-semibold uppercase tracking-wide text-gray-500 sm:text-[10px]">Followers</dt>
                              <dd className="mt-0.5 text-xs font-bold text-gray-900 sm:text-sm">{store.followers_count || 0}</dd>
                            </div>
                            <div className="px-1 sm:px-2">
                              <dt className="text-[8px] font-semibold uppercase tracking-wide text-gray-500 sm:text-[10px]">Rating</dt>
                              <dd className="mt-0.5 text-xs font-bold text-gray-900 sm:text-sm">{store.rating ? `${Number(store.rating).toFixed(1)} ★` : 'New'}</dd>
                            </div>
                          </dl>
                        </div>
                      </Link>
                      <div className="border-t border-gray-100 px-3 py-2.5 sm:px-5 sm:py-3">
                        <Link
                          href={`/stores/${store.id}`}
                          className="inline-flex w-full items-center justify-center gap-1 rounded-full bg-[#0066CC] py-2 text-xs font-semibold text-white transition-colors hover:bg-[#0052a3] sm:gap-2 sm:py-2.5 sm:text-sm"
                        >
                          Go to Shop
                          <span aria-hidden="true">→</span>
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-600">
                <p>No stores available at the moment.</p>
              </div>
            )}
          </div>
        </section>
    </div>
  );
}

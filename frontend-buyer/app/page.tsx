'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
// Layout components are now handled by app/template.tsx
import { productService, type Product } from "@/services/product-service";
import { StoreService, type PublicStore } from "@/services/store-service";
import { bannerService, type PublicBanner } from "@/services/banner-service";
import { getFullImageUrl, isLocalhostImage } from "@/lib/image-utils";
import { isEyeProductCategory } from "@/utils/product-utils";
import Loader from "@/components/ui/Loader";

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
  const [banners, setBanners] = useState<PublicBanner[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStores, setLoadingStores] = useState(true);
  const [loadingBanners, setLoadingBanners] = useState(true);

  useEffect(() => {
    loadProducts();
    loadStores();
    loadBanners();
    loadCategories();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await productService.getAll({ per_page: 8, sort_by: 'view_count', sort_order: 'desc' });
      setProducts(data.data || []);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const loadBanners = async () => {
    try {
      setLoadingBanners(true);
      const data = await bannerService.getPublicBanners({ limit: 6 });
      setBanners(data || []);
    } catch (error) {
      console.error('Failed to load banners:', error);
    } finally {
      setLoadingBanners(false);
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
    <div className="w-full max-w-7xl mx-auto space-y-6 md:space-y-8 px-1 sm:px-2 lg:px-0">

        {/* Admin-controlled Banners */}
        <section className="w-full px-1 sm:px-2 lg:px-0 pb-4 md:pb-6">
          <div className="rounded-t-2xl bg-[#0066CC] text-white px-4 py-3 flex items-center justify-between">
            <h2 className="text-sm md:text-base font-semibold uppercase tracking-wide inline-flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20" aria-hidden="true">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.518 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118L2.98 10.1c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.616-4.674z" />
                </svg>
              </span>
              Featured Banners
            </h2>
            <Link
              href="/products"
              className="text-xs md:text-sm font-semibold hover:text-blue-100 inline-flex items-center gap-1"
            >
              View All
              <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="bg-white rounded-b-2xl shadow-sm px-1.5 sm:px-3 py-4 sm:py-5">
            {loadingBanners ? (
              <div className="flex gap-3 md:gap-4 overflow-x-auto scrollbar-hide pb-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-[170px] min-w-[280px] sm:min-w-[320px] rounded-xl bg-gray-200 animate-pulse"></div>
                ))}
              </div>
            ) : banners.length > 0 ? (
              <div className="flex gap-3 md:gap-4 overflow-x-auto scrollbar-hide pb-2">
                {banners.map((banner) => {
                  const imageUrl = getFullImageUrl(banner.image_url || banner.image);
                  const content = (
                    <div className="relative h-[170px] min-w-[280px] sm:min-w-[320px] lg:min-w-[360px] rounded-xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                      <Image
                        src={imageUrl}
                        alt={banner.title || 'Promotional banner'}
                        fill
                        className="object-cover"
                        unoptimized={isLocalhostImage(imageUrl)}
                      />
                    </div>
                  );

                  return banner.link ? (
                    <Link key={banner.id} href={banner.link} className="block">
                      {content}
                    </Link>
                  ) : (
                    <div key={banner.id}>{content}</div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-gray-600 py-6">No banners available right now.</p>
            )}
          </div>
        </section>

        {/* Top selling products */}
        <section className="w-full px-1 sm:px-2 lg:px-0 pb-4 md:pb-6">
          <div className="rounded-t-2xl bg-[#0052a3] text-white px-4 py-3 flex items-center justify-between">
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
          <div className="bg-white rounded-b-2xl shadow-sm px-2 sm:px-3.5 py-4 sm:py-5">
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="h-64 bg-gray-200 animate-pulse rounded-xl"></div>
                ))}
              </div>
            ) : products.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {products.map((product) => (
                  <div key={product.id} className="h-full">
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-600 py-8">No products available</p>
            )}
          </div>
        </section>

        {/* Categories Section */}
        <section className="w-full px-1 sm:px-2 lg:px-0 pb-4 md:pb-6">
          <div className="rounded-t-2xl bg-[#0066CC] text-white px-4 py-3 flex items-center justify-between">
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
          <div className="bg-white rounded-b-2xl shadow-sm px-1.5 sm:px-3 py-4 sm:py-5">
            <div className="flex gap-3 md:gap-4 overflow-x-auto scrollbar-hide pb-2">
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
                    className="relative bg-white rounded-lg shadow-sm p-5 text-center hover:shadow-md transition-all border border-gray-200 overflow-hidden group min-w-[130px] sm:min-w-[150px]"
                  >
                    <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${getCategoryColor(categories.indexOf(category))} opacity-0 group-hover:opacity-100 transition-opacity`} />
                    <div className="relative flex flex-col items-center">
                      <div className="text-3xl mb-2">{getCategoryIcon(category.name)}</div>
                      <div className="font-semibold text-gray-900 text-sm md:text-base">
                        {category.name}
                      </div>
                      <span className="mt-1 text-[11px] uppercase tracking-[0.16em] text-gray-500">
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
        <section className="w-full px-1 sm:px-2 lg:px-0 pb-8 md:pb-10">
          <div className="rounded-t-2xl bg-[#00CC66] text-white px-4 py-3 flex items-center justify-between">
            <h2 className="text-sm md:text-base font-semibold uppercase tracking-wide inline-flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20" aria-hidden="true">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </span>
              Top Stores
            </h2>
            <Link
              href="/stores"
              className="text-xs md:text-sm font-semibold hover:text-emerald-100 inline-flex items-center gap-1"
            >
              View All
              <span aria-hidden="true">→</span>
            </Link>
        </div>
          <div className="bg-white rounded-b-2xl shadow-sm px-1.5 sm:px-3 py-4 sm:py-5">
            {loadingStores ? (
              <div className="flex gap-3 md:gap-3.5 overflow-x-auto scrollbar-hide pb-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex-shrink-0 w-[320px] sm:w-[360px] lg:w-[420px] h-[180px] bg-gray-200 rounded-2xl animate-pulse"></div>
                ))}
              </div>
            ) : stores.length > 0 ? (
              <div className="flex gap-3 md:gap-3.5 overflow-x-auto scrollbar-hide pb-2">
                {stores.map((store) => {
                  const bannerImageUrl = getFullImageUrl(store.banner_image_url || store.banner_image);
                  const profileImageUrl = getFullImageUrl(store.profile_image_url || store.profile_image);

                  return (
                    <Link
                      key={store.id}
                      href={`/stores/${store.id}`}
                      className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex-shrink-0 w-[320px] sm:w-[360px] lg:w-[420px] overflow-hidden"
                    >
                      <div className="flex h-full">
                        {/* Cover image - left side */}
                        <div className="relative w-2/5 min-w-[140px] h-full bg-gradient-to-br from-gray-100 to-gray-200">
                          {store.banner_image ? (
                            <Image
                              src={bannerImageUrl}
                              alt={store.name}
                              fill
                              className="object-cover"
                              unoptimized={isLocalhostImage(bannerImageUrl)}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                            </div>
                          )}
                        </div>
                        {/* Content - right side */}
                        <div className="relative flex-1 px-4 py-4 bg-white flex flex-col">
                          {/* Logo avatar */}
                          <div className="absolute -top-4 left-4 h-12 w-12 rounded-full border-4 border-white overflow-hidden shadow-md bg-gray-100">
                            {store.profile_image ? (
                              <Image
                                src={profileImageUrl}
                                alt={`${store.name} logo`}
                                fill
                                className="object-cover"
                                unoptimized={isLocalhostImage(profileImageUrl)}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#0066CC] to-[#0052a3] text-white font-bold text-lg">
                                {store.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="mt-6 flex-1 flex flex-col">
                            <p className="text-[11px] font-semibold text-[#00CC66] uppercase mb-1">
                              Featured Seller
                            </p>
                            <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1 line-clamp-1">
                              {store.name}
                            </h3>
                            <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                              {store.description || 'Premium optical products and services'}
                            </p>
                            {/* Stats row */}
                            <div className="flex items-center justify-between text-[11px] text-gray-600 mb-3">
                              <div className="flex flex-col">
                                <span className="font-medium">Products</span>
                                <span className="font-semibold text-gray-900">
                                  {store.products_count || 0}
                                </span>
                              </div>
                              <div className="flex flex-col">
                                <span className="font-medium">Followers</span>
                                <span className="font-semibold text-gray-900">
                                  {store.followers_count || 0}
                                </span>
                              </div>
                              <div className="flex flex-col">
                                <span className="font-medium">Rating</span>
                                <span className="font-semibold text-gray-900">
                                  {store.rating ? `${Number(store.rating).toFixed(1)}★` : 'N/A'}
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              className="mt-auto w-full inline-flex items-center justify-center rounded-full bg-[#0066CC] hover:bg-[#0052a3] text-white text-sm font-semibold py-2.5 transition-colors"
                            >
                              Go to Shop
                            </button>
                          </div>
                        </div>
                      </div>
                    </Link>
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

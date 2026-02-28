'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
// Layout components are now handled by app/template.tsx
import { StoreService, type PublicStore } from '@/services/store-service';
import { productService, type Product } from '@/services/product-service';
import { isEyeProductCategory } from '@/utils/product-utils';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { getFullImageUrl, isLocalhostImage } from '@/lib/image-utils';

function ProductCard({ product }: { product: Product }) {
  const [hoveredVariantId, setHoveredVariantId] = useState<number | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const formatProductType = (type: Product['product_type']) =>
    type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  
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
  const hasDisplayImage = displayImageUrl !== '/file.svg';
  const activeVariantId = selectedVariantId || hoveredVariantId;
  const displayPrice = activeVariantId && hasVariants && product.variants
    ? product.variants.find(v => v.id === activeVariantId)?.price ?? product.price
    : (defaultVariant?.price ?? product.price);

  return (
    <Link
      href={`/products/${product.id}`}
      className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 overflow-hidden group relative flex flex-col h-full"
    >
      <div className="relative w-full h-40 sm:h-48 bg-gradient-to-br from-gray-50 to-gray-100 border-b border-gray-100">
        <div className="absolute inset-0 flex items-center justify-center">
          {hasDisplayImage ? (
            <Image
              src={displayImageUrl}
              alt={product.name}
              width={180}
              height={180}
              className="object-contain max-h-[80%] transition-all duration-300 group-hover:scale-105"
              unoptimized={isLocalhostImage(displayImageUrl)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7zm3 8l3-3 2 2 4-4 3 3" />
              </svg>
            </div>
          )}
        </div>
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <span className="inline-flex w-fit items-center rounded-full bg-[#0066CC]/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#0066CC] mb-2">
          {formatProductType(product.product_type)}
        </span>
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-[#0066CC] transition-colors text-sm">
          {product.name}
        </h3>
        <div className="flex items-center gap-1 mb-2">
          <div className="flex text-yellow-400 text-xs">
            {[...Array(5)].map((_, i) => (
              <svg
                key={i}
                className={`w-3 h-3 ${
                  i < Math.floor(product.rating || 0) ? 'fill-current' : 'text-gray-300'
                }`}
                viewBox="0 0 20 20"
              >
                <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
              </svg>
            ))}
          </div>
          <span className="text-xs text-gray-500">({product.review_count || 0})</span>
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
          <div className="text-lg font-bold text-[#0066CC]">
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

export default function StorePage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [store, setStore] = useState<PublicStore | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMoreProducts, setHasMoreProducts] = useState(false);
  const [totalProducts, setTotalProducts] = useState(0);

  useEffect(() => {
    if (params.id) {
      loadStore();
      loadReviews();
      loadProducts(1, false);
    }
  }, [params.id]);

  const loadStore = async () => {
    try {
      setLoading(true);
      const data = await StoreService.getPublicStore(Number(params.id));
      setStore(data.store);
      // Check if user is following (if authenticated)
      if (isAuthenticated) {
        // TODO: Check follow status
      }
    } catch (error) {
      console.error('Failed to load store:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async (page = 1, append = false) => {
    try {
      setLoadingProducts(true);
      // Load products for this store using store_id filter on the backend
      const data = await productService.getAll({ 
        store_id: Number(params.id),
        per_page: 24,
        page: page,
        sort_by: 'created_at',
        sort_order: 'desc'
      });
      
      if (append) {
        setProducts(prev => [...prev, ...(data.data || [])]);
      } else {
        setProducts(data.data || []);
      }
      
      setTotalPages(data.last_page || 1);
      setTotalProducts(data.total || 0);
      setHasMoreProducts((data.current_page || 1) < (data.last_page || 1));
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    if (params.id) {
      loadProducts(1, false);
    }
  }, [params.id]);

  const loadReviews = async () => {
    try {
      const data = await StoreService.getPublicStoreReviews(Number(params.id), { per_page: 5 });
      setReviews(data.reviews || []);
    } catch (error) {
      console.error('Failed to load reviews:', error);
    }
  };

  const handleFollow = async () => {
    if (!isAuthenticated) {
      router.push('/auth/login?redirect=' + window.location.pathname);
      return;
    }
    try {
      if (isFollowing) {
        await StoreService.unfollowStore(Number(params.id));
      } else {
        await StoreService.followStore(Number(params.id));
      }
      setIsFollowing(!isFollowing);
    } catch (error) {
      console.error('Failed to toggle follow:', error);
    }
  };

  const filteredProducts = search
    ? products.filter(p => 
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description?.toLowerCase().includes(search.toLowerCase())
      )
    : products;

  const bannerImageUrl = getFullImageUrl(store?.banner_image_url || store?.banner_image);
  const profileImageUrl = getFullImageUrl(store?.profile_image_url || store?.profile_image);
  const hasBannerImage = bannerImageUrl !== '/file.svg';
  const hasProfileImage = profileImageUrl !== '/file.svg';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0066CC] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading store...</p>
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Store not found</p>
          <Button onClick={() => router.push('/stores')} variant="primary">
            Browse All Stores
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
        {/* Store Header */}
        <div className="relative">
          {/* Banner */}
          <div className="relative w-full h-48 sm:h-64 lg:h-80 bg-gradient-to-br from-[#0066CC] to-[#0052a3]">
            {hasBannerImage ? (
              <Image
                src={bannerImageUrl}
                alt={store.name}
                fill
                className="object-cover opacity-90"
                unoptimized={isLocalhostImage(bannerImageUrl)}
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
          </div>

          {/* Store Info Card */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-10">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                {/* Logo */}
                <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white overflow-hidden shadow-lg bg-white flex-shrink-0">
                  {hasProfileImage ? (
                    <Image
                      src={profileImageUrl}
                      alt={store.name}
                      fill
                      className="object-cover"
                      unoptimized={isLocalhostImage(profileImageUrl)}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#0066CC] to-[#0052a3] text-white font-bold text-3xl">
                      {store.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Store Details */}
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{store.name}</h1>
                  {store.description && (
                    <p className="text-gray-600 mb-4">{store.description}</p>
                  )}

                  {/* Stats */}
                  <div className="flex flex-wrap items-center gap-6 mb-4">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                      <span className="text-sm text-gray-600">
                        <span className="font-semibold text-gray-900">{store.products_count || 0}</span> Products
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span className="text-sm text-gray-600">
                        <span className="font-semibold text-gray-900">{store.followers_count || 0}</span> Followers
                      </span>
                    </div>
                    {store.rating && (
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span className="text-sm text-gray-600">
                          <span className="font-semibold text-gray-900">{Number(store.rating).toFixed(1)}</span> Rating
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Follow Button */}
                  {isAuthenticated && (
                    <Button
                      onClick={handleFollow}
                      variant={isFollowing ? 'outline' : 'primary'}
                      size="md"
                    >
                      {isFollowing ? 'Following' : 'Follow Store'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Products Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Products ({totalProducts > 0 ? totalProducts : products.length})
              </h2>
              <div className="w-64">
                <Input
                  type="text"
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {loadingProducts && products.length === 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="h-64 bg-gray-200 rounded-xl animate-pulse"></div>
                ))}
              </div>
            ) : filteredProducts.length > 0 ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
                {/* Load More Button */}
                {hasMoreProducts && !loadingProducts && (
                  <div className="mt-6 text-center">
                    <Button
                      onClick={() => {
                        const nextPage = currentPage + 1;
                        setCurrentPage(nextPage);
                        loadProducts(nextPage, true);
                      }}
                      variant="outline"
                      size="lg"
                    >
                      Load More Products
                    </Button>
                  </div>
                )}
                {loadingProducts && products.length > 0 && (
                  <div className="mt-6 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0066CC] mx-auto"></div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <p className="text-gray-600">No products found in this store.</p>
              </div>
            )}
          </div>

          {/* Reviews Section */}
          {reviews.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Recent Reviews</h2>
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="border-b border-gray-200 pb-4 last:border-0 last:pb-0">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0066CC] to-[#0052a3] flex items-center justify-center text-white font-bold">
                        {review.user?.name?.charAt(0) || 'U'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold text-gray-900">{review.user?.name || 'Anonymous'}</p>
                          <div className="flex text-yellow-400 text-sm">
                            {[...Array(5)].map((_, i) => (
                              <svg
                                key={i}
                                className={`w-4 h-4 ${i < review.rating ? 'fill-current' : 'text-gray-300'}`}
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                          </div>
                        </div>
                        {review.comment && (
                          <p className="text-gray-600 text-sm">{review.comment}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                          {new Date(review.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
    </div>
  );
}


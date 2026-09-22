'use client';
import PromotionalBanners from '@/components/campaigns/PromotionalBanners';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
// Layout components are now handled by app/template.tsx
import { StoreService, type PublicStore } from '@/services/store-service';
import { getAxiosErrorMessage } from '@/lib/api-client';
import { productService, type Product } from '@/services/product-service';
import { isEyeProductCategory } from '@/utils/product-utils';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { getFullImageUrl, isLocalhostImage } from '@/lib/image-utils';
import ProductCardCategoryLine from '@/components/products/ProductCardCategoryLine';
import DiscountCampaignIndicator from '@/components/campaigns/DiscountCampaignIndicator';
import StoreChatPanel from '@/components/stores/StoreChatPanel';
import ReportStoreButton from '@/components/stores/ReportStoreButton';
import ReviewForm from '@/components/reviews/ReviewForm';
import { couponService, type CouponCard } from '@/services/coupon-service';
import PublicCouponList from '@/components/coupons/PublicCouponList';

function normalizeExternalUrl(url: string): string {
  const t = url.trim();
  if (!t) return '#';
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

function socialPlatformLabel(platform: string): string {
  const p = platform.toLowerCase();
  const map: Record<string, string> = {
    facebook: 'Facebook',
    instagram: 'Instagram',
    twitter: 'Twitter',
    x: 'X',
    linkedin: 'LinkedIn',
    tiktok: 'TikTok',
    youtube: 'YouTube',
    website: 'Website',
    other: 'Link',
  };
  return map[p] ?? platform.charAt(0).toUpperCase() + platform.slice(1);
}

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
  const displayPricing = activeVariantId && hasVariants && product.variants
    ? product.variants.find(v => v.id === activeVariantId)?.pricing ?? product.pricing
    : defaultVariant?.pricing ?? product.pricing;

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
        <ProductCardCategoryLine product={product} size="compact" className="mb-1.5" />
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
        <DiscountCampaignIndicator pricing={displayPricing} compact className="mb-2" />
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
  const { isAuthenticated, user } = useAuth();
  const [store, setStore] = useState<PublicStore | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followMessage, setFollowMessage] = useState<string | null>(null);
  const [followLoading, setFollowLoading] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('fraud');
  const [reportDetails, setReportDetails] = useState('');
  const [reportFiles, setReportFiles] = useState<File[]>([]);
  const [reportSending, setReportSending] = useState(false);
  const [reportMessage, setReportMessage] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMoreProducts, setHasMoreProducts] = useState(false);
  const [totalProducts, setTotalProducts] = useState(0);
  const [publicCoupons, setPublicCoupons] = useState<CouponCard[]>([]);

  useEffect(() => {
    if (!params.id) return;
    loadStore();
    loadReviews();
    loadProducts(1, false);
  }, [params.id]);

  const loadStore = async () => {
    try {
      setLoading(true);
      const data = await StoreService.getPublicStore(Number(params.id));
      setStore(data.store);
    } catch (error) {
      console.error('Failed to load store:', error);
    } finally {
      setLoading(false);
    }
  };

  const syncFollowStatus = async () => {
    const storeId = Number(params.id);
    if (!params.id || Number.isNaN(storeId)) return;
    if (!isAuthenticated || user?.role !== 'buyer') {
      setIsFollowing(false);
      return;
    }
    try {
      const following = await StoreService.getFollowStatus(storeId);
      setIsFollowing(following);
    } catch {
      setIsFollowing(false);
    }
  };

  useEffect(() => {
    syncFollowStatus();
  }, [params.id, isAuthenticated, user?.role]);

  useEffect(() => {
    const storeId = Number(params.id);
    if (!isAuthenticated || user?.role !== 'buyer' || !Number.isFinite(storeId)) {
      setPublicCoupons([]);
      return;
    }
    couponService.getStoreCoupons(storeId).then(setPublicCoupons).catch(() => setPublicCoupons([]));
  }, [params.id, isAuthenticated, user?.role]);

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

  const loadReviews = async () => {
    try {
      const data = await StoreService.getPublicStoreReviews(Number(params.id), { per_page: 5 });
      setReviews(data.reviews || []);
    } catch (error) {
      console.error('Failed to load reviews:', error);
    }
  };

  const refreshStoreDetails = async () => {
    try {
      const data = await StoreService.getPublicStore(Number(params.id));
      setStore(data.store);
    } catch (error) {
      console.error('Failed to refresh store details:', error);
    }
  };

  const handleFollow = async () => {
    setFollowMessage(null);
    if (!isAuthenticated) {
      router.push('/auth/login?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }
    if (user?.role !== 'buyer') {
      setFollowMessage('Only buyer accounts can follow stores.');
      return;
    }
    const storeId = Number(params.id);
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await StoreService.unfollowStore(storeId);
        setIsFollowing(false);
        setStore((prev) =>
          prev
            ? {
                ...prev,
                followers_count: Math.max(0, (prev.followers_count || 0) - 1),
              }
            : prev
        );
      } else {
        await StoreService.followStore(storeId);
        setIsFollowing(true);
        setStore((prev) =>
          prev
            ? {
                ...prev,
                followers_count: (prev.followers_count || 0) + 1,
              }
            : prev
        );
      }
    } catch (error) {
      setFollowMessage(getAxiosErrorMessage(error));
    } finally {
      setFollowLoading(false);
    }
  };

  const handleReport = async () => {
    setReportMessage(null);
    if (!isAuthenticated) {
      router.push('/auth/login?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }
    if (user?.role !== 'buyer') {
      setReportMessage('Only buyer accounts can report stores.');
      return;
    }
    if (!reportReason.trim()) {
      setReportMessage('Please select a reason.');
      return;
    }
    setReportSending(true);
    try {
      await StoreService.reportStore(Number(params.id), {
        reason: reportReason,
        details: reportDetails.trim() || undefined,
        evidence: reportFiles,
      });
      setReportMessage('Report submitted. Our team will review it.');
      setReportOpen(false);
      setReportDetails('');
      setReportFiles([]);
    } catch (error) {
      setReportMessage(getAxiosErrorMessage(error));
    } finally {
      setReportSending(false);
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
                        <span className="font-semibold text-gray-900">{store.products_count ?? 0}</span> Products
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span className="text-sm text-gray-600">
                        <span className="font-semibold text-gray-900">{store.followers_count ?? 0}</span> Followers
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="text-sm text-gray-600">
                        <span className="font-semibold text-gray-900">
                          {store.rating != null ? Number(store.rating).toFixed(1) : '—'}
                        </span>{' '}
                        Rating
                        <span className="text-gray-400 ml-1">
                          ({store.reviews_count ?? reviews.length} reviews)
                        </span>
                      </span>
                    </div>
                  </div>

                  {store.phone && (
                    <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.09l-4.423-1.106a1.125 1.125 0 00-1.173.417l-.97 1.293a1.125 1.125 0 01-1.21.38 12.035 12.035 0 01-7.212-7.212 1.125 1.125 0 01.38-1.21l1.293-.97c.363-.272.53-.73.417-1.173L6.894 3.04A1.125 1.125 0 005.804 2.19H4.5A2.25 2.25 0 002.25 4.44v2.31z" />
                      </svg>
                      <a href={`tel:${store.phone}`} className="font-medium text-[#0066CC] hover:underline">
                        {store.phone}
                      </a>
                    </div>
                  )}

                  {/* Follow + messages */}
                  {followMessage && (
                    <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3 max-w-md">
                      {followMessage}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      onClick={handleFollow}
                      variant={isFollowing ? 'outline' : 'primary'}
                      size="md"
                      disabled={followLoading}
                    >
                      {followLoading
                        ? 'Please wait…'
                        : !isAuthenticated
                          ? 'Sign in to follow'
                          : isFollowing
                            ? 'Following'
                            : 'Follow Store'}
                    </Button>
                    <Button
                      onClick={() => {
                        if (!isAuthenticated) {
                          router.push('/auth/login?redirect=' + encodeURIComponent(window.location.pathname));
                          return;
                        }
                        setReportOpen((o) => !o);
                      }}
                      variant="outline"
                      size="md"
                    >
                      Report store
                    </Button>
                    <ReviewForm
                      type="store"
                      id={store.id}
                      triggerLabel="Leave Review"
                      onSaved={() => Promise.all([loadReviews(), refreshStoreDetails()]).then(() => undefined)}
                    />
                  </div>

                  {reportMessage && (
                    <p className="mt-3 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 max-w-md">
                      {reportMessage}
                    </p>
                  )}

                  {reportOpen && (
                    <div className="mt-4 max-w-md rounded-xl border border-red-100 bg-red-50/50 p-4 space-y-3">
                      <h3 className="text-sm font-semibold text-gray-900">Report this store</h3>
                      <select
                        value={reportReason}
                        onChange={(e) => setReportReason(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      >
                        <option value="fraud">Suspected fraud</option>
                        <option value="counterfeit">Counterfeit products</option>
                        <option value="scam">Scam / phishing</option>
                        <option value="inappropriate">Inappropriate content</option>
                        <option value="other">Other</option>
                      </select>
                      <textarea
                        value={reportDetails}
                        onChange={(e) => setReportDetails(e.target.value)}
                        rows={3}
                        placeholder="Describe the issue (optional)"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        multiple
                        onChange={(e) => setReportFiles(Array.from(e.target.files || []).slice(0, 5))}
                        className="block w-full text-sm text-gray-600"
                      />
                      <div className="flex gap-2">
                        <Button onClick={handleReport} disabled={reportSending} size="sm">
                          {reportSending ? 'Submitting…' : 'Submit report'}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setReportOpen(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  <StoreChatPanel storeId={store.id} storeName={store.name} />
                  <ReportStoreButton storeId={store.id} storeName={store.name} />

                  {/* Social / web links */}
                  {Array.isArray(store.social_links) && store.social_links.length > 0 && (
                    <div className="mt-5 pt-5 border-t border-gray-100">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                        Links
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {store.social_links.map((link) => (
                          <a
                            key={link.id}
                            href={normalizeExternalUrl(link.url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm font-medium text-[#0066CC] hover:bg-[#0066CC]/10 hover:border-[#0066CC]/30 transition-colors"
                          >
                            {socialPlatformLabel(link.platform)}
                            <svg className="w-3.5 h-3.5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <PromotionalBanners placement="store_page" storeId={Number(store.id)} />
          {publicCoupons.length > 0 && (
            <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
              <PublicCouponList coupons={publicCoupons} />
            </div>
          )}
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">
              Reviews
              <span className="ml-2 text-base font-normal text-gray-500">
                ({store.reviews_count ?? reviews.length}
                {store.rating != null ? ` · ${Number(store.rating).toFixed(1)}★` : ''})
              </span>
            </h2>
            {reviews.length > 0 ? (
              <div className="space-y-4 mt-4">
                {reviews.map((review) => (
                  <div key={review.id} className="border-b border-gray-200 pb-4 last:border-0 last:pb-0">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 overflow-hidden rounded-full bg-gradient-to-br from-[#0066CC] to-[#0052a3] flex items-center justify-center text-white font-bold">
                        {review.user?.profile_image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={getFullImageUrl(review.user.profile_image_url)} alt={review.user.name || 'Verified customer'} className="h-full w-full object-cover" />
                        ) : (
                          review.user?.name?.charAt(0)?.toUpperCase() || 'U'
                        )}
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
                        {review.is_verified_purchase && (
                          <p className="text-xs text-green-700 mt-2">Verified purchase</p>
                        )}
                        <p className="text-xs text-gray-500 mt-2">
                          {new Date(review.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-gray-600 text-sm">No reviews yet for this store.</p>
            )}
          </div>
        </div>
    </div>
  );
}


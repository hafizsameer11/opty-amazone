"use client";
import { useCampaignPrice } from "@/components/campaigns/useCampaignPrice";
import DiscountCampaignIndicator from '@/components/campaigns/DiscountCampaignIndicator';
import SponsoredProducts from '@/components/products/SponsoredProducts';
import AdProductView from '@/components/products/AdProductView';

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
// Layout components are now handled by app/template.tsx
import Button from "@/components/ui/Button";
import LensTypeModal from "@/components/products/LensTypeModal";
import ProductCheckoutModal from "@/components/products/ProductCheckoutModal";
import ContactLensConfiguration, { parseContactLensUnitConfig } from "@/components/products/ContactLensConfiguration";
import EyeHygieneDetails from "@/components/products/EyeHygieneDetails";
import { productService, type Product, type LensColor, type FrameSize } from "@/services/product-service";
import { cartService } from "@/services/cart-service";
import { lensDataService } from "@/services/lens-data-service";
import { shouldShowLensOptions, isEyeglassesOrSunglassesProduct, requiresLensCustomizationModal } from "@/utils/product-utils";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/components/ui/Toast";
import Loader from "@/components/ui/Loader";
import LensColorOverlay from "@/components/products/LensColorOverlay";
import { getFullImageUrl, isLocalhostImage } from "@/lib/image-utils";
import SaveProductButton from "@/components/products/SaveProductButton";
import ReviewForm from "@/components/reviews/ReviewForm";
import { reviewService, type BuyerReview } from "@/services/review-service";
import { couponService, type CouponCard } from '@/services/coupon-service';
import PublicCouponList from '@/components/coupons/PublicCouponList';

export default function ProductDetailPage() {
  const params = useParams();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { refreshCart } = useCart();
  const { showToast } = useToast();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<BuyerReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [publicCoupons, setPublicCoupons] = useState<CouponCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [lensData, setLensData] = useState<any>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [selectedLensColor, setSelectedLensColor] = useState<LensColor | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [showLensModal, setShowLensModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [selectedShipping, setSelectedShipping] = useState("standard");
  const [couponCode, setCouponCode] = useState("");
  const [clDisplayPrice, setClDisplayPrice] = useState<number | null>(null);
  const [clMainImages, setClMainImages] = useState<string[] | null>(null);
  const [clHideThumbnailGallery, setClHideThumbnailGallery] = useState(false);
  const [clSelectedPackQty, setClSelectedPackQty] = useState<number | null>(null);
  const [selectedFrameSizeId, setSelectedFrameSizeId] = useState<number | null>(null);
  const [hasPickedColor, setHasPickedColor] = useState(false);
  const { price: campaignPrice } = useCampaignPrice(product?.id, { variant_id: selectedVariantId || undefined, frame_size_id: selectedFrameSizeId || undefined, contact_lens_pack_quantity: clSelectedPackQty || undefined }, quantity, product?.product_type !== "eye_hygiene" && product?.product_type !== "contact_lens");

  const handleClDisplayPriceChange = useCallback((price: number | null) => {
    setClDisplayPrice(price);
  }, []);

  const handleClPackGalleryChange = useCallback(
    (change: { mainUrls: string[] | null; hideSidebar?: boolean }) => {
      setClMainImages(change.mainUrls);
      setClHideThumbnailGallery(Boolean(change.hideSidebar));
    },
    []
  );

  useEffect(() => {
    if (params.id) {
      loadProduct();
      loadReviews();
    }
  }, [params.id]);

  useEffect(() => {
    if (!isAuthenticated || !product?.id) {
      setPublicCoupons([]);
      return;
    }
    couponService.getProductCoupons(product.id).then(setPublicCoupons).catch(() => setPublicCoupons([]));
  }, [isAuthenticated, product?.id]);

  useEffect(() => {
    setSelectedImageIndex(0);
  }, [clMainImages, selectedVariantId]);

  useEffect(() => {
    if (!product) return;

    const defaultVariant =
      product.variants?.find((v) => v.is_default) || product.variants?.[0];

    if (product.variants && product.variants.length > 0 && defaultVariant) {
      const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      const variantParam = urlParams?.get('variant');
      const sizeParam = urlParams?.get('size');
      const parsed = variantParam ? parseInt(variantParam, 10) : NaN;
      const parsedSize = sizeParam ? parseInt(sizeParam, 10) : NaN;
      if (!Number.isNaN(parsed) && product.variants.some((v) => v.id === parsed)) {
        setSelectedVariantId(parsed);
        setHasPickedColor(true);
        const sizesForVariant = (product.frame_sizes ?? []).filter(
          (s) => s.product_variant_id === parsed
        );
        if (
          !Number.isNaN(parsedSize) &&
          sizesForVariant.some((s) => s.id === parsedSize)
        ) {
          setSelectedFrameSizeId(parsedSize);
        } else {
          setSelectedFrameSizeId(null);
        }
      } else {
        setSelectedVariantId(defaultVariant.id);
        setHasPickedColor(false);
        setSelectedFrameSizeId(null);
      }
    } else {
      setSelectedVariantId(null);
      setHasPickedColor(false);
      setSelectedFrameSizeId(null);
    }
  }, [product]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      const data = await productService.getDetails(Number(params.id));
      setProduct(data);
      setClDisplayPrice(null);
      setClMainImages(null);
      setClHideThumbnailGallery(false);
      setClSelectedPackQty(null);
      setSelectedFrameSizeId(null);
      setHasPickedColor(false);
      
      // Load lens data if it should show lens options
      if (shouldShowLensOptions(data)) {
        try {
          const [lensTypes, treatments, coatings] = await Promise.all([
            lensDataService.getLensTypes(),
            lensDataService.getLensTreatments(),
            lensDataService.getLensCoatings(),
          ]);
          setLensData({ lensTypes, treatments, coatings });
        } catch (error) {
          console.error('Failed to load lens data:', error);
        }
      }
    } catch (error) {
      console.error('Failed to load product:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadReviews = async () => {
    try {
      setReviewsLoading(true);
      const result = await reviewService.getProductReviews(Number(params.id), 10);
      setReviews(result.reviews || []);
    } catch (error) {
      console.error('Failed to load product reviews:', error);
    } finally {
      setReviewsLoading(false);
    }
  };

  const refreshProductDetails = async () => {
    try {
      const data = await productService.getDetails(Number(params.id));
      setProduct(data);
    } catch (error) {
      console.error('Failed to refresh product details:', error);
    }
  };

  if (loading) {
    return <Loader fullScreen text="Loading product..." />;
  }

  if (!product) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-600">Product not found</p>
      </div>
    );
  }

  // Check if product has variants and is an eye product category or frame/sunglasses type
  const isEyeProduct = shouldShowLensOptions(product);
  const isRetailGlasses = isEyeglassesOrSunglassesProduct(product);
  const isGlassesProduct = product.product_type === 'frame' || product.product_type === 'sunglasses';
  const hasVariants = product.variants && product.variants.length > 0;
  const showColorSwatches = isGlassesProduct && hasVariants;
  
  // Get selected variant or default variant
  const selectedVariant = selectedVariantId && hasVariants && product.variants
    ? product.variants.find(v => v.id === selectedVariantId)
    : (hasVariants && product.variants ? (product.variants.find(v => v.is_default) || product.variants[0]) : null);

  const activeVariantId = selectedVariantId ?? selectedVariant?.id ?? null;

  const availableFrameSizes = (() => {
    const all = product.frame_sizes ?? [];
    const inStockOnly = (s: FrameSize) =>
      Number(s.stock_quantity) > 0 && s.stock_status !== 'out_of_stock';
    // Sizes are always tied to a color — never show standalone sizes
    if (!hasVariants || !activeVariantId) return [];
    return all.filter((s) => s.product_variant_id === activeVariantId && inStockOnly(s));
  })();

  const availableColorVariants = (() => {
    const list = product.variants ?? [];
    if (!list.length) return list;
    const sizes = product.frame_sizes ?? [];
    return list.filter((v) => {
      const colorSizes = sizes.filter((s) => s.product_variant_id === v.id);
      if (colorSizes.length === 0) {
        return Number(v.stock_quantity) > 0 && v.stock_status !== 'out_of_stock';
      }
      return colorSizes.some(
        (s) => Number(s.stock_quantity) > 0 && s.stock_status !== 'out_of_stock'
      );
    });
  })();

  const selectedFrameSize: FrameSize | null =
    selectedFrameSizeId != null
      ? availableFrameSizes.find((s) => s.id === selectedFrameSizeId) ?? null
      : null;

  const showSizePicker =
    isGlassesProduct &&
    availableFrameSizes.length > 0 &&
    (!hasVariants || hasPickedColor);

  const formatFrameSizeLabel = (size: FrameSize) => {
    if (size.size_label?.trim()) {
      return size.size_label.trim();
    }
    return `${Number(size.lens_width)}-${Number(size.bridge_width)}-${Number(size.temple_length)}`;
  };

  const hasFrameSizeDimensions = (size: FrameSize) =>
    Number(size.lens_width) > 0 || Number(size.bridge_width) > 0 || Number(size.temple_length) > 0;

  const formatFrameSizeDimensions = (size: FrameSize) =>
    `${Number(size.lens_width)}-${Number(size.bridge_width)}-${Number(size.temple_length)} mm`;

  const needsSizeSelection = showSizePicker && !selectedFrameSize;
  
  // Determine which images to show
  const clUnitConfig =
    product.product_type === "contact_lens" ? parseContactLensUnitConfig(product) : null;
  const hasClConfiguredPacks = Boolean(clUnitConfig?.packs?.length);
  const activePackRow =
    hasClConfiguredPacks && clSelectedPackQty != null
      ? clUnitConfig?.packs.find((p) => p.quantity === clSelectedPackQty)
      : clUnitConfig?.packs?.[0];
  const variantImages =
    selectedVariant && selectedVariant.images && selectedVariant.images.length > 0
      ? selectedVariant.images
      : product.images || [];
  const sizeImage = selectedFrameSize?.image ? [selectedFrameSize.image] : null;
  const images =
    product.product_type === "contact_lens" && clMainImages?.length
      ? clMainImages
      : sizeImage?.length
      ? sizeImage
      : variantImages;
  const firstImage = images[0] || '/file.svg';
  const showThumbnailGallery = images.length > 1 && !clHideThumbnailGallery;
  
  // Determine which price to show
  const displayPrice = campaignPrice?.discounted_price ?? (
    product.product_type === "contact_lens" && hasClConfiguredPacks
      ? Number(
          activePackRow?.price ??
            clDisplayPrice ??
            clUnitConfig?.packs?.[0]?.price ??
            product.price
        )
      : selectedFrameSize?.price != null
      ? Number(selectedFrameSize.price)
      : showSizePicker && availableFrameSizes.length > 0
      ? Number(
          availableFrameSizes.find((s) => s.price != null)?.price ??
            selectedVariant?.price ??
            product.price
        )
      : selectedVariant?.price ?? product.price);
  const displayStockStatus = needsSizeSelection
    ? 'in_stock'
    : selectedFrameSize?.stock_status ?? selectedVariant?.stock_status ?? product.stock_status;
  const displayStockQuantity = needsSizeSelection
    ? 0
    : selectedFrameSize?.stock_quantity ?? selectedVariant?.stock_quantity ?? product.stock_quantity;

  const handleAddToCart = async () => {
    if (needsSizeSelection) {
      showToast('error', 'Please select a frame size');
      return;
    }

    // Check if user is authenticated before adding to cart
    if (!authLoading && !isAuthenticated) {
      // Redirect to login with return URL
      router.push(`/auth/login?redirect=${encodeURIComponent(`/products/${params.id}`)}`);
      return;
    }

    setAddingToCart(true);
    try {
      await cartService.addItem({
        product_id: product.id,
        variant_id: selectedVariantId || undefined,
        frame_size_id: selectedFrameSizeId || undefined,
        quantity: quantity,
      });
      await refreshCart(); // Refresh cart count
      showToast('success', 'Product added to cart successfully!');
    } catch (error: any) {
      // If unauthorized, redirect to login
      if (error.response?.status === 401) {
        router.push(`/auth/login?redirect=${encodeURIComponent(`/products/${params.id}`)}`);
      } else {
        showToast('error', error.response?.data?.message || 'Failed to add to cart');
      }
    } finally {
      setAddingToCart(false);
    }
  };

  const handleVariantSelect = (variantId: number) => {
    setSelectedVariantId(variantId);
    setHasPickedColor(true);
    setSelectedFrameSizeId(null);
    setSelectedImageIndex(0);
  };

  return (
    <>
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 lg:px-0 py-4 sm:py-6 md:py-8">
        {/* Breadcrumb */}
          <nav className="mb-4 flex items-center overflow-hidden text-sm text-gray-600">
            <Link href="/" className="hover:text-[#0066CC]">
              Home
            </Link>
            <span className="mx-2 shrink-0">/</span>
            <Link href="/products" className="hover:text-[#0066CC]">
              Products
            </Link>
            <span className="mx-2 shrink-0">/</span>
            <span className="truncate text-gray-900">{product.name}</span>
          </nav>


          <div className="flex flex-col gap-5 sm:gap-6 lg:flex-row lg:gap-8 mb-6 sm:mb-8">
            {/* Image Gallery - Left Side */}
            <div className="w-full lg:w-[55%] lg:sticky lg:top-4 lg:self-start">
              <div className="flex flex-col gap-3 sm:flex-row lg:gap-4">
                {/* Thumbnails - Left Side */}
                {images.length > 1 && showThumbnailGallery && (
                  <div className="order-2 flex flex-row gap-2 overflow-x-auto pb-1 scrollbar-hide sm:order-none sm:flex-col sm:overflow-visible sm:pb-0 flex-shrink-0">
                    {images.map((image, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setSelectedImageIndex(index)}
                        className={`relative h-16 w-16 flex-none rounded-lg border-2 overflow-hidden transition-all sm:h-20 sm:w-20 lg:h-24 lg:w-24 ${
                          selectedImageIndex === index
                            ? "border-[#0066CC] ring-2 ring-[#0066CC]/30 shadow-md"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <Image
                          src={getFullImageUrl(image)}
                          alt={`${product.name} view ${index + 1}`}
                          fill
                          className="object-contain p-1"
                          unoptimized={isLocalhostImage(getFullImageUrl(image))}
                        />
                      </button>
                    ))}
                  </div>
                )}
                {/* Main Image */}
                <div className="order-1 relative flex-1 aspect-square bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm sm:order-none">
                  <LensColorOverlay
                    imageUrl={images[selectedImageIndex] || firstImage}
                    alt={product.name}
                    selectedLensColor={selectedLensColor}
                    lensAreaCoordinates={(product as any).lens_area_coordinates}
                    className="object-contain p-4"
                  />
                </div>
              </div>
            </div>

            {/* Product Info - Right Side */}
            <div className="w-full lg:w-[45%] space-y-5 sm:space-y-6">
              {/* Brand & Title */}
              <div>
                {product.store && (
                  <p className="text-sm font-semibold text-[#0066CC] mb-1">
                    {product.store.name}
                  </p>
                )}
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 break-words">
                  {product.name}
                </h1>
                <div className="flex flex-wrap items-center gap-3"><SaveProductButton productId={product.id} /><Link href={`/profile?tab=referrals&product=${product.id}`} className="text-sm font-semibold text-teal-700 hover:underline">Refer &amp; Earn</Link></div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className={`w-5 h-5 ${
                          i < Math.floor(product.rating)
                            ? "text-yellow-400 fill-current"
                            : "text-gray-300"
                        }`}
                        viewBox="0 0 20 20"
                      >
                        <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                      </svg>
                    ))}
                  </div>
                  <span className="text-sm text-gray-600">
                    ({product.review_count} reviews)
                  </span>
                  <span className="text-sm text-gray-500">
                    • {product.view_count} views
                  </span>
                </div>
              </div>

              {/* Color Variants */}
              {showColorSwatches && availableColorVariants.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-gray-700">Color:</label>
                    {selectedVariantId && selectedVariant && (
                      <span className="text-xs text-[#0066CC] font-medium">
                        Selected: {selectedVariant.color_name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {availableColorVariants.map((variant) => (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => handleVariantSelect(variant.id)}
                        disabled={variant.stock_status === 'out_of_stock'}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
                          selectedVariantId === variant.id
                            ? 'border-[#0066CC] ring-2 ring-[#0066CC]/30 bg-[#0066CC]/5 shadow-sm'
                            : variant.stock_status === 'out_of_stock'
                            ? 'border-gray-200 opacity-50 cursor-not-allowed'
                            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-full border-2 ${
                            selectedVariantId === variant.id
                              ? 'border-[#0066CC] ring-1 ring-[#0066CC]/20'
                              : 'border-gray-300'
                          }`}
                          style={{
                            backgroundColor: variant.color_code || '#ccc',
                          }}
                        />
                        <span className={`text-sm font-medium ${
                          selectedVariantId === variant.id
                            ? 'text-[#0066CC]'
                            : variant.stock_status === 'out_of_stock'
                            ? 'text-gray-400'
                            : 'text-gray-700'
                        }`}>
                          {variant.color_name}
                        </span>
                        {variant.stock_status === 'out_of_stock' && (
                          <span className="text-xs text-red-500">(Out of Stock)</span>
                        )}
                        {selectedVariantId === variant.id && (
                          <svg className="w-4 h-4 text-[#0066CC]" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {showSizePicker && (
                <div className="space-y-2">
                  <label htmlFor="frame-size-select" className="block text-sm font-semibold text-gray-700">
                    Size:
                  </label>
                  <select
                    id="frame-size-select"
                    value={selectedFrameSizeId ?? ''}
                    onChange={(e) => {
                      const nextId = e.target.value ? Number(e.target.value) : null;
                      setSelectedFrameSizeId(nextId);
                      setSelectedImageIndex(0);
                      setQuantity(1);
                    }}
                    className="w-full max-w-md px-3 py-2.5 border border-gray-300 rounded-lg bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0066CC] focus:border-[#0066CC]"
                  >
                    <option value="">Select size</option>
                    {availableFrameSizes.map((size) => (
                      <option key={size.id} value={size.id}>
                        {formatFrameSizeLabel(size)}
                        {hasFrameSizeDimensions(size) ? ` (${formatFrameSizeDimensions(size)})` : ''}
                        {` — ${size.stock_quantity} available`}
                      </option>
                    ))}
                  </select>
                  {selectedFrameSize && (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600">
                      {hasFrameSizeDimensions(selectedFrameSize) && (
                        <>
                          <span>{formatFrameSizeDimensions(selectedFrameSize)}</span>
                          <span className="text-gray-300">|</span>
                        </>
                      )}
                      <span>
                        {selectedFrameSize.stock_quantity} available
                      </span>
                      {selectedFrameSize.price != null && Number.isFinite(Number(selectedFrameSize.price)) && (
                        <>
                          <span className="text-gray-300">|</span>
                          <span className="font-semibold text-[#0066CC] notranslate">
                            €{Number(selectedFrameSize.price).toFixed(2)}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Lens Color Selection */}
              {isEyeProduct && (product as any).lens_colors && (product as any).lens_colors.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-gray-700">Lens Color:</label>
                    {selectedLensColor && (
                      <span className="text-xs text-[#0066CC] font-medium">
                        Selected: {selectedLensColor.name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {(product as any).lens_colors.map((lensColor: LensColor) => (
                      <button
                        key={lensColor.id}
                        type="button"
                        onClick={() => setSelectedLensColor(lensColor)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
                          selectedLensColor?.id === lensColor.id
                            ? 'border-[#0066CC] ring-2 ring-[#0066CC]/30 bg-[#0066CC]/5 shadow-sm'
                            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-full border-2 ${
                            selectedLensColor?.id === lensColor.id
                              ? 'border-[#0066CC] ring-1 ring-[#0066CC]/20'
                              : 'border-gray-300'
                          }`}
                          style={{
                            backgroundColor: lensColor.color_code,
                          }}
                        />
                        <span className={`text-sm font-medium ${
                          selectedLensColor?.id === lensColor.id
                            ? 'text-[#0066CC]'
                            : 'text-gray-700'
                        }`}>
                          {lensColor.name}
                        </span>
                        {selectedLensColor?.id === lensColor.id && (
                          <svg className="w-4 h-4 text-[#0066CC]" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {campaignPrice?.campaign_name && <p className="text-sm text-green-700">{campaignPrice.campaign_name} · Save €{campaignPrice.discount_amount.toFixed(2)} per unit</p>}
              <DiscountCampaignIndicator pricing={campaignPrice ?? product.pricing} className="mt-3 mb-2" />
              {/* Price */}
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-3xl font-bold text-[#0066CC] notranslate">
                  €{Number(displayPrice || 0).toFixed(2)}
                </span>
                {product.compare_at_price &&
                  Number(product.compare_at_price) > Number(displayPrice || 0) &&
                  !(product.product_type === "contact_lens" && hasClConfiguredPacks) && (
                  <>
                    <span className="text-xl text-gray-400 line-through">
                      €{Number(product.compare_at_price || 0).toFixed(2)}
                    </span>
                    <span className="text-sm font-semibold text-green-600">
                      {Math.round(
                        ((Number(product.compare_at_price || 0) - Number(displayPrice || 0)) /
                          Number(product.compare_at_price || 1)) *
                          100
                      )}% OFF
                    </span>
                  </>
                )}
              </div>

              {/* Stock Status */}
              <div className="flex flex-wrap items-center gap-2">
                {needsSizeSelection ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                    Select a size to see stock
                  </span>
                ) : displayStockStatus === "in_stock" ? (
                  <>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                      ✓ In Stock
                    </span>
                    <span className="text-sm text-gray-600">
                      {displayStockQuantity} available
                    </span>
                  </>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                    Out of Stock
                  </span>
                )}
              </div>

              {/* Short Description */}
              {product.short_description && (
                <p className="text-gray-700">{product.short_description}</p>
              )}

              {/* Quantity and Total Price - Only show for non-contact lens and non-eye hygiene products */}
              {product.product_type !== 'contact_lens' && product.product_type !== 'eye_hygiene' && (
                <>
                  {/* Quantity */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Quantity
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="w-10 h-10 rounded-lg border-2 border-gray-200 hover:border-gray-300 flex items-center justify-center font-semibold"
                      >
                        −
                      </button>
                      <span className="text-lg font-semibold w-12 text-center">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setQuantity(
                            Math.min(displayStockQuantity, quantity + 1)
                          )
                        }
                        className="w-10 h-10 rounded-lg border-2 border-gray-200 hover:border-gray-300 flex items-center justify-center font-semibold"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Total Price */}
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Subtotal:</span>
                      <span className="text-lg font-bold text-[#0066CC]">
                        €{(Number(displayPrice || 0) * quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </>
              )}

              {/* Product Type Specific Configuration */}
              {product.product_type === 'contact_lens' ? (
                <ContactLensConfiguration
                  product={product}
                  onDisplayPriceChange={handleClDisplayPriceChange}
                  onSelectedPackQuantityChange={setClSelectedPackQty}
                  onPackGalleryChange={handleClPackGalleryChange}
                  onAddToCart={async (config) => {
                    if (!authLoading && !isAuthenticated) {
                      router.push(`/auth/login?redirect=${encodeURIComponent(`/products/${params.id}`)}`);
                      return;
                    }
                    setAddingToCart(true);
                    try {
                      await cartService.addItem(config);
                      await refreshCart();
                      showToast('success', 'Contact lenses added to cart successfully!');
                    } catch (error: any) {
                      if (error.response?.status === 401) {
                        router.push(`/auth/login?redirect=${encodeURIComponent(`/products/${params.id}`)}`);
                      } else {
                        showToast('error', error.response?.data?.message || 'Failed to add to cart');
                      }
                    } finally {
                      setAddingToCart(false);
                    }
                  }}
                  addingToCart={addingToCart}
                />
              ) : product.product_type === 'eye_hygiene' ? (
                <EyeHygieneDetails
                  product={product}
                  onAddToCart={async (config) => {
                    if (!authLoading && !isAuthenticated) {
                      router.push(`/auth/login?redirect=${encodeURIComponent(`/products/${params.id}`)}`);
                      return;
                    }
                    setAddingToCart(true);
                    try {
                      await cartService.addItem(config);
                      await refreshCart();
                      showToast('success', 'Product added to cart successfully!');
                    } catch (error: any) {
                      if (error.response?.status === 401) {
                        router.push(`/auth/login?redirect=${encodeURIComponent(`/products/${params.id}`)}`);
                      } else {
                        showToast('error', error.response?.data?.message || 'Failed to add to cart');
                      }
                    } finally {
                      setAddingToCart(false);
                    }
                  }}
                  addingToCart={addingToCart}
                />
              ) : requiresLensCustomizationModal(product) ? (
                <div className="space-y-3">
                  <Button
                    onClick={() => setShowCheckoutModal(true)}
                    disabled={needsSizeSelection || displayStockStatus !== "in_stock"}
                    className="w-full"
                    size="lg"
                  >
                    {needsSizeSelection
                      ? 'Select a size'
                      : displayStockStatus !== "in_stock"
                      ? 'Out of Stock'
                      : 'Customize & Add to Cart'}
                  </Button>
                  <Button
                    onClick={() => setShowCheckoutModal(true)}
                    variant="outline"
                    className="w-full"
                    size="lg"
                    disabled={needsSizeSelection || displayStockStatus !== "in_stock"}
                  >
                    {needsSizeSelection
                      ? 'Select a size'
                      : displayStockStatus !== "in_stock"
                      ? 'Out of Stock'
                      : 'Buy Now'}
                  </Button>
                </div>
              ) : isRetailGlasses ? (
                <div className="space-y-3">
                  <Button
                    onClick={handleAddToCart}
                    disabled={needsSizeSelection || displayStockStatus !== "in_stock" || addingToCart}
                    className="w-full"
                    size="lg"
                  >
                    {addingToCart ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Adding to Cart...
                      </span>
                    ) : needsSizeSelection ? (
                      'Select a size'
                    ) : displayStockStatus !== "in_stock" ? (
                      'Out of Stock'
                    ) : (
                      'Add to Cart'
                    )}
                  </Button>
                  <Button
                    onClick={async () => {
                      if (needsSizeSelection) {
                        showToast('error', 'Please select a frame size');
                        return;
                      }
                      if (!authLoading && !isAuthenticated) {
                        router.push(`/auth/login?redirect=${encodeURIComponent(`/products/${params.id}`)}`);
                        return;
                      }
                      setAddingToCart(true);
                      try {
                        await cartService.addItem({
                          product_id: product.id,
                          variant_id: selectedVariantId || undefined,
                          frame_size_id: selectedFrameSizeId || undefined,
                          quantity: quantity,
                        });
                        await refreshCart();
                        showToast('success', 'Product added! Redirecting to checkout...');
                        setTimeout(() => router.push('/checkout'), 500);
                      } catch (error: any) {
                        if (error.response?.status === 401) {
                          router.push(`/auth/login?redirect=${encodeURIComponent(`/products/${params.id}`)}`);
                        } else {
                          showToast('error', error.response?.data?.message || 'Failed to add to cart');
                        }
                        setAddingToCart(false);
                      }
                    }}
                    variant="outline"
                    className="w-full"
                    size="lg"
                    disabled={needsSizeSelection || displayStockStatus !== "in_stock" || addingToCart}
                  >
                    {needsSizeSelection ? (
                      'Select a size'
                    ) : displayStockStatus !== "in_stock" ? (
                      'Out of Stock'
                    ) : addingToCart ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-[#0066CC] border-t-transparent rounded-full animate-spin"></div>
                        Processing...
                      </span>
                    ) : (
                      'Buy Now'
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Button
                    onClick={handleAddToCart}
                    disabled={displayStockStatus !== "in_stock" || addingToCart}
                    className="w-full"
                    size="lg"
                  >
                    {addingToCart ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Adding to Cart...
                      </span>
                    ) : displayStockStatus !== "in_stock" ? (
                      'Out of Stock'
                    ) : (
                      'Add to Cart'
                    )}
                  </Button>
                  <Button
                    onClick={async () => {
                      if (!authLoading && !isAuthenticated) {
                        router.push(`/auth/login?redirect=${encodeURIComponent(`/products/${params.id}`)}`);
                        return;
                      }
                      setAddingToCart(true);
                      try {
                        await cartService.addItem({
                          product_id: product.id,
                          variant_id: selectedVariantId || undefined,
                          frame_size_id: selectedFrameSizeId || undefined,
                          quantity: quantity,
                        });
                        await refreshCart();
                        showToast('success', 'Product added! Redirecting to checkout...');
                        setTimeout(() => router.push('/checkout'), 500);
                      } catch (error: any) {
                        if (error.response?.status === 401) {
                          router.push(`/auth/login?redirect=${encodeURIComponent(`/products/${params.id}`)}`);
                        } else {
                          showToast('error', error.response?.data?.message || 'Failed to add to cart');
                        }
                        setAddingToCart(false);
                      }
                    }}
                    variant="outline"
                    className="w-full"
                    size="lg"
                    disabled={displayStockStatus !== "in_stock" || addingToCart}
                  >
                    {displayStockStatus !== "in_stock" ? (
                      'Out of Stock'
                    ) : addingToCart ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-[#0066CC] border-t-transparent rounded-full animate-spin"></div>
                        Processing...
                      </span>
                    ) : (
                      'Buy Now'
                    )}
                  </Button>
                </div>
              )}

              {/* Seller Info */}
              <PublicCouponList coupons={publicCoupons} />

              {product.store && (
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-gray-600">Sold by</p>
                      <Link
                        href={`/stores/${product.store.id}`}
                        className="font-semibold text-[#0066CC] hover:underline"
                      >
                        {product.store.name}
                      </Link>
                    </div>
                    <Link
                      href={`/stores/${product.store.id}`}
                      className="shrink-0 text-sm text-[#0066CC] hover:underline font-medium"
                    >
                      View Store →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Product Description & Specifications */}
          <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3 mb-6 sm:mb-8">
            <div className="lg:col-span-2">
              {product.description && (
                <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    Product Description
                  </h2>
                  <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-line">
                    {product.description}
                  </div>
                </div>
              )}

              {/* Specifications */}
              <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 mt-4 sm:mt-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Specifications
                </h2>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-semibold text-gray-500 uppercase">
                      Product Type
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 capitalize">
                      {product.product_type.replace('_', ' ')}
                    </dd>
                  </div>
                  {product.frame_shape && (
                    <div>
                      <dt className="text-sm font-semibold text-gray-500 uppercase">
                        Frame Shape
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900 capitalize">
                        {product.frame_shape}
                      </dd>
                    </div>
                  )}
                  {product.frame_material && (
                    <div>
                      <dt className="text-sm font-semibold text-gray-500 uppercase">
                        Frame Material
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900 capitalize">
                        {product.frame_material}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-sm font-semibold text-gray-500 uppercase">
                      Gender
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 capitalize">
                      {product.gender}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-semibold text-gray-500 uppercase">
                      SKU
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {product.sku}
                    </dd>
                  </div>
                  
                  {/* Contact Lens Specific Fields */}
                  {product.product_type === 'contact_lens' && (
                    <>
                      {product.contact_lens_brand && (
                        <div>
                          <dt className="text-sm font-semibold text-gray-500 uppercase">
                            Brand
                          </dt>
                          <dd className="mt-1 text-sm text-gray-900">
                            {product.contact_lens_brand}
                          </dd>
                        </div>
                      )}
                      {product.contact_lens_type && (
                        <div>
                          <dt className="text-sm font-semibold text-gray-500 uppercase">
                            Lens Type
                          </dt>
                          <dd className="mt-1 text-sm text-gray-900 capitalize">
                            {product.contact_lens_type}
                          </dd>
                        </div>
                      )}
                      {product.contact_lens_material && (
                        <div>
                          <dt className="text-sm font-semibold text-gray-500 uppercase">
                            Material
                          </dt>
                          <dd className="mt-1 text-sm text-gray-900">
                            {product.contact_lens_material}
                          </dd>
                        </div>
                      )}
                      {product.replacement_frequency && (
                        <div>
                          <dt className="text-sm font-semibold text-gray-500 uppercase">
                            Replacement Frequency
                          </dt>
                          <dd className="mt-1 text-sm text-gray-900 capitalize">
                            {product.replacement_frequency}
                          </dd>
                        </div>
                      )}
                      {product.has_uv_filter && (
                        <div>
                          <dt className="text-sm font-semibold text-gray-500 uppercase">
                            UV Protection
                          </dt>
                          <dd className="mt-1 text-sm text-green-600 font-medium">
                            Yes
                          </dd>
                        </div>
                      )}
                      {product.water_content && (
                        <div>
                          <dt className="text-sm font-semibold text-gray-500 uppercase">
                            Water Content
                          </dt>
                          <dd className="mt-1 text-sm text-gray-900">
                            {product.water_content}%
                          </dd>
                        </div>
                      )}
                    </>
                  )}

                  {/* Eye Hygiene Specific Fields */}
                  {product.product_type === 'eye_hygiene' && (
                    <>
                      {product.size_volume && (
                        <div>
                          <dt className="text-sm font-semibold text-gray-500 uppercase">
                            Size/Volume
                          </dt>
                          <dd className="mt-1 text-sm text-gray-900">
                            {product.size_volume}
                          </dd>
                        </div>
                      )}
                      {product.pack_type && (
                        <div>
                          <dt className="text-sm font-semibold text-gray-500 uppercase">
                            Pack Type
                          </dt>
                          <dd className="mt-1 text-sm text-gray-900 capitalize">
                            {product.pack_type}
                          </dd>
                        </div>
                      )}
                      {product.expiry_date && (
                        <div>
                          <dt className="text-sm font-semibold text-gray-500 uppercase">
                            Expiry Date
                          </dt>
                          <dd className="mt-1 text-sm text-gray-900">
                            {new Date(product.expiry_date).toLocaleDateString()}
                          </dd>
                        </div>
                      )}
                    </>
                  )}
                </dl>
              </div>
            </div>

            {/* Reviews Section */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h2 className="text-xl font-bold text-gray-900">Customer Reviews</h2>
                <ReviewForm
                  type="product"
                  id={product.id}
                  triggerLabel="Review this product"
                  onSaved={() => Promise.all([loadReviews(), refreshProductDetails()]).then(() => undefined)}
                />
              </div>
              <div className="space-y-4">
                <div className="text-center py-4">
                  <div className="text-4xl font-bold text-gray-900 mb-1">
                    {Number(product.rating || 0).toFixed(1)}
                  </div>
                  <div className="flex items-center justify-center gap-1 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className={`w-5 h-5 ${
                          i < Math.floor(product.rating)
                            ? "text-yellow-400 fill-current"
                            : "text-gray-300"
                        }`}
                        viewBox="0 0 20 20"
                      >
                        <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                      </svg>
                    ))}
                  </div>
                <p className="text-sm text-gray-600">
                    Based on {reviews.length || product.review_count} verified purchase reviews
                  </p>
                </div>
                {reviewsLoading ? (
                  <p className="text-sm text-gray-500">Loading reviews…</p>
                ) : reviews.length > 0 ? (
                  <div className="space-y-4 border-t border-gray-100 pt-4">
                    {reviews.map((review) => (
                      <div key={review.id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-[#0066CC] to-[#0052a3] flex items-center justify-center text-sm font-bold text-white">
                              {review.user?.profile_image_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={getFullImageUrl(review.user.profile_image_url)} alt={review.user.name || 'Verified customer'} className="h-full w-full object-cover" />
                              ) : (
                                review.user?.name?.charAt(0)?.toUpperCase() || 'V'
                              )}
                            </div>
                            <div className="min-w-0">
                            <p className="font-semibold text-gray-900">{review.user?.name || 'Verified customer'}</p>
                            <p className="text-xs text-green-700 mt-1">Verified purchase</p>
                            </div>
                          </div>
                          <div className="text-yellow-500" aria-label={`${review.rating} out of 5 stars`}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</div>
                        </div>
                        {review.comment && <p className="mt-2 text-sm text-gray-600">{review.comment}</p>}
                        {review.image_url && (
                          <a href={getFullImageUrl(review.image_url)} target="_blank" rel="noopener noreferrer" className="mt-3 block w-fit">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={getFullImageUrl(review.image_url)}
                              alt={`Photo shared in review by ${review.user?.name || 'customer'}`}
                              className="h-28 w-28 rounded-lg border border-gray-200 object-cover"
                            />
                          </a>
                        )}
                        <p className="mt-2 text-xs text-gray-400">{new Date(review.created_at).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 border-t border-gray-100 pt-4">No verified purchase reviews yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      <AdProductView productId={product.id} />
      {product.category?.id && <div className="max-w-7xl mx-auto px-3 sm:px-4"><SponsoredProducts placement="recommendations" categoryId={Number(product.category.id)} excludeProductId={product.id} /></div>}
      {/* Product Checkout Modal */}
      {showCheckoutModal && product && (
        <ProductCheckoutModal
        product={product}
        isOpen={showCheckoutModal}
        onClose={() => setShowCheckoutModal(false)}
        initialSelectedVariantId={selectedVariantId}
        initialSelectedLensColor={selectedLensColor}
        onAddToCart={async (data) => {
          // Check if user is authenticated
          if (!authLoading && !isAuthenticated) {
            router.push(`/auth/login?redirect=${encodeURIComponent(`/products/${params.id}`)}`);
            return;
          }
          try {
            await cartService.addItem(data);
            await refreshCart();
            showToast('success', 'Product added to cart successfully!');
            setShowCheckoutModal(false);
          } catch (error: any) {
            if (error.response?.status === 401) {
              router.push(`/auth/login?redirect=${encodeURIComponent(`/products/${params.id}`)}`);
            } else {
              showToast('error', error.response?.data?.message || 'Failed to add to cart');
              throw error;
            }
          }
        }}
        />
      )}
    </>
  );
}

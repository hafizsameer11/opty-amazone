'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { productService, type Product } from '@/services/product-service';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

interface ProductDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: number;
}

export default function ProductDetailsModal({
  isOpen,
  onClose,
  productId,
}: ProductDetailsModalProps) {
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [error, setError] = useState('');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && productId) {
      loadProduct();
    }
  }, [isOpen, productId]);

  const loadProduct = async () => {
    try {
      setLoadingProduct(true);
      setError('');
      setSelectedImageIndex(0);
      setSelectedVariantId(null);
      const data = await productService.getDetails(productId);
      setProduct(data);
      // Set default variant if available
      if (data.variants && data.variants.length > 0) {
        const defaultVariant = data.variants.find(v => v.is_default) || data.variants[0];
        setSelectedVariantId(defaultVariant.id);
      }
    } catch (error) {
      console.error('Failed to load product:', error);
      setError('Failed to load product details');
    } finally {
      setLoadingProduct(false);
    }
  };

  const handleViewFullPage = () => {
    onClose();
    router.push(`/products/${productId}`);
  };

  // Check if product has variants and is an eye product category
  const isEyeProduct = product?.category?.id && [23, 28, 29].includes(product.category.id);
  const hasVariants = product?.variants && product.variants.length > 0;
  const showColorSwatches = isEyeProduct && hasVariants;
  
  // Get selected variant or default variant
  const selectedVariant = selectedVariantId && hasVariants
    ? product.variants.find(v => v.id === selectedVariantId)
    : (hasVariants ? (product.variants.find(v => v.is_default) || product.variants[0]) : null);
  
  // Determine which images to show
  const images = selectedVariant && selectedVariant.images && selectedVariant.images.length > 0
    ? selectedVariant.images
    : (product?.images || []);
  const firstImage = images[0] || '/file.svg';
  
  // Determine which price to show
  const displayPrice = selectedVariant?.price ?? product?.price ?? 0;
  const displayStockStatus = selectedVariant?.stock_status ?? product?.stock_status;
  const displayStockQuantity = selectedVariant?.stock_quantity ?? product?.stock_quantity;

  const handleVariantSelect = (variantId: number) => {
    setSelectedVariantId(variantId);
    setSelectedImageIndex(0); // Reset to first image when variant changes
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={product ? product.name : 'Product Details'}
      size="xl"
    >
      {loadingProduct ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0066CC] mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading product details...</p>
          </div>
        </div>
      ) : error ? (
        <div className="py-12 text-center">
          <p className="text-red-600">{error}</p>
        </div>
      ) : !product ? (
        <div className="py-12 text-center">
          <p className="text-gray-600">Product not found</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Product Images and Basic Info - Side by Side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Image Gallery */}
            <div className="space-y-4">
              <div className="relative aspect-square bg-white rounded-xl border-2 border-gray-200 overflow-hidden shadow-sm">
                <Image
                  src={images[selectedImageIndex] || firstImage}
                  alt={product.name}
                  fill
                  className="object-contain p-4"
                  priority
                />
              </div>
              {images.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {images.map((image, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setSelectedImageIndex(index)}
                      className={`relative aspect-square rounded-lg border-2 overflow-hidden transition-all ${
                        selectedImageIndex === index
                          ? 'border-[#0066CC] ring-2 ring-[#0066CC]/30 shadow-md'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Image
                        src={image}
                        alt={`${product.name} view ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Basic Info */}
            <div className="space-y-4">
              {/* Store/Brand */}
              {product.store && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Sold by</p>
                  <Link
                    href={`/stores/${product.store.id}`}
                    className="text-base font-semibold text-[#0066CC] hover:text-[#0052A3] transition-colors"
                  >
                    {product.store.name}
                  </Link>
                </div>
              )}

              {/* Title */}
              <h3 className="text-2xl font-bold text-gray-900">{product.name}</h3>

              {/* Rating */}
              <div className="flex items-center gap-3">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className={`w-5 h-5 ${
                        i < Math.floor(Number(product.rating || 0))
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      }`}
                      viewBox="0 0 20 20"
                    >
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                  ))}
                </div>
                <span className="text-sm text-gray-600">
                  {Number(product.rating || 0).toFixed(1)} ({product.review_count || 0} reviews)
                </span>
              </div>

              {/* Color Variants */}
              {showColorSwatches && product.variants && (
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Color:</label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {product.variants.map((variant) => (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => handleVariantSelect(variant.id)}
                        disabled={variant.stock_status === 'out_of_stock'}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
                          selectedVariantId === variant.id
                            ? 'border-[#0066CC] ring-2 ring-[#0066CC]/30 bg-[#0066CC]/5'
                            : variant.stock_status === 'out_of_stock'
                            ? 'border-gray-200 opacity-50 cursor-not-allowed'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <div
                          className="w-6 h-6 rounded-full border border-gray-300"
                          style={{
                            backgroundColor: variant.color_code || '#ccc',
                          }}
                        />
                        <span className={`text-sm ${
                          variant.stock_status === 'out_of_stock' ? 'text-gray-400' : 'text-gray-700'
                        }`}>
                          {variant.color_name}
                        </span>
                        {variant.stock_status === 'out_of_stock' && (
                          <span className="text-xs text-red-500">(Out of Stock)</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Price */}
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-[#0066CC]">
                  €{Number(displayPrice || 0).toFixed(2)}
                </span>
                {product.compare_at_price && Number(product.compare_at_price) > Number(displayPrice || 0) && (
                  <>
                    <span className="text-xl text-gray-400 line-through">
                      €{Number(product.compare_at_price || 0).toFixed(2)}
                    </span>
                    <Badge variant="success" size="sm">
                      {Math.round(
                        ((Number(product.compare_at_price || 0) - Number(displayPrice || 0)) /
                          Number(product.compare_at_price || 1)) *
                          100
                      )}% OFF
                    </Badge>
                  </>
                )}
              </div>

              {/* Stock Status */}
              <div className="flex items-center gap-2">
                {displayStockStatus === 'in_stock' ? (
                  <>
                    <Badge variant="success" size="sm">In Stock</Badge>
                    <span className="text-sm text-gray-600">
                      {displayStockQuantity} available
                    </span>
                  </>
                ) : (
                  <Badge variant="error" size="sm">Out of Stock</Badge>
                )}
              </div>

              {/* Short Description */}
              {product.short_description && (
                <p className="text-gray-700 leading-relaxed">{product.short_description}</p>
              )}

              {/* Quick Actions */}
              <div className="flex gap-3 pt-2">
                <Button onClick={handleViewFullPage} className="flex-1">
                  View Full Page
                </Button>
                <Link 
                  href={`/products/${product.id}${selectedVariantId ? `?variant=${selectedVariantId}` : ''}`} 
                  className="flex-1"
                >
                  <Button 
                    variant="outline" 
                    className="w-full"
                    disabled={displayStockStatus !== 'in_stock'}
                  >
                    {displayStockStatus !== 'in_stock' ? 'Out of Stock' : 'Add to Cart'}
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200"></div>

          {/* Product Description */}
          {product.description && (
            <div>
              <h4 className="text-lg font-bold text-gray-900 mb-3">Description</h4>
              <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-line leading-relaxed">
                {product.description}
              </div>
            </div>
          )}

          {/* Specifications */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5">
            <h4 className="text-lg font-bold text-gray-900 mb-4">Specifications</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Product Type</p>
                <p className="text-sm font-semibold text-gray-900 capitalize">
                  {product.product_type.replace('_', ' ')}
                </p>
              </div>
              {product.frame_shape && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Frame Shape</p>
                  <p className="text-sm font-semibold text-gray-900 capitalize">
                    {product.frame_shape}
                  </p>
                </div>
              )}
              {product.frame_material && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Frame Material</p>
                  <p className="text-sm font-semibold text-gray-900 capitalize">
                    {product.frame_material}
                  </p>
                </div>
              )}
              {product.frame_color && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Frame Color</p>
                  <p className="text-sm font-semibold text-gray-900 capitalize">
                    {product.frame_color}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Gender</p>
                <p className="text-sm font-semibold text-gray-900 capitalize">{product.gender}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">SKU</p>
                <p className="text-sm font-semibold text-gray-900 font-mono">{product.sku}</p>
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-3 gap-4 pt-2">
            <div className="text-center p-4 bg-white rounded-lg border border-gray-200">
              <p className="text-2xl font-bold text-[#0066CC]">{Number(product.rating || 0).toFixed(1)}</p>
              <p className="text-xs text-gray-600 mt-1">Rating</p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg border border-gray-200">
              <p className="text-2xl font-bold text-[#0066CC]">{product.review_count}</p>
              <p className="text-xs text-gray-600 mt-1">Reviews</p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg border border-gray-200">
              <p className="text-2xl font-bold text-[#0066CC]">{product.view_count}</p>
              <p className="text-xs text-gray-600 mt-1">Views</p>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}


'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Product } from '@/services/product-service';
import { isEyeProductCategory } from '@/utils/product-utils';
import { getFullImageUrl, isLocalhostImage } from '@/lib/image-utils';

interface ProductListCardProps {
  product: Product;
}

export default function ProductListCard({ product }: ProductListCardProps) {
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
  
  // Determine which image to show
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
  const activeVariantId = selectedVariantId || hoveredVariantId;
  const displayPrice = activeVariantId && hasVariants && product.variants
    ? product.variants.find(v => v.id === activeVariantId)?.price ?? product.price
    : (defaultVariant?.price ?? product.price);

  return (
    <Link
      href={`/products/${product.id}`}
      className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 overflow-hidden group flex flex-row h-full"
    >
      {/* Image */}
      <div className="relative w-48 sm:w-64 h-48 sm:h-56 bg-gradient-to-br from-gray-50 to-gray-100 border-r border-gray-100 flex-shrink-0">
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <Image
            src={getFullImageUrl(displayImage)}
            alt={product.name}
            width={200}
            height={200}
            className="object-contain max-h-full max-w-full transition-all duration-300 group-hover:scale-105"
            unoptimized={isLocalhostImage(getFullImageUrl(displayImage))}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 sm:p-6 flex flex-col">
        <div className="flex-1">
          <h3 className="font-semibold text-lg sm:text-xl text-gray-900 mb-2 group-hover:text-[#0066CC] transition-colors">
            {product.name}
          </h3>
          
          {/* Rating */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex text-yellow-400 text-sm">
              {[...Array(5)].map((_, i) => (
                <svg
                  key={i}
                  className={`w-4 h-4 ${
                    i < Math.floor(product.rating || 0) ? 'fill-current' : 'text-gray-300'
                  }`}
                  viewBox="0 0 20 20"
                >
                  <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                </svg>
              ))}
            </div>
            <span className="text-sm text-gray-500">
              ({product.review_count || 0} reviews)
            </span>
            {product.store && (
              <span className="text-sm text-gray-500">• by {product.store.name}</span>
            )}
          </div>

          {/* Short Description */}
          {product.short_description && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
              {product.short_description}
            </p>
          )}

          {/* Color Variants */}
          {showColorSwatches && product.variants && (
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-2">
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

          {/* Specifications */}
          <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
            {product.product_type && (
              <span className="capitalize">{product.product_type.replace('_', ' ')}</span>
            )}
            {product.frame_shape && (
              <span>Shape: {product.frame_shape}</span>
            )}
            {product.frame_material && (
              <span>Material: {product.frame_material}</span>
            )}
            {product.gender && (
              <span className="capitalize">{product.gender}</span>
            )}
          </div>
        </div>

        {/* Price and Stock */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-200">
          <div>
            <div className="text-2xl font-bold text-[#0066CC]">
              €{Number(displayPrice || 0).toFixed(2)}
            </div>
            {product.compare_at_price && Number(product.compare_at_price) > Number(displayPrice || 0) && (
              <span className="text-sm text-gray-500 line-through">
                €{Number(product.compare_at_price || 0).toFixed(2)}
              </span>
            )}
          </div>
          <div className="text-right">
            {product.stock_status === 'in_stock' ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                ✓ In Stock
              </span>
            ) : product.stock_status === 'out_of_stock' ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                Out of Stock
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
                Backorder
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

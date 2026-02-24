'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
// Layout components are now handled by app/template.tsx
import { productService, type Product, type ProductListParams } from '@/services/product-service';
import { isEyeProductCategory } from '@/utils/product-utils';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Loader from '@/components/ui/Loader';

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
  const activeVariantId = selectedVariantId || hoveredVariantId;
  const displayPrice = activeVariantId && hasVariants && product.variants
    ? product.variants.find(v => v.id === activeVariantId)?.price ?? product.price
    : (defaultVariant?.price ?? product.price);

  return (
    <Link
      href={`/products/${product.id}`}
      className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 overflow-hidden group relative flex flex-col h-full"
    >
      <div className="relative w-full h-48 sm:h-56 bg-gradient-to-br from-gray-50 to-gray-100 border-b border-gray-100">
        <div className="absolute inset-0 flex items-center justify-center">
          <Image
            src={displayImage}
            alt={product.name}
            width={200}
            height={200}
            className="object-contain max-h-[80%] transition-all duration-300 group-hover:scale-105"
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

export default function CategoryPage() {
  const params = useParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [category, setCategory] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  
  // Filters
  const [search, setSearch] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    if (params.slug) {
      // Get search from URL params
      const urlParams = new URLSearchParams(window.location.search);
      const searchParam = urlParams.get('search');
      if (searchParam) {
        setSearch(searchParam);
      }
      loadCategoryProducts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.slug, currentPage, minPrice, maxPrice, sortBy, sortOrder, search]);

  const loadCategoryProducts = async () => {
    try {
      setLoading(true);
      const params_obj: ProductListParams = {
        per_page: 24,
        page: currentPage,
        sort_by: sortBy,
        sort_order: sortOrder,
      };

      if (search) params_obj.search = search;
      if (minPrice) params_obj.min_price = parseFloat(minPrice);
      if (maxPrice) params_obj.max_price = parseFloat(maxPrice);

      const data = await productService.getByCategory(params.slug as string, params_obj);
      setProducts(data.products?.data || []);
      setCategory(data.category);
      setTotalPages(data.products?.last_page || 1);
      setTotal(data.products?.total || 0);
    } catch (error) {
      console.error('Failed to load category products:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6 md:py-8">
          {/* Breadcrumb */}
          <nav className="mb-6 text-sm text-gray-600">
            <Link href="/" className="hover:text-[#0066CC]">
              Home
            </Link>
            <span className="mx-2">/</span>
            <Link href="/products" className="hover:text-[#0066CC]">
              Products
            </Link>
            <span className="mx-2">/</span>
            <span className="text-gray-900">{category?.name || params.slug}</span>
          </nav>

          {/* Category Header */}
          {category && (
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{category.name}</h1>
              {category.description && (
                <p className="text-gray-600">{category.description}</p>
              )}
            </div>
          )}

          {/* Search and Filters */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6 space-y-4">
            <div>
              <Input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products in this category..."
                className="w-full"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min Price</label>
                <Input
                  type="number"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  placeholder="€0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Price</label>
                <Input
                  type="number"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="€1000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066CC] focus:border-[#0066CC]"
                >
                  <option value="created_at">Newest</option>
                  <option value="price">Price</option>
                  <option value="rating">Rating</option>
                  <option value="view_count">Most Viewed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066CC] focus:border-[#0066CC]"
                >
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>
              </div>
            </div>
          </div>

          {/* Products Grid */}
          {loading ? (
            <Loader fullScreen text="Loading products..." />
          ) : products.length > 0 ? (
            <>
              <div className="mb-4 text-sm text-gray-600">
                Showing {products.length} of {total} products
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <p className="text-gray-600">No products found in this category.</p>
              <Link href="/products" className="text-[#0066CC] hover:underline mt-2 inline-block">
                Browse all products
              </Link>
            </div>
          )}
    </div>
  );
}


'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
// Layout components are now handled by app/template.tsx
import { productService, type Product, type ProductListParams } from '@/services/product-service';
import { isEyeProductCategory } from '@/utils/product-utils';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import ProductListCard from '@/components/products/ProductListCard';
import { getFullImageUrl, isLocalhostImage } from '@/lib/image-utils';

const PRODUCT_TYPE_OPTIONS = [
  { value: 'frame', label: 'Frames', icon: '🕶️' },
  { value: 'sunglasses', label: 'Sunglasses', icon: '😎' },
  { value: 'contact_lens', label: 'Contact Lenses', icon: '👁️' },
  { value: 'eye_hygiene', label: 'Eye Hygiene', icon: '💧' },
  { value: 'accessory', label: 'Accessories', icon: '🎁' },
];

const GENDER_OPTIONS = [
  { value: 'men', label: 'Men' },
  { value: 'women', label: 'Women' },
  { value: 'unisex', label: 'Unisex' },
  { value: 'kids', label: 'Kids' },
];

const STOCK_OPTIONS = [
  { value: 'in_stock', label: 'In Stock' },
  { value: 'out_of_stock', label: 'Out of Stock' },
  { value: 'backorder', label: 'Backorder' },
];

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
      <div className="relative w-full h-48 sm:h-56 bg-gradient-to-br from-gray-50 to-gray-100 border-b border-gray-100">
        <div className="absolute inset-0 flex items-center justify-center">
          <Image
            src={displayImageUrl}
            alt={product.name}
            width={200}
            height={200}
            className="object-contain max-h-[80%] transition-all duration-300 group-hover:scale-105"
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

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
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

  const [categories, setCategories] = useState<Array<{ id: number; name: string; slug: string }>>([]);
  const [availableFrameShapes, setAvailableFrameShapes] = useState<string[]>([]);
  const [availableFrameMaterials, setAvailableFrameMaterials] = useState<string[]>([]);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [currentPage, selectedCategory, selectedType, selectedGender, selectedFrameShape, selectedFrameMaterial, selectedStockStatus, minRating, minPrice, maxPrice, sortBy, sortOrder, search]);

  const loadCategories = async () => {
    try {
      const data = await productService.getCategories(true);
      setCategories(data || []);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      const params: ProductListParams = {
        per_page: 24,
        page: currentPage,
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
      setProducts(productsData);
      setTotalPages(data.last_page || 1);
      setTotal(data.total || 0);

      // Extract unique frame shapes and materials from products
      const shapes = new Set<string>();
      const materials = new Set<string>();
      productsData.forEach((product: Product) => {
        if (product.frame_shape) shapes.add(product.frame_shape);
        if (product.frame_material) materials.add(product.frame_material);
      });
      setAvailableFrameShapes(Array.from(shapes).sort());
      setAvailableFrameMaterials(Array.from(materials).sort());
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadProducts();
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
    setCurrentPage(1);
  };

  const activeFilters = useMemo(
    () =>
      [
        search ? `Search: ${search}` : null,
        selectedCategory
          ? `Category: ${categories.find((c) => c.id.toString() === selectedCategory)?.name || selectedCategory}`
          : null,
        selectedType ? `Type: ${PRODUCT_TYPE_OPTIONS.find((o) => o.value === selectedType)?.label || selectedType}` : null,
        selectedGender ? `Gender: ${selectedGender}` : null,
        selectedFrameShape ? `Shape: ${selectedFrameShape}` : null,
        selectedFrameMaterial ? `Material: ${selectedFrameMaterial}` : null,
        selectedStockStatus ? `Stock: ${selectedStockStatus.replace('_', ' ')}` : null,
        minRating ? `Min rating: ${minRating}+` : null,
        minPrice ? `Min price: €${minPrice}` : null,
        maxPrice ? `Max price: €${maxPrice}` : null,
      ].filter(Boolean) as string[],
    [
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
    ]
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 w-full">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">All Products</h1>
          <p className="text-gray-600">Browse our complete collection of optical products</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <aside className="lg:col-span-1">
            <div className="bg-white/95 backdrop-blur rounded-2xl shadow-sm border border-gray-200 p-5 sticky top-4 transition-all hover:shadow-md">
              <div className="mb-4 rounded-xl bg-gradient-to-r from-[#0066CC] to-[#00A0FF] p-4 text-white">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold inline-flex items-center gap-2">
                    <span aria-hidden="true">✨</span>
                    Filters
                  </h2>
                  <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold">
                    {activeFilters.length} active
                  </span>
                </div>
                <p className="mt-1 text-xs text-blue-100">Refine products with smart quick picks</p>
              </div>

              <div className="mb-4 flex flex-wrap gap-2">
                {activeFilters.slice(0, 4).map((filter) => (
                  <span
                    key={filter}
                    className="rounded-full bg-blue-50 text-[#0066CC] border border-blue-200 px-2.5 py-1 text-[11px] font-semibold animate-pulse"
                  >
                    {filter}
                  </span>
                ))}
                {activeFilters.length > 4 && (
                  <span className="rounded-full bg-gray-100 text-gray-700 px-2.5 py-1 text-[11px] font-semibold">
                    +{activeFilters.length - 4} more
                  </span>
                )}
              </div>

              {/* Search */}
              <form onSubmit={handleSearch} className="mb-6">
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔎</span>
                  <Input
                    type="text"
                    placeholder="Search products..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10"
                  />
                </div>
                <Button type="submit" variant="primary" size="sm" className="w-full mt-2">
                  Search
                </Button>
              </form>

              <div className="mb-6">
                <p className="text-sm font-semibold text-gray-900 mb-2">Quick Product Type</p>
                <div className="flex flex-wrap gap-2">
                  {PRODUCT_TYPE_OPTIONS.map((option) => {
                    const active = selectedType === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setSelectedType(active ? '' : option.value);
                          setCurrentPage(1);
                        }}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition-all duration-200 ${
                          active
                            ? 'bg-[#0066CC] text-white border-[#0066CC] shadow-sm scale-105'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-[#0066CC] hover:text-[#0066CC] hover:-translate-y-0.5'
                        }`}
                      >
                        <span className="mr-1" aria-hidden="true">{option.icon}</span>
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mb-6">
                <p className="text-sm font-semibold text-gray-900 mb-2">Quick Gender</p>
                <div className="flex flex-wrap gap-2">
                  {GENDER_OPTIONS.map((option) => {
                    const active = selectedGender === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setSelectedGender(active ? '' : option.value);
                          setCurrentPage(1);
                        }}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition-all duration-200 ${
                          active
                            ? 'bg-[#0066CC] text-white border-[#0066CC] shadow-sm scale-105'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-[#0066CC] hover:text-[#0066CC] hover:-translate-y-0.5'
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Category</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0066CC] focus:border-[#0066CC] transition-all"
                  >
                    <option value="">All Categories</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id.toString()}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {availableFrameShapes.length > 0 && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Frame Shape</label>
                    <select
                      value={selectedFrameShape}
                      onChange={(e) => {
                        setSelectedFrameShape(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0066CC] focus:border-[#0066CC] transition-all"
                    >
                      <option value="">All Shapes</option>
                      {availableFrameShapes.map((shape) => (
                        <option key={shape} value={shape}>
                          {shape.charAt(0).toUpperCase() + shape.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {availableFrameMaterials.length > 0 && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Frame Material</label>
                    <select
                      value={selectedFrameMaterial}
                      onChange={(e) => {
                        setSelectedFrameMaterial(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0066CC] focus:border-[#0066CC] transition-all"
                    >
                      <option value="">All Materials</option>
                      {availableFrameMaterials.map((material) => (
                        <option key={material} value={material}>
                          {material.charAt(0).toUpperCase() + material.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Stock Status</label>
                  <div className="flex flex-wrap gap-2">
                    {STOCK_OPTIONS.map((option) => {
                      const active = selectedStockStatus === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            setSelectedStockStatus(active ? '' : option.value);
                            setCurrentPage(1);
                          }}
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition-all duration-200 ${
                            active
                              ? 'bg-[#0066CC] text-white border-[#0066CC] shadow-sm scale-105'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-[#0066CC] hover:text-[#0066CC] hover:-translate-y-0.5'
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Minimum Rating</label>
                  <select
                    value={minRating}
                    onChange={(e) => {
                      setMinRating(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#0066CC] focus:border-[#0066CC] transition-all"
                  >
                    <option value="">Any Rating</option>
                    <option value="4.5">4.5+ Stars</option>
                    <option value="4.0">4.0+ Stars</option>
                    <option value="3.5">3.5+ Stars</option>
                    <option value="3.0">3.0+ Stars</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Price Range</label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      placeholder="Min €"
                      value={minPrice}
                      onChange={(e) => {
                        setMinPrice(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full"
                    />
                    <Input
                      type="number"
                      placeholder="Max €"
                      value={maxPrice}
                      onChange={(e) => {
                        setMaxPrice(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={clearFilters}
                className="mt-6 w-full rounded-xl border border-[#0066CC] px-3 py-2.5 text-sm font-semibold text-[#0066CC] hover:bg-blue-50 transition-colors"
              >
                Clear All Filters
              </button>
            </div>
          </aside>

          {/* Products Grid */}
          <div className="lg:col-span-3">
            {/* Toolbar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  Showing {products.length} of {total} products
                </span>
                {activeFilters.length > 0 && (
                  <span className="rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-xs font-semibold text-[#0066CC]">
                    {activeFilters.length} filters active
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4">
                {/* Sort */}
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Sort:</label>
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
                    <option value="created_at_desc">Newest First</option>
                    <option value="created_at_asc">Oldest First</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                    <option value="rating_desc">Highest Rated</option>
                    <option value="view_count_desc">Most Viewed</option>
                  </select>
                </div>
                {/* View Mode */}
                <div className="flex items-center gap-2 border border-gray-300 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded ${viewMode === 'grid' ? 'bg-[#0066CC] text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
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
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
                : 'space-y-4'
              }>
                {[...Array(6)].map((_, i) => (
                  <div key={i} className={viewMode === 'grid' ? 'h-80 bg-gray-200 rounded-xl animate-pulse' : 'h-48 bg-gray-200 rounded-xl animate-pulse'}></div>
                ))}
              </div>
            ) : products.length > 0 ? (
              <>
                <div className={viewMode === 'grid' 
                  ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
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

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-8 flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-gray-600 px-4">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
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
                <p className="text-gray-600 mb-4">No products found matching your filters.</p>
                <Button onClick={clearFilters} variant="primary">
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        </div>
    </div>
  );
}


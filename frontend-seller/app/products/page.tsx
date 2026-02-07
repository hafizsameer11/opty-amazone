'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import Sidebar from '@/components/layout/Sidebar';
import { productService, type Product } from '@/services/product-service';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import ProductDetailsModal from '@/components/products/ProductDetailsModal';
import BulkActions from '@/components/products/BulkActions';
import Link from 'next/link';

export default function ProductsPage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [productTypeFilter, setProductTypeFilter] = useState<string>('');
  const [featuredFilter, setFeaturedFilter] = useState<string>('');
  const [onSaleFilter, setOnSaleFilter] = useState<string>('');
  const [categories, setCategories] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>({});
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [processingBulk, setProcessingBulk] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadProducts();
      loadCategories();
    }
  }, [isAuthenticated, statusFilter, categoryFilter, productTypeFilter, featuredFilter, onSaleFilter]);

  const loadCategories = async () => {
    try {
      const data = await productService.getCategories();
      setCategories(data || []);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadProducts = async () => {
    try {
      setLoadingProducts(true);
      const params: any = {
        per_page: 20,
      };
      if (statusFilter) {
        params.is_active = statusFilter === 'active';
      }
      if (categoryFilter) {
        params.category_id = parseInt(categoryFilter);
      }
      if (productTypeFilter) {
        params.product_type = productTypeFilter;
      }
      if (featuredFilter) {
        params.is_featured = featuredFilter === 'true';
      }
      if (onSaleFilter) {
        params.on_sale = onSaleFilter === 'true';
      }
      if (search) {
        params.search = search;
      }
      const response = await productService.getAll(params);
      if (response.data) {
        setProducts(response.data);
        setMeta(response.meta || {});
      } else if (Array.isArray(response)) {
        setProducts(response);
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.error('Failed to load products:', error);
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadProducts();
  };

  const handleToggleStatus = async (id: number) => {
    try {
      await productService.toggleStatus(id);
      loadProducts();
    } catch (error) {
      console.error('Failed to toggle product status:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this product?')) {
      return;
    }
    try {
      await productService.delete(id);
      loadProducts();
    } catch (error) {
      console.error('Failed to delete product:', error);
      alert('Failed to delete product');
    }
  };

  const handleProductClick = (productId: number) => {
    setSelectedProductId(productId);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedProductId(null);
  };

  const handleProductUpdate = () => {
    loadProducts();
  };

  const handleDuplicateProduct = async (productId: number) => {
    if (!confirm('Are you sure you want to duplicate this product?')) return;
    
    try {
      const product = await productService.getOne(productId);
      const duplicateData: any = {
        ...product,
        name: `${product.name} (Copy)`,
        sku: `${product.sku}-COPY-${Date.now()}`,
      };
      delete duplicateData.id;
      delete duplicateData.created_at;
      delete duplicateData.updated_at;
      delete duplicateData.slug;
      
      await productService.create(duplicateData);
      loadProducts();
    } catch (error) {
      console.error('Failed to duplicate product:', error);
      alert('Failed to duplicate product');
    }
  };

  const handleSelectProduct = (productId: number, checked: boolean) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(productId);
      } else {
        newSet.delete(productId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProducts(new Set(products.map(p => p.id)));
    } else {
      setSelectedProducts(new Set());
    }
  };

  const handleBulkActivate = async () => {
    if (selectedProducts.size === 0) return;
    if (!confirm(`Are you sure you want to activate ${selectedProducts.size} product(s)?`)) return;
    
    setProcessingBulk(true);
    try {
      const promises = Array.from(selectedProducts).map(id => 
        productService.toggleStatus(id).catch(() => null)
      );
      await Promise.all(promises);
      setSelectedProducts(new Set());
      loadProducts();
    } catch (error) {
      console.error('Failed to activate products:', error);
      alert('Failed to activate some products');
    } finally {
      setProcessingBulk(false);
    }
  };

  const handleBulkDeactivate = async () => {
    if (selectedProducts.size === 0) return;
    if (!confirm(`Are you sure you want to deactivate ${selectedProducts.size} product(s)?`)) return;
    
    setProcessingBulk(true);
    try {
      const promises = Array.from(selectedProducts).map(id => 
        productService.toggleStatus(id).catch(() => null)
      );
      await Promise.all(promises);
      setSelectedProducts(new Set());
      loadProducts();
    } catch (error) {
      console.error('Failed to deactivate products:', error);
      alert('Failed to deactivate some products');
    } finally {
      setProcessingBulk(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProducts.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedProducts.size} product(s)? This action cannot be undone.`)) return;
    
    setProcessingBulk(true);
    try {
      const promises = Array.from(selectedProducts).map(id => 
        productService.delete(id).catch(() => null)
      );
      await Promise.all(promises);
      setSelectedProducts(new Set());
      loadProducts();
    } catch (error) {
      console.error('Failed to delete products:', error);
      alert('Failed to delete some products');
    } finally {
      setProcessingBulk(false);
    }
  };

  if (loading || loadingProducts) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0066CC] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto">
            <div className="py-6">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">Products</h1>
                    <p className="text-gray-600 mt-1">Manage your product listings</p>
                  </div>
                  <Link href="/products/new">
                    <Button>
                      <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add Product
                    </Button>
                  </Link>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
                  <form onSubmit={handleSearch} className="space-y-4">
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <Input
                          type="text"
                          placeholder="Search products by name, SKU, or description..."
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                        />
                      </div>
                      <Button type="submit">Search</Button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                        <select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                          className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066CC] focus:border-[#0066CC] text-sm"
                        >
                          <option value="">All Status</option>
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                        <select
                          value={categoryFilter}
                          onChange={(e) => setCategoryFilter(e.target.value)}
                          className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066CC] focus:border-[#0066CC] text-sm"
                        >
                          <option value="">All Categories</option>
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.id.toString()}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Product Type</label>
                        <select
                          value={productTypeFilter}
                          onChange={(e) => setProductTypeFilter(e.target.value)}
                          className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066CC] focus:border-[#0066CC] text-sm"
                        >
                          <option value="">All Types</option>
                          <option value="frame">Frames</option>
                          <option value="sunglasses">Sunglasses</option>
                          <option value="contact_lens">Contact Lenses</option>
                          <option value="eye_hygiene">Eye Hygiene</option>
                          <option value="accessory">Accessories</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Featured</label>
                        <select
                          value={featuredFilter}
                          onChange={(e) => setFeaturedFilter(e.target.value)}
                          className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066CC] focus:border-[#0066CC] text-sm"
                        >
                          <option value="">All</option>
                          <option value="true">Featured</option>
                          <option value="false">Not Featured</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">On Sale</label>
                        <select
                          value={onSaleFilter}
                          onChange={(e) => setOnSaleFilter(e.target.value)}
                          className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066CC] focus:border-[#0066CC] text-sm"
                        >
                          <option value="">All</option>
                          <option value="true">On Sale</option>
                          <option value="false">Not On Sale</option>
                        </select>
                      </div>
                    </div>
                  </form>
                </div>

                {/* Products List */}
                {products.length === 0 ? (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <h3 className="mt-2 text-lg font-semibold text-gray-900">No products</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by creating a new product.</p>
                    <div className="mt-6">
                      <Link href="/products/new">
                        <Button>Add Product</Button>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Bulk Actions */}
                    <BulkActions
                      selectedCount={selectedProducts.size}
                      onBulkActivate={handleBulkActivate}
                      onBulkDeactivate={handleBulkDeactivate}
                      onBulkDelete={handleBulkDelete}
                      processing={processingBulk}
                    />
                    
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                            <tr>
                              <th className="px-6 py-4 text-left">
                                <input
                                  type="checkbox"
                                  checked={products.length > 0 && selectedProducts.size === products.length}
                                  onChange={(e) => handleSelectAll(e.target.checked)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-4 h-4 text-[#0066CC] border-gray-300 rounded focus:ring-[#0066CC]"
                                />
                              </th>
                              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Product</th>
                              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">SKU</th>
                              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Price</th>
                              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Stock</th>
                              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Performance</th>
                              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                              <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {products.map((product, index) => (
                            <tr
                              key={product.id}
                              className="hover:bg-gray-50 transition-colors duration-150 cursor-pointer animate-fade-in"
                              style={{ animationDelay: `${index * 0.05}s` }}
                              onClick={() => handleProductClick(product.id)}
                            >
                              <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={selectedProducts.has(product.id)}
                                  onChange={(e) => handleSelectProduct(product.id, e.target.checked)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-4 h-4 text-[#0066CC] border-gray-300 rounded focus:ring-[#0066CC]"
                                />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  {product.images && product.images.length > 0 ? (
                                    <img
                                      src={product.images[0]}
                                      alt={product.name}
                                      className="h-12 w-12 rounded-lg object-cover mr-4 border-2 border-gray-200"
                                    />
                                  ) : (
                                    <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 mr-4 flex items-center justify-center border-2 border-gray-200">
                                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                    </div>
                                  )}
                                  <div>
                                    <div className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                      {product.name}
                                      {product.is_featured && (
                                        <Badge variant="primary" size="sm">Featured</Badge>
                                      )}
                                    </div>
                                    <div className="text-sm text-gray-500 capitalize">{product.product_type.replace('_', ' ')}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">{product.sku}</td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-bold text-[#0066CC]">€{Number(product.price || 0).toFixed(2)}</div>
                                {product.compare_at_price && (
                                  <div className="text-xs text-gray-400 line-through">€{Number(product.compare_at_price).toFixed(2)}</div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <Badge
                                  variant={
                                    product.stock_status === 'in_stock'
                                      ? 'success'
                                      : product.stock_status === 'out_of_stock'
                                      ? 'error'
                                      : 'warning'
                                  }
                                  size="sm"
                                >
                                  {product.stock_quantity} {product.stock_status.replace('_', ' ')}
                                </Badge>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-xs space-y-1">
                                  <div className="flex items-center gap-1">
                                    <span className="text-gray-600">Views:</span>
                                    <span className="font-medium">{product.view_count || 0}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-gray-600">Sold:</span>
                                    <span className="font-medium text-green-600">{product.total_sold || 0}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-gray-600">Revenue:</span>
                                    <span className="font-medium text-[#0066CC]">€{(product.total_revenue || 0).toFixed(2)}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <Badge variant={product.is_active ? 'success' : 'default'} size="sm">
                                  {product.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-2 flex-wrap">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDuplicateProduct(product.id);
                                    }}
                                    className="text-purple-600 hover:text-purple-800 font-medium transition-colors text-xs"
                                    title="Duplicate Product"
                                  >
                                    <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                  </button>
                                  <Link href={`/products/${product.id}/edit`}>
                                    <button className="text-[#0066CC] hover:text-[#0052a3] font-medium transition-colors">
                                      Edit
                                    </button>
                                  </Link>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleStatus(product.id);
                                    }}
                                    className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
                                  >
                                    {product.is_active ? 'Deactivate' : 'Activate'}
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(product.id);
                                    }}
                                    className="text-red-600 hover:text-red-800 font-medium transition-colors"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Product Details Modal */}
                {selectedProductId && (
                  <ProductDetailsModal
                    isOpen={isModalOpen}
                    onClose={handleModalClose}
                    productId={selectedProductId}
                    onProductUpdate={handleProductUpdate}
                  />
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}


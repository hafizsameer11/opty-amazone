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
import ActionsMenu from '@/components/ui/ActionsMenu';
import ProductDetailsModal from '@/components/products/ProductDetailsModal';
import BulkActions from '@/components/products/BulkActions';
import Link from 'next/link';
import { getProductEditPath } from '@/lib/product-edit-routes';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ProductsPage() {
  const { isAuthenticated, loading } = useAuth();
  const { t } = useLanguage();
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
  const [showFilters, setShowFilters] = useState(false);

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

  useLiveRefresh(() => loadProducts(true), isAuthenticated, 20000);

  const loadCategories = async () => {
    try {
      const data = await productService.getCategories();
      setCategories(data || []);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadProducts = async (silent = false) => {
    try {
      if (!silent) setLoadingProducts(true);
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
      if (!silent) setLoadingProducts(false);
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

  const handleToggleMute = async (id: number) => {
    try {
      await productService.toggleMute(id);
      loadProducts();
    } catch (error) {
      console.error('Failed to toggle product mute:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('products.confirmDelete'))) {
      return;
    }
    try {
      await productService.delete(id);
      loadProducts();
    } catch (error) {
      console.error('Failed to delete product:', error);
      alert(t('products.deleteFailed'));
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

  const productTypeLabel = (productType: string) => {
    const labels: Record<string, string> = {
      frame: t('products.frames'),
      sunglasses: t('products.sunglasses'),
      contact_lens: t('products.contactLenses'),
      eye_hygiene: t('products.eyeHygiene'),
      accessory: t('products.accessories'),
    };
    return labels[productType] ?? productType.replaceAll('_', ' ');
  };

  const stockStatusLabel = (stockStatus: string) => {
    const labels: Record<string, string> = {
      in_stock: t('form.inStock'),
      out_of_stock: t('form.outOfStock'),
      backorder: t('form.backorder'),
    };
    return labels[stockStatus] ?? stockStatus.replaceAll('_', ' ');
  };

  const handleProductUpdate = () => {
    loadProducts();
  };

  const handleDuplicateProduct = async (productId: number) => {
    if (!confirm(t('products.confirmDuplicate'))) return;
    
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
      alert(t('products.duplicateFailed'));
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
    if (!confirm(t('products.activateConfirm', { count: selectedProducts.size }))) return;
    
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
      alert(t('products.bulkActivateFailed'));
    } finally {
      setProcessingBulk(false);
    }
  };

  const handleBulkDeactivate = async () => {
    if (selectedProducts.size === 0) return;
    if (!confirm(t('products.deactivateConfirm', { count: selectedProducts.size }))) return;
    
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
      alert(t('products.bulkDeactivateFailed'));
    } finally {
      setProcessingBulk(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProducts.size === 0) return;
    if (!confirm(t('products.deleteConfirm', { count: selectedProducts.size }))) return;
    
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
      alert(t('products.bulkDeleteFailed'));
    } finally {
      setProcessingBulk(false);
    }
  };

  if (loading || loadingProducts) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0066CC] mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('common.loading')}</p>
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
            <div className="py-4 sm:py-6">
              <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
                <div className="mb-6">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{t('products.title')}</h1>
                      <p className="mt-1 text-sm text-gray-600 sm:text-base">{t('products.subtitle')}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
                    <Link href="/products/new/eye-glasses" className="min-w-0">
                      <Button variant="outline" className="w-full !px-2 text-xs sm:w-auto sm:!px-4 sm:text-sm">
                        <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        {t('products.addEyeglasses')}
                      </Button>
                    </Link>
                    <Link href="/products/new/sun-glasses" className="min-w-0">
                      <Button variant="outline" className="w-full !px-2 text-xs sm:w-auto sm:!px-4 sm:text-sm">
                        <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        {t('products.addSunglasses')}
                      </Button>
                    </Link>
                    <Link href="/products/new/contact-lenses" className="min-w-0">
                      <Button variant="outline" className="w-full !px-2 text-xs sm:w-auto sm:!px-4 sm:text-sm">
                        <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        {t('products.addContacts')}
                      </Button>
                    </Link>
                    <Link href="/products/new/eye-hygiene" className="min-w-0">
                      <Button variant="outline" className="w-full !px-2 text-xs sm:w-auto sm:!px-4 sm:text-sm">
                        <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        {t('products.addHygiene')}
                      </Button>
                    </Link>
                    <Link href="/products/new/accessori" className="col-span-2 min-w-0 sm:col-auto">
                      <Button variant="outline" className="w-full !px-2 text-xs sm:w-auto sm:!px-4 sm:text-sm">
                        <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        {t('products.addAccessory')}
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Filters */}
                <div className="mb-5 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:mb-6 sm:p-5">
                  <form onSubmit={handleSearch} className="space-y-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
                      <div className="flex-1">
                        <Input
                          type="text"
                          placeholder={t('products.searchPlaceholder')}
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:block">
                        <Button type="submit" className="w-full sm:w-auto">{t('common.search')}</Button>
                        <button type="button" onClick={() => setShowFilters((current) => !current)} className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 sm:hidden">
                          {showFilters ? 'Hide filters' : 'Filters'}
                        </button>
                      </div>
                    </div>
                    <div className={`${showFilters ? 'grid' : 'hidden'} grid-cols-2 gap-3 md:grid md:grid-cols-5 md:gap-4`}>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">{t('products.status')}</label>
                        <select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                          className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066CC] focus:border-[#0066CC] text-sm"
                        >
                          <option value="">{t('products.allStatus')}</option>
                          <option value="active">{t('products.active')}</option>
                          <option value="inactive">{t('products.inactive')}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">{t('products.category')}</label>
                        <select
                          value={categoryFilter}
                          onChange={(e) => setCategoryFilter(e.target.value)}
                          className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066CC] focus:border-[#0066CC] text-sm"
                        >
                          <option value="">{t('products.allCategories')}</option>
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.id.toString()}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">{t('products.productType')}</label>
                        <select
                          value={productTypeFilter}
                          onChange={(e) => setProductTypeFilter(e.target.value)}
                          className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066CC] focus:border-[#0066CC] text-sm"
                        >
                          <option value="">{t('products.allTypes')}</option>
                          <option value="frame">{t('products.frames')}</option>
                          <option value="sunglasses">{t('products.sunglasses')}</option>
                          <option value="contact_lens">{t('products.contactLenses')}</option>
                          <option value="eye_hygiene">{t('products.eyeHygiene')}</option>
                          <option value="accessory">{t('products.accessories')}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">{t('products.featured')}</label>
                        <select
                          value={featuredFilter}
                          onChange={(e) => setFeaturedFilter(e.target.value)}
                          className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066CC] focus:border-[#0066CC] text-sm"
                        >
                          <option value="">{t('products.all')}</option>
                          <option value="true">{t('products.featured')}</option>
                          <option value="false">{t('products.notFeatured')}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">{t('products.onSale')}</label>
                        <select
                          value={onSaleFilter}
                          onChange={(e) => setOnSaleFilter(e.target.value)}
                          className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066CC] focus:border-[#0066CC] text-sm"
                        >
                          <option value="">{t('products.all')}</option>
                          <option value="true">{t('products.onSale')}</option>
                          <option value="false">{t('products.notOnSale')}</option>
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
                    <h3 className="mt-2 text-lg font-semibold text-gray-900">{t('products.emptyTitle')}</h3>
                    <p className="mt-1 text-sm text-gray-500">{t('products.emptyDescription')}</p>
                    <div className="mt-6">
                      <Link href="/products/new">
                        <Button>{t('products.addProduct')}</Button>
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

                    <div className="grid grid-cols-2 gap-3 md:hidden">
                      {products.map((product, index) => (
                        <article key={product.id} onClick={() => handleProductClick(product.id)} className="group min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm transition hover:border-blue-300 hover:shadow-md animate-fade-in" style={{ animationDelay: `${index * 0.04}s` }}>
                          <div className="mb-2 flex items-start justify-between gap-2">
                            <label className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-50" onClick={(event) => event.stopPropagation()}>
                              <input type="checkbox" checked={selectedProducts.has(product.id)} onChange={(event) => handleSelectProduct(product.id, event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-[#0066CC] focus:ring-[#0066CC]" aria-label={`Select ${product.name}`} />
                            </label>
                            <div className="flex min-w-0 flex-wrap justify-end gap-1">
                              {product.is_featured && <Badge variant="primary" size="sm">{t('products.featured')}</Badge>}
                              <Badge variant={product.is_active ? 'success' : 'default'} size="sm">{product.is_active ? t('products.active') : t('products.inactive')}</Badge>
                            </div>
                          </div>
                          <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-slate-50 ring-1 ring-slate-100">
                            {product.images?.[0] ? <img src={product.images[0]} alt={product.name} className="h-full w-full object-contain p-2" /> : <svg className="h-9 w-9 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 0 1 2.828 0L16 16m-2-2 1.586-1.586a2 2 0 0 1 2.828 0L20 14m-6-6h.01M6 20h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2Z" /></svg>}
                          </div>
                          <div className="pt-3">
                            <h2 className="line-clamp-2 min-h-10 text-sm font-bold leading-5 text-slate-900">{product.name}</h2>
                            <p className="mt-0.5 truncate text-xs capitalize text-slate-500">{productTypeLabel(product.product_type)}</p>
                            <div className="mt-2 flex items-end justify-between gap-2"><div className="min-w-0"><p className="truncate text-base font-extrabold text-[#0066CC]">€{Number(product.price || 0).toFixed(2)}</p><p className="truncate text-[11px] text-slate-500">{product.stock_quantity} {stockStatusLabel(product.stock_status)}</p></div><span className="text-xs font-bold text-slate-400">{product.total_sold || 0} sold</span></div>
                          </div>
                          <div className="mt-3 grid grid-cols-3 gap-1.5" onClick={(event) => event.stopPropagation()}>
                            <button type="button" onClick={() => handleProductClick(product.id)} className="rounded-lg bg-blue-50 px-2 py-2 text-xs font-bold text-[#0066CC]">{t('products.viewDetail')}</button>
                            <Link href={getProductEditPath(product)} className="rounded-lg border border-slate-200 px-2 py-2 text-center text-xs font-bold text-slate-700">{t('store.edit')}</Link>
                            <button type="button" onClick={() => void handleDelete(product.id)} className="rounded-lg border border-red-100 px-2 py-2 text-xs font-bold text-red-600">{t('store.delete')}</button>
                          </div>
                        </article>
                      ))}
                    </div>

                    <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm md:block">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                            <tr>
                              <th className="px-4 lg:px-6 py-4 text-left">
                                <input
                                  type="checkbox"
                                  checked={products.length > 0 && selectedProducts.size === products.length}
                                  onChange={(e) => handleSelectAll(e.target.checked)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-4 h-4 text-[#0066CC] border-gray-300 rounded focus:ring-[#0066CC]"
                                />
                              </th>
                              <th className="px-4 lg:px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">{t('common.name')}</th>
                          <th className="hidden md:table-cell px-4 lg:px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">{t('form.sku')}</th>
                              <th className="px-4 lg:px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">{t('form.price')}</th>
                              <th className="hidden md:table-cell px-4 lg:px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">{t('form.stock')}</th>
                              <th className="hidden lg:table-cell px-4 lg:px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">{t('products.performance')}</th>
                              <th className="px-4 lg:px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">{t('common.status')}</th>
                              <th className="px-4 lg:px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                                <span className="sr-only">{t('common.actions')}</span>
                              </th>
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
                              <td className="px-4 lg:px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={selectedProducts.has(product.id)}
                                  onChange={(e) => handleSelectProduct(product.id, e.target.checked)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-4 h-4 text-[#0066CC] border-gray-300 rounded focus:ring-[#0066CC]"
                                />
                              </td>
                              <td className="px-4 lg:px-6 py-4">
                                <div className="flex items-center min-w-0">
                                  {product.images && product.images.length > 0 ? (
                                    <img
                                      src={product.images[0]}
                                      alt={product.name}
                                      className="h-12 w-12 rounded-lg object-contain bg-white mr-3 sm:mr-4 border border-gray-200 shrink-0"
                                    />
                                  ) : (
                                    <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 mr-3 sm:mr-4 flex items-center justify-center border border-gray-200 shrink-0">
                                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <div className="text-sm font-semibold text-gray-900 flex items-center gap-2 flex-wrap">
                                      <span className="line-clamp-2">{product.name}</span>
                                      {product.is_featured && (
                                        <Badge variant="primary" size="sm">{t('products.featured')}</Badge>
                                      )}
                                      {product.sale_campaign?.display_label && (
                                        <span
                                          className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-200"
                                          title={
                                            product.sale_campaign.end_date
                                              ? `${t('products.offerEnds')} ${new Date(product.sale_campaign.end_date).toLocaleString()}`
                                              : t('products.onSale')
                                          }
                                        >
                                          {t('products.sale')} {product.sale_campaign.display_label}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-sm text-gray-500 capitalize">{productTypeLabel(product.product_type)}</div>
                                    <button
                                      type="button"
                                      className="text-xs text-[#0066CC] hover:underline mt-0.5"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleProductClick(product.id);
                                      }}
                                    >
                                      {t('products.viewDetail')}
                                    </button>
                                  </div>
                                </div>
                              </td>
                              <td className="hidden md:table-cell px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">{product.sku}</td>
                              <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-bold text-[#0066CC]">€{Number(product.price || 0).toFixed(2)}</div>
                                {product.compare_at_price && (
                                  <div className="text-xs text-gray-400 line-through">€{Number(product.compare_at_price).toFixed(2)}</div>
                                )}
                              </td>
                              <td className="hidden md:table-cell px-4 lg:px-6 py-4 whitespace-nowrap">
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
                                  {product.stock_quantity} {stockStatusLabel(product.stock_status)}
                                </Badge>
                              </td>
                              <td className="hidden lg:table-cell px-4 lg:px-6 py-4 whitespace-nowrap">
                                <div className="text-xs space-y-1">
                                  <div className="flex items-center gap-1">
                                    <span className="text-gray-600">{t('products.views')}:</span>
                                    <span className="font-medium">{product.view_count || 0}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-gray-600">{t('products.sold')}:</span>
                                    <span className="font-medium text-green-600">{product.total_sold || 0}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-gray-600">{t('products.revenue')}:</span>
                                    <span className="font-medium text-[#0066CC]">€{Number(product.total_revenue || 0).toFixed(2)}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                                <Badge variant={product.is_active ? 'success' : 'default'} size="sm">
                                  {product.is_active ? t('products.active') : t('products.inactive')}
                                </Badge>
                                {product.is_muted && (
                                  <Badge variant="warning" size="sm" className="ml-1">
                                    {t('products.muted')}
                                  </Badge>
                                )}
                                {(product.stock_quantity ?? 0) <= 5 && product.is_active && (
                                  <Badge variant="warning" size="sm" className="ml-1">
                                    {t('products.lowStock')}
                                  </Badge>
                                )}
                              </td>
                              <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                                <ActionsMenu
                                  items={[
                                    {
                                      label: t('products.viewDetail'),
                                      onClick: () => handleProductClick(product.id),
                                    },
                                    {
                                      label: t('store.edit'),
                                      href: getProductEditPath(product),
                                      onClick: () => {},
                                    },
                                    {
                                      label: t('products.duplicate'),
                                      onClick: () => void handleDuplicateProduct(product.id),
                                    },
                                    {
                                      label: product.is_active ? t('products.deactivate') : t('products.activate'),
                                      onClick: () => void handleToggleStatus(product.id),
                                    },
                                    {
                                      label: product.is_muted ? t('products.unmute') : t('products.mute'),
                                      onClick: () => void handleToggleMute(product.id),
                                    },
                                    {
                                      label: t('store.delete'),
                                      onClick: () => void handleDelete(product.id),
                                      variant: 'danger',
                                    },
                                  ]}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  </>
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


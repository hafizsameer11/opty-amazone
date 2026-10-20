'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import Sidebar from '@/components/layout/Sidebar';
import {
  productService,
  productToEditFormData,
  type Category,
  type CreateProductData,
  type Product,
} from '@/services/product-service';
import { categoryFieldConfigService } from '@/services/category-field-config-service';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Alert from '@/components/ui/Alert';
import ProductImageUpload from '@/components/products/ProductImageUpload';
import SimplifiedProductOptions from '@/components/products/SimplifiedProductOptions';
import ContactLensCategorySelect from '@/components/products/ContactLensCategorySelect';
import ContactLensSpecificationEditor from '@/components/products/ContactLensSpecificationEditor';
import ContactLensPackUnitsEditor from '@/components/products/ContactLensPackUnitsEditor';
import { useSuggestedProductSku } from '@/lib/use-suggested-product-sku';
import { useLanguage } from '@/contexts/LanguageContext';

type CreationStep = 'details' | 'prescription' | 'packs';

export default function ContactLensesProductPage() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();
  const { t } = useLanguage();
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [, setEnabledFields] = useState<string[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successToast, setSuccessToast] = useState('');
  const [createdProduct, setCreatedProduct] = useState<Product | null>(null);
  const [creationStep, setCreationStep] = useState<CreationStep>('details');

  const [formData, setFormData] = useState<CreateProductData>({
    name: '',
    category_id: undefined,
    sub_category_id: undefined,
    sku: '',
    description: '',
    short_description: '',
    product_type: 'contact_lens',
    price: 0,
    compare_at_price: undefined,
    cost_price: undefined,
    stock_quantity: 0,
    stock_status: 'in_stock',
    images: [],
    is_featured: false,
    is_active: true,
  });

  const applySuggestedSku = useCallback((sku: string) => {
    setFormData((prev) => (prev.sku.trim() ? prev : { ...prev, sku }));
  }, []);

  useSuggestedProductSku(true, formData.sku, applySuggestedSku);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;
    const loadCategoriesAndFields = async () => {
      try {
        const data = await productService.getCategories();
        if (cancelled) return;

        setCategories(data);
        const contactLensesCategory = data.find((category) => category.slug === 'contact-lenses');
        if (!contactLensesCategory) {
          setLoadingConfig(false);
          return;
        }

        setCategoryId(contactLensesCategory.id);
        setFormData((previous) => ({ ...previous, category_id: contactLensesCategory.id }));

        try {
          setLoadingConfig(true);
          const config = await categoryFieldConfigService.getFieldsForCategory(contactLensesCategory.id);
          if (!cancelled) setEnabledFields(config.enabled_fields);
        } catch (error) {
          console.error('Failed to load field config:', error);
          if (!cancelled) setEnabledFields([]);
        } finally {
          if (!cancelled) setLoadingConfig(false);
        }
      } catch (error) {
        console.error('Failed to load categories:', error);
        if (!cancelled) setLoadingConfig(false);
      }
    };

    void loadCategoriesAndFields();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!successToast) return;
    const timer = setTimeout(() => setSuccessToast(''), 3200);
    return () => clearTimeout(timer);
  }, [successToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessToast('');
    setSaving(true);

    try {
      if (createdProduct) {
        const updated = await productService.update(createdProduct.id, formData);
        setCreatedProduct(updated);
        setFormData(productToEditFormData(updated));
        setSuccessToast(t('products.updated'));
      } else {
        const created = await productService.create(formData);
        setCreatedProduct(created);
        setFormData(productToEditFormData(created));
        setCreationStep('prescription');
        setSuccessToast(t('products.created'));
      }
    } catch (error: unknown) {
      const apiError = error as {
        response?: { data?: { errors?: { name?: string[]; sku?: string[] }; message?: string } };
      };
      const errorMessage =
        apiError.response?.data?.errors?.name?.[0] ||
        apiError.response?.data?.errors?.sku?.[0] ||
        apiError.response?.data?.message ||
        t('products.createFailed');
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleImagesChange = (images: string[]) => {
    setFormData({
      ...formData,
      images,
    });
  };

  const patchFormData = (
    data: CreateProductData | ((previous: CreateProductData) => CreateProductData)
  ) => {
    setFormData((previous) => (typeof data === 'function' ? data(previous) : data));
  };

  if (loading || loadingConfig) {
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
    <>
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto">
            <div className="py-6">
              <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-6">
                  <button
                    onClick={() => router.back()}
                    className="text-[#0066CC] hover:underline mb-4"
                  >
                    {t('Back to Products')}
                  </button>
                  <h1 className="text-3xl font-bold text-gray-900">{t('form.createContactLenses')}</h1>
                </div>

                {error && (
                  <div className="mb-4">
                    <Alert type="error" message={error} onClose={() => setError('')} />
                  </div>
                )}

                {createdProduct && (
                  <div className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                    <nav className="flex flex-wrap border-b border-gray-200" aria-label="Contact lens creation steps">
                      {(
                        [
                          { id: 'details' as const, label: t('form.productDetails') },
                          { id: 'prescription' as const, label: t('form.prescriptionTab') },
                          { id: 'packs' as const, label: t('form.packPricingTab') },
                        ] as const
                      ).map((step) => (
                        <button
                          key={step.id}
                          type="button"
                          onClick={() => setCreationStep(step.id)}
                          className={`border-b-2 px-5 py-3.5 text-sm font-semibold transition-colors ${
                            creationStep === step.id
                              ? 'border-teal-600 bg-teal-50/60 text-teal-800'
                              : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                        >
                          {step.label}
                        </button>
                      ))}
                    </nav>
                  </div>
                )}

                {creationStep === 'details' && (
                <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('form.basicInformation')}</h2>
                    <div className="space-y-4">
                      <Input
                        label="Product Name *"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                      <ContactLensCategorySelect
                        categories={categories}
                        mainCategoryId={categoryId}
                        value={formData.sub_category_id}
                        onChange={(subCategoryId) =>
                          setFormData({ ...formData, sub_category_id: subCategoryId })
                        }
                      />
                      <Input
                        label="SKU"
                        value={formData.sku}
                        onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                        placeholder="Auto-generated when you open this form"
                      />
                      <p className="text-xs text-gray-500">
                        {t('form.skuAutoHint')}
                      </p>
                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2">
                          Description
                        </label>
                        <textarea
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-md"
                          rows={4}
                        />
                      </div>
                      <Input
                        label="Short Description"
                        value={formData.short_description}
                        onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
                        maxLength={500}
                      />
                    </div>
                  </div>

                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('form.pricingInventory')}</h2>
                    <div className="grid grid-cols-3 gap-4">
                      <Input
                        label="Price *"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                        required
                      />
                      <Input
                        label="Compare At Price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.compare_at_price || ''}
                        onChange={(e) => setFormData({ ...formData, compare_at_price: e.target.value ? parseFloat(e.target.value) : undefined })}
                      />
                      <Input
                        label="Cost Price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.cost_price || ''}
                        onChange={(e) => setFormData({ ...formData, cost_price: e.target.value ? parseFloat(e.target.value) : undefined })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <Input
                        label="Stock Quantity *"
                        type="number"
                        min="0"
                        value={formData.stock_quantity}
                        onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) || 0 })}
                        required
                      />
                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2">
                          {t('form.stockStatus')} *
                        </label>
                        <select
                          value={formData.stock_status}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              stock_status: e.target.value as CreateProductData['stock_status'],
                            })
                          }
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-md"
                          required
                        >
                          <option value="in_stock">{t('form.inStock')}</option>
                          <option value="out_of_stock">{t('form.outOfStock')}</option>
                          <option value="backorder">{t('form.backorder')}</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('form.images')}</h2>
                    <ProductImageUpload
                      images={formData.images || []}
                      onChange={handleImagesChange}
                      maxImages={10}
                    />
                  </div>

                  {/* Product Options */}
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('form.options')}</h2>
                    <SimplifiedProductOptions
                      formData={formData}
                      setFormData={patchFormData}
                      productType="contact_lens"
                    />
                  </div>

                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('form.productStatus')}</h2>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.is_active}
                          onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                          className="mr-2"
                        />
                        <span>{t('products.active')}</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.is_featured}
                          onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                          className="mr-2"
                        />
                        <span>{t('products.featured')}</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <Button type="submit" isLoading={saving} className="flex-1">
                      {createdProduct ? t('form.updateProduct') : t('form.createProduct')}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.push('/products')}
                    >
                      {t('common.cancel')}
                    </Button>
                  </div>
                </form>
                )}

                {createdProduct && creationStep === 'prescription' && (
                  <div className="space-y-4">
                    <ContactLensSpecificationEditor productId={createdProduct.id} />
                    <div className="flex flex-wrap justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                      <Button type="button" variant="outline" onClick={() => setCreationStep('details')}>
                        {t('common.previous')}
                      </Button>
                      <Button type="button" onClick={() => setCreationStep('packs')}>
                        {t('common.next')}
                      </Button>
                    </div>
                  </div>
                )}

                {createdProduct && creationStep === 'packs' && (
                  <div className="space-y-4">
                    <ContactLensPackUnitsEditor
                      productId={createdProduct.id}
                      productName={formData.name}
                      basePrice={formData.price}
                      value={formData.contact_lens_unit_config}
                      onChange={(next) =>
                        patchFormData((previous) => ({ ...previous, contact_lens_unit_config: next }))
                      }
                      onSave={async (config) => {
                        const updated = await productService.update(createdProduct.id, {
                          contact_lens_unit_config: config,
                        });
                        setCreatedProduct(updated);
                        setFormData(productToEditFormData(updated));
                      }}
                    />
                    <div className="flex flex-wrap justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                      <Button type="button" variant="outline" onClick={() => setCreationStep('prescription')}>
                        {t('common.previous')}
                      </Button>
                      <Button type="button" onClick={() => router.push('/products')}>
                        {t('Back to Products')}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
      <BottomNav />
    </div>
      {successToast && (
        <div className="fixed bottom-5 right-5 z-[100] max-w-sm">
          <Alert type="success" message={successToast} onClose={() => setSuccessToast('')} className="shadow-2xl" />
        </div>
      )}
    </>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import ProductEditShell from '@/components/layout/ProductEditShell';
import {
  productService,
  productToEditFormData,
  type Category,
  type CreateProductData,
} from '@/services/product-service';
import { getProductEditPath } from '@/lib/product-edit-routes';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Alert from '@/components/ui/Alert';
import Loader from '@/components/ui/Loader';
import ProductImageUpload from '@/components/products/ProductImageUpload';
import SimplifiedProductOptions from '@/components/products/SimplifiedProductOptions';

export default function EditEyeHygieneProductPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const productId = parseInt(String(params.id), 10);

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState<CreateProductData | null>(null);

  const subCategoryOptions = useMemo(() => {
    const selectedCategory = categories.find((c) => c.id === categoryId);
    const subCategories = selectedCategory?.children || [];
    const options: Array<{ id: number; name: string }> = [];
    for (const sub of subCategories) {
      options.push({ id: sub.id, name: sub.name });
      if (Array.isArray(sub.children)) {
        for (const subSub of sub.children) {
          options.push({ id: subSub.id, name: `${sub.name} → ${subSub.name}` });
        }
      }
    }
    return options;
  }, [categories, categoryId]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated || !Number.isFinite(productId)) return;
    let cancelled = false;
    (async () => {
      try {
        setPageLoading(true);
        const p = await productService.getOne(productId);
        if (cancelled) return;
        if (p.product_type !== 'eye_hygiene') {
          window.location.replace(`${window.location.origin}${getProductEditPath(p)}`);
          return;
        }
        setFormData(productToEditFormData(p));

        const data = await productService.getCategories();
        if (cancelled) return;
        setCategories(data);

        const mainCat =
          data.find((c) => c.id === p.category_id) || data.find((c) => c.slug === 'eye-hygiene');
        const cid = mainCat?.id ?? p.category_id;
        if (cid) setCategoryId(cid);
      } catch {
        if (!cancelled) setError(t('products.loadFailed'));
      } finally {
        if (!cancelled) setPageLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      await productService.update(productId, formData);
      setSuccess(t('products.updated'));
    } catch (err: any) {
      setError(
        err.response?.data?.errors?.name?.[0] ||
          err.response?.data?.errors?.sku?.[0] ||
          err.response?.data?.message ||
          t('products.updateFailed')
      );
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader />
      </div>
    );
  }

  if (!Number.isFinite(productId)) {
    return null;
  }

  if (pageLoading || !formData) {
    return (
      <ProductEditShell title="Edit eye hygiene product" subtitle="Loading…">
        <div className="py-16 flex justify-center">
          <Loader />
        </div>
      </ProductEditShell>
    );
  }

  const patchFormData = (
    data: CreateProductData | ((prev: CreateProductData) => CreateProductData)
  ) => {
    setFormData((prev) => {
      if (!prev) return prev;
      return typeof data === 'function' ? data(prev) : data;
    });
  };

  return (
    <ProductEditShell
      title="Edit eye hygiene product"
      subtitle="Same simplified layout as create: basics, pricing, images, and hygiene-specific options."
    >
      {error ? (
        <div className="mb-4">
          <Alert type="error" message={error} onClose={() => setError('')} />
        </div>
      ) : null}
      {success ? (
        <div className="mb-4">
          <Alert type="success" message={success} onClose={() => setSuccess('')} />
        </div>
      ) : null}

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
            <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">{t('form.subCategory')}</label>
              <select
                value={formData.sub_category_id || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    sub_category_id: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-md"
              >
                <option value="">{t('form.selectSubCategory')}</option>
                {subCategoryOptions.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <Input label="SKU" value={formData.sku} disabled className="bg-gray-100" />
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">{t('form.description')}</label>
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
              onChange={(e) =>
                setFormData({
                  ...formData,
                  compare_at_price: e.target.value ? parseFloat(e.target.value) : undefined,
                })
              }
            />
            <Input
              label="Cost Price"
              type="number"
              step="0.01"
              min="0"
              value={formData.cost_price || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  cost_price: e.target.value ? parseFloat(e.target.value) : undefined,
                })
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <Input
              label="Stock Quantity *"
              type="number"
              min="0"
              value={formData.stock_quantity}
              onChange={(e) =>
                setFormData({ ...formData, stock_quantity: parseInt(e.target.value, 10) || 0 })
              }
              required
            />
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">{t('form.stockStatus')} *</label>
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
            onChange={(images) => setFormData({ ...formData, images })}
            maxImages={10}
          />
        </div>

        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('form.options')}</h2>
          <SimplifiedProductOptions formData={formData} setFormData={patchFormData} productType="eye_hygiene" />
        </div>

        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('common.status')}</h2>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="mr-2"
              />
              <span>{t('form.active')}</span>
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
            {t('form.updateProduct')}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push('/products')}>
            {t('common.cancel')}
          </Button>
        </div>
      </form>
    </ProductEditShell>
  );
}

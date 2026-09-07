'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
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
import ContactLensSpecificationEditor from '@/components/products/ContactLensSpecificationEditor';
import ContactLensPackUnitsEditor from '@/components/products/ContactLensPackUnitsEditor';
import ContactLensCategorySelect from '@/components/products/ContactLensCategorySelect';

type EditMainTab = 'details' | 'prescription' | 'packs';

export default function EditContactLensesProductPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const productId = parseInt(String(params.id), 10);

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successToast, setSuccessToast] = useState('');

  const [formData, setFormData] = useState<CreateProductData | null>(null);
  const [mainTab, setMainTab] = useState<EditMainTab>('details');

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
        setError('');
        const p = await productService.getOne(productId);
        if (cancelled) return;
        if (p.product_type !== 'contact_lens') {
          window.location.replace(`${window.location.origin}${getProductEditPath(p)}`);
          return;
        }
        setFormData(productToEditFormData(p));

        const data = await productService.getCategories();
        if (cancelled) return;
        setCategories(data);

        const mainCat =
          data.find((c) => c.id === p.category_id) || data.find((c) => c.slug === 'contact-lenses');
        const cid = mainCat?.id ?? p.category_id;
        if (cid) {
          setCategoryId(cid);
        }
      } catch {
        if (!cancelled) setError('Failed to load product');
      } finally {
        if (!cancelled) setPageLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, productId]);

  useEffect(() => {
    if (!successToast) return;
    const timer = setTimeout(() => setSuccessToast(''), 3200);
    return () => clearTimeout(timer);
  }, [successToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;
    setError('');
    setSuccessToast('');
    setSaving(true);
    try {
      await productService.update(productId, formData);
      setSuccessToast('Product updated successfully');
    } catch (err: any) {
      setError(
        err.response?.data?.errors?.name?.[0] ||
          err.response?.data?.errors?.sku?.[0] ||
          err.response?.data?.message ||
          'Failed to update product'
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
      <ProductEditShell title="Edit contact lenses" subtitle="Loading…">
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
    <>
    <ProductEditShell
      title="Edit contact lenses"
      subtitle="Use the tabs below: product details, prescription dropdowns, and optional pack sizes (units per box)."
    >
      {error ? (
        <div className="mb-4">
          <Alert type="error" message={error} onClose={() => setError('')} />
        </div>
      ) : null}

      <div className="mb-6 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <nav className="flex flex-wrap gap-0 border-b border-gray-200">
          {(
            [
              { id: 'details' as const, label: 'Product details' },
              { id: 'prescription' as const, label: 'Prescription options' },
              { id: 'packs' as const, label: 'Pack units & pricing' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setMainTab(t.id)}
              className={`px-5 py-3.5 text-sm font-semibold border-b-2 transition-colors ${
                mainTab === t.id
                  ? 'border-teal-600 text-teal-800 bg-teal-50/60'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {mainTab === 'prescription' && (
        <div className="space-y-4">
          <ContactLensSpecificationEditor productId={productId} />
        </div>
      )}

      {mainTab === 'packs' && (
        <ContactLensPackUnitsEditor
          productId={productId}
          productName={formData.name}
          basePrice={formData.price}
          value={formData.contact_lens_unit_config}
          onChange={(next) => patchFormData((prev) => ({ ...prev, contact_lens_unit_config: next }))}
          onSave={async (config) => {
            await productService.update(productId, { contact_lens_unit_config: config });
            setFormData((prev) => (prev ? { ...prev, contact_lens_unit_config: config } : prev));
          }}
        />
      )}

      {mainTab === 'details' && (
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>
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
            <Input label="SKU" value={formData.sku} disabled className="bg-gray-100" />
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">Description</label>
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
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Pricing & Inventory</h2>
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
              <label className="block text-sm font-semibold text-gray-800 mb-2">Stock Status *</label>
              <select
                value={formData.stock_status}
                onChange={(e) =>
                  setFormData({ ...formData, stock_status: e.target.value as CreateProductData['stock_status'] })
                }
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-md"
                required
              >
                <option value="in_stock">In Stock</option>
                <option value="out_of_stock">Out of Stock</option>
                <option value="backorder">Backorder</option>
              </select>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Images</h2>
          <ProductImageUpload
            images={formData.images || []}
            onChange={(images) => setFormData({ ...formData, images })}
            maxImages={10}
          />
        </div>

        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Product Options</h2>
          <SimplifiedProductOptions formData={formData} setFormData={patchFormData} productType="contact_lens" />
        </div>

        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Status</h2>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="mr-2"
              />
              <span>Active</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_featured}
                onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                className="mr-2"
              />
              <span>Featured</span>
            </label>
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <Button type="submit" isLoading={saving} className="flex-1">
            Save product
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push('/products')}>
            Cancel
          </Button>
        </div>
      </form>
      )}
    </ProductEditShell>
      {successToast && (
        <div className="fixed bottom-5 right-5 z-[100] max-w-sm">
          <Alert type="success" message={successToast} onClose={() => setSuccessToast('')} className="shadow-2xl" />
        </div>
      )}
    </>
  );
}

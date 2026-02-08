'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import Sidebar from '@/components/layout/Sidebar';
import { productService, type Category, type CreateProductData } from '@/services/product-service';
import { categoryFieldConfigService } from '@/services/category-field-config-service';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Alert from '@/components/ui/Alert';
import CategoryProductForm from '@/components/products/CategoryProductForm';

export default function ContactLensesProductPage() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [enabledFields, setEnabledFields] = useState<string[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadCategories();
    }
  }, [isAuthenticated]);

  const loadCategories = async () => {
    try {
      const data = await productService.getCategories();
      setCategories(data);
      
      const contactLensesCategory = data.find(cat => cat.slug === 'contact-lenses');
      if (contactLensesCategory) {
        setCategoryId(contactLensesCategory.id);
        setFormData(prev => ({ ...prev, category_id: contactLensesCategory.id }));
        await loadFieldConfig(contactLensesCategory.id);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
      setLoadingConfig(false);
    }
  };

  const loadFieldConfig = async (catId: number) => {
    try {
      setLoadingConfig(true);
      const config = await categoryFieldConfigService.getFieldsForCategory(catId);
      setEnabledFields(config.enabled_fields);
    } catch (error) {
      console.error('Failed to load field config:', error);
      setEnabledFields([]);
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const product = await productService.create(formData);
      setSuccess('Product created successfully');
      setTimeout(() => {
        router.push('/products');
      }, 1500);
    } catch (error: any) {
      const errorMessage = 
        error.response?.data?.errors?.name?.[0] ||
        error.response?.data?.errors?.sku?.[0] ||
        error.response?.data?.message ||
        'Failed to save product';
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleImageAdd = () => {
    const url = prompt('Enter image URL:');
    if (url) {
      setFormData({
        ...formData,
        images: [...(formData.images || []), url],
      });
    }
  };

  const handleImageRemove = (index: number) => {
    setFormData({
      ...formData,
      images: formData.images?.filter((_, i) => i !== index) || [],
    });
  };

  if (loading || loadingConfig) {
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

  const selectedCategory = categories.find(c => c.id === categoryId);
  const subCategories = selectedCategory?.children || [];

  return (
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
                    ← Back to Products
                  </button>
                  <h1 className="text-3xl font-bold text-gray-900">Create Contact Lenses Product</h1>
                </div>

                {error && (
                  <div className="mb-4">
                    <Alert type="error" message={error} onClose={() => setError('')} />
                  </div>
                )}

                {success && (
                  <div className="mb-4">
                    <Alert type="success" message={success} onClose={() => setSuccess('')} />
                  </div>
                )}

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
                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2">
                          Sub Category
                        </label>
                        <select
                          value={formData.sub_category_id || ''}
                          onChange={(e) => setFormData({ ...formData, sub_category_id: e.target.value ? Number(e.target.value) : undefined })}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-md"
                        >
                          <option value="">Select Sub Category</option>
                          {subCategories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <Input
                        label="SKU *"
                        value={formData.sku}
                        onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                        required
                      />
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
                          Stock Status *
                        </label>
                        <select
                          value={formData.stock_status}
                          onChange={(e) => setFormData({ ...formData, stock_status: e.target.value as any })}
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
                    <div className="space-y-4">
                      {formData.images && formData.images.length > 0 && (
                        <div className="grid grid-cols-4 gap-4">
                          {formData.images.map((img, index) => (
                            <div key={index} className="relative">
                              <img src={img} alt={`Product ${index + 1}`} className="w-full h-24 object-cover rounded" />
                              <button
                                type="button"
                                onClick={() => handleImageRemove(index)}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <Button type="button" variant="outline" onClick={handleImageAdd}>
                        Add Image URL
                      </Button>
                    </div>
                  </div>

                  <CategoryProductForm
                    formData={formData}
                    setFormData={setFormData}
                    enabledFields={enabledFields}
                    productType="contact_lens"
                  />

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
                      Create Product
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.push('/products')}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </main>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

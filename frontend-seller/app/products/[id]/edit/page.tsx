'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import Sidebar from '@/components/layout/Sidebar';
import { productService, type Product, type Category, type CreateProductData } from '@/services/product-service';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Alert from '@/components/ui/Alert';
import ColorVariationsManager from '@/components/products/ColorVariationsManager';

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingProduct, setLoadingProduct] = useState(true);
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
    product_type: 'frame',
    price: 0,
    compare_at_price: undefined,
    cost_price: undefined,
    stock_quantity: 0,
    stock_status: 'in_stock',
    images: [],
    frame_shape: '',
    frame_material: '',
    frame_color: '',
    gender: 'unisex',
    lens_type: '',
    lens_index_options: [],
    treatment_options: [],
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
      if (params.id && params.id !== 'new' && params.id !== 'new/edit') {
        loadProduct();
      } else {
        setLoadingProduct(false);
      }
    }
  }, [isAuthenticated, params.id]);

  const loadProduct = async () => {
    try {
      setLoadingProduct(true);
      const data = await productService.getOne(Number(params.id));
      setProduct(data);
      setFormData({
        name: data.name,
        category_id: data.category_id || undefined,
        sub_category_id: data.sub_category_id || undefined,
        sku: data.sku,
        description: data.description || '',
        short_description: data.short_description || '',
        product_type: data.product_type,
        price: data.price,
        compare_at_price: data.compare_at_price || undefined,
        sale_start_date: data.sale_start_date || undefined,
        sale_end_date: data.sale_end_date || undefined,
        cost_price: data.cost_price || undefined,
        stock_quantity: data.stock_quantity,
        stock_status: data.stock_status,
        images: data.images || [],
        frame_shape: data.frame_shape || '',
        frame_material: data.frame_material || '',
        frame_color: data.frame_color || '',
        gender: data.gender || 'unisex',
        lens_type: data.lens_type || '',
        lens_index_options: data.lens_index_options || [],
        treatment_options: data.treatment_options || [],
        is_featured: data.is_featured,
        is_active: data.is_active,
      });
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to load product');
    } finally {
      setLoadingProduct(false);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await productService.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      if (params.id && params.id !== 'new' && params.id !== 'new/edit') {
        await productService.update(Number(params.id), formData);
        setSuccess('Product updated successfully');
      } else {
        await productService.create(formData);
        setSuccess('Product created successfully');
        setTimeout(() => {
          router.push('/products');
        }, 1500);
      }
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

  if (loading || loadingProduct) {
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

  const isNew = params.id === 'new' || params.id === 'new/edit';
  const selectedCategory = categories.find(c => c.id === formData.category_id);
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
                  <h1 className="text-3xl font-bold text-gray-900">
                    {isNew ? 'Create Product' : 'Edit Product'}
                  </h1>
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
                  {/* Basic Information */}
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>
                    <div className="space-y-4">
                      <Input
                        label="Product Name *"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-800 mb-2">
                            Category
                          </label>
                          <select
                            value={formData.category_id || ''}
                            onChange={(e) => setFormData({ ...formData, category_id: e.target.value ? Number(e.target.value) : undefined, sub_category_id: undefined })}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-md"
                          >
                            <option value="">Select Category</option>
                            {categories.map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {cat.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-800 mb-2">
                            Sub Category
                          </label>
                          <select
                            value={formData.sub_category_id || ''}
                            onChange={(e) => setFormData({ ...formData, sub_category_id: e.target.value ? Number(e.target.value) : undefined })}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-md"
                            disabled={!selectedCategory}
                          >
                            <option value="">Select Sub Category</option>
                            {subCategories.map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {cat.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <Input
                        label="SKU *"
                        value={formData.sku}
                        onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                        required
                        disabled={!isNew}
                      />
                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2">
                          Product Type *
                        </label>
                        <select
                          value={formData.product_type}
                          onChange={(e) => setFormData({ ...formData, product_type: e.target.value as any })}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-md"
                          required
                        >
                          <option value="frame">Frame</option>
                          <option value="sunglasses">Sunglasses</option>
                          <option value="contact_lens">Contact Lens</option>
                          <option value="eye_hygiene">Eye Hygiene</option>
                          <option value="accessory">Accessory</option>
                        </select>
                      </div>
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

                  {/* Pricing & Inventory */}
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
                        label="Compare At Price (Original Price)"
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
                    
                    {/* Discount Calculator */}
                    <DiscountCalculator
                      price={formData.price || 0}
                      compareAtPrice={formData.compare_at_price}
                      onCompareAtPriceChange={(value) => setFormData({ ...formData, compare_at_price: value })}
                    />
                    
                    {/* Scheduled Sale Dates */}
                    {formData.compare_at_price && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">Scheduled Sale</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Sale Start Date
                            </label>
                            <Input
                              type="datetime-local"
                              value={formData.sale_start_date ? new Date(formData.sale_start_date).toISOString().slice(0, 16) : ''}
                              onChange={(e) => setFormData({ ...formData, sale_start_date: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Sale End Date
                            </label>
                            <Input
                              type="datetime-local"
                              value={formData.sale_end_date ? new Date(formData.sale_end_date).toISOString().slice(0, 16) : ''}
                              onChange={(e) => setFormData({ ...formData, sale_end_date: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                              className="w-full"
                            />
                          </div>
                        </div>
                        {formData.sale_start_date && formData.sale_end_date && (
                          <p className="text-xs text-gray-600 mt-2">
                            Sale will be active from {new Date(formData.sale_start_date).toLocaleString()} to {new Date(formData.sale_end_date).toLocaleString()}
                          </p>
                        )}
                      </div>
                    )}
                    
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

                  {/* Images */}
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

                  {/* Product Options */}
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Product Options</h2>
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Frame Shape"
                        value={formData.frame_shape}
                        onChange={(e) => setFormData({ ...formData, frame_shape: e.target.value })}
                      />
                      <Input
                        label="Frame Material"
                        value={formData.frame_material}
                        onChange={(e) => setFormData({ ...formData, frame_material: e.target.value })}
                      />
                      <Input
                        label="Frame Color"
                        value={formData.frame_color}
                        onChange={(e) => setFormData({ ...formData, frame_color: e.target.value })}
                      />
                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2">
                          Gender
                        </label>
                        <select
                          value={formData.gender}
                          onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-md"
                        >
                          <option value="unisex">Unisex</option>
                          <option value="men">Men</option>
                          <option value="women">Women</option>
                          <option value="kids">Kids</option>
                        </select>
                      </div>
                    </div>
                    <div className="mt-4">
                      <label className="block text-sm font-semibold text-gray-800 mb-2">
                        Lens Type
                      </label>
                      <textarea
                        value={formData.lens_type}
                        onChange={(e) => setFormData({ ...formData, lens_type: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-md"
                        rows={2}
                      />
                    </div>
                  </div>

                  {/* Status */}
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

                  {/* Color Variations - Only show for saved products */}
                  {!isNew && product && (
                    <div className="mt-6">
                      <ColorVariationsManager 
                        productId={product.id} 
                        categoryId={formData.category_id}
                      />
                    </div>
                  )}

                  {/* Submit */}
                  <div className="flex gap-4 pt-4">
                    <Button type="submit" isLoading={saving} className="flex-1">
                      {isNew ? 'Create Product' : 'Update Product'}
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
    </div>
  );
}


'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import Sidebar from '@/components/layout/Sidebar';
import { productService, type Category, type CreateProductData } from '@/services/product-service';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Alert from '@/components/ui/Alert';
import DiscountCalculator from '@/components/products/DiscountCalculator';

// This page is specifically for creating new products
// It's similar to the edit page but always in "new" mode
export default function NewProductEditPage() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();
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
    // Contact Lens fields
    base_curve_options: [],
    diameter_options: [],
    powers_range: '',
    replacement_frequency: '',
    contact_lens_brand: '',
    contact_lens_color: '',
    contact_lens_material: '',
    contact_lens_type: '',
    has_uv_filter: false,
    can_sleep_with: false,
    water_content: '',
    is_medical_device: true,
    // Eye Hygiene fields
    size_volume: '',
    pack_type: '',
    expiry_date: '',
    // Additional fields
    model_3d_url: '',
    try_on_image: '',
    color_images: [],
    mm_calibers: null,
  });

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadCategories();
      setLoadingProduct(false);
    }
  }, [isAuthenticated]);

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
      const product = await productService.create(formData);
      setSuccess('Product created successfully');
      // Note: Frame sizes can be added later via the product edit page
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
                  <h1 className="text-3xl font-bold text-gray-900">Create Product</h1>
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
                    
                    {/* Frame/Sunglasses Options */}
                    {(formData.product_type === 'frame' || formData.product_type === 'sunglasses') && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <Input
                            label="Frame Shape"
                            value={formData.frame_shape || ''}
                            onChange={(e) => setFormData({ ...formData, frame_shape: e.target.value })}
                          />
                          <Input
                            label="Frame Material"
                            value={formData.frame_material || ''}
                            onChange={(e) => setFormData({ ...formData, frame_material: e.target.value })}
                          />
                          <Input
                            label="Frame Color"
                            value={formData.frame_color || ''}
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
                        <div>
                          <label className="block text-sm font-semibold text-gray-800 mb-2">
                            Lens Type
                          </label>
                          <textarea
                            value={formData.lens_type || ''}
                            onChange={(e) => setFormData({ ...formData, lens_type: e.target.value })}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-md"
                            rows={2}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-800 mb-2">
                            3D Model URL
                          </label>
                          <Input
                            value={formData.model_3d_url || ''}
                            onChange={(e) => setFormData({ ...formData, model_3d_url: e.target.value })}
                            placeholder="https://example.com/model.glb"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-800 mb-2">
                            Try-On Image URL
                          </label>
                          <Input
                            value={formData.try_on_image || ''}
                            onChange={(e) => setFormData({ ...formData, try_on_image: e.target.value })}
                            placeholder="https://example.com/try-on.jpg"
                          />
                        </div>
                      </div>
                    )}

                    {/* Contact Lens Options */}
                    {formData.product_type === 'contact_lens' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <Input
                            label="Contact Lens Brand"
                            value={formData.contact_lens_brand || ''}
                            onChange={(e) => setFormData({ ...formData, contact_lens_brand: e.target.value })}
                          />
                          <Input
                            label="Contact Lens Type"
                            value={formData.contact_lens_type || ''}
                            onChange={(e) => setFormData({ ...formData, contact_lens_type: e.target.value })}
                          />
                          <Input
                            label="Contact Lens Color"
                            value={formData.contact_lens_color || ''}
                            onChange={(e) => setFormData({ ...formData, contact_lens_color: e.target.value })}
                          />
                          <Input
                            label="Contact Lens Material"
                            value={formData.contact_lens_material || ''}
                            onChange={(e) => setFormData({ ...formData, contact_lens_material: e.target.value })}
                          />
                          <div>
                            <label className="block text-sm font-semibold text-gray-800 mb-2">
                              Replacement Frequency
                            </label>
                            <select
                              value={formData.replacement_frequency || ''}
                              onChange={(e) => setFormData({ ...formData, replacement_frequency: e.target.value })}
                              className="w-full px-4 py-3 border-2 border-gray-300 rounded-md"
                            >
                              <option value="">Select Frequency</option>
                              <option value="daily">Daily</option>
                              <option value="weekly">Weekly</option>
                              <option value="monthly">Monthly</option>
                              <option value="yearly">Yearly</option>
                            </select>
                          </div>
                          <Input
                            label="Water Content (%)"
                            value={formData.water_content || ''}
                            onChange={(e) => setFormData({ ...formData, water_content: e.target.value })}
                            placeholder="e.g., 38%, 55%"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-800 mb-2">
                            Base Curve Options (JSON array or comma-separated)
                          </label>
                          <textarea
                            value={Array.isArray(formData.base_curve_options) ? formData.base_curve_options.join(', ') : (formData.base_curve_options || '')}
                            onChange={(e) => {
                              const value = e.target.value;
                              const options = value.split(',').map(v => v.trim()).filter(v => v);
                              setFormData({ ...formData, base_curve_options: options });
                            }}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-md"
                            rows={2}
                            placeholder="8.6, 8.7, 8.8"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-800 mb-2">
                            Diameter Options (JSON array or comma-separated)
                          </label>
                          <textarea
                            value={Array.isArray(formData.diameter_options) ? formData.diameter_options.join(', ') : (formData.diameter_options || '')}
                            onChange={(e) => {
                              const value = e.target.value;
                              const options = value.split(',').map(v => v.trim()).filter(v => v);
                              setFormData({ ...formData, diameter_options: options });
                            }}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-md"
                            rows={2}
                            placeholder="14.0, 14.2, 14.5"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-800 mb-2">
                            Powers Range (JSON or text)
                          </label>
                          <textarea
                            value={formData.powers_range || ''}
                            onChange={(e) => setFormData({ ...formData, powers_range: e.target.value })}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-md"
                            rows={3}
                            placeholder='{"min": -10.0, "max": 10.0, "step": 0.25}'
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={formData.has_uv_filter || false}
                              onChange={(e) => setFormData({ ...formData, has_uv_filter: e.target.checked })}
                              className="mr-2"
                            />
                            <span>Has UV Filter</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={formData.can_sleep_with || false}
                              onChange={(e) => setFormData({ ...formData, can_sleep_with: e.target.checked })}
                              className="mr-2"
                            />
                            <span>Can Sleep With (Extended Wear)</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={formData.is_medical_device !== false}
                              onChange={(e) => setFormData({ ...formData, is_medical_device: e.target.checked })}
                              className="mr-2"
                            />
                            <span>Medical Device (Requires Prescription)</span>
                          </label>
                        </div>
                      </div>
                    )}

                    {/* Eye Hygiene Options */}
                    {formData.product_type === 'eye_hygiene' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <Input
                            label="Size/Volume"
                            value={formData.size_volume || ''}
                            onChange={(e) => setFormData({ ...formData, size_volume: e.target.value })}
                            placeholder="e.g., 100ml, 200ml, 500ml"
                          />
                          <Input
                            label="Pack Type"
                            value={formData.pack_type || ''}
                            onChange={(e) => setFormData({ ...formData, pack_type: e.target.value })}
                            placeholder="e.g., Single, Multi-pack, Bulk"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-800 mb-2">
                            Expiry Date
                          </label>
                          <Input
                            type="date"
                            value={formData.expiry_date || ''}
                            onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                          />
                        </div>
                      </div>
                    )}

                    {/* General Options (for all types) */}
                    <div className="mt-4">
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

                  {/* Submit */}
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

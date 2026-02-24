'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { productService, type Category, type CreateProductData, type Product } from '@/services/product-service';
import { categoryFieldConfigService } from '@/services/category-field-config-service';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Alert from '@/components/ui/Alert';
import Loader from '@/components/ui/Loader';
import ProductImageUpload from '@/components/products/ProductImageUpload';
import CategoryProductForm from '@/components/products/CategoryProductForm';
import DiscountCalculator from '@/components/products/DiscountCalculator';
import ColorVariationsManager from '@/components/products/ColorVariationsManager';

interface UnifiedProductFormProps {
  productId?: number; // If provided, it's edit mode; otherwise, create mode
  onSuccess?: () => void;
}

export default function UnifiedProductForm({ productId, onSuccess }: UnifiedProductFormProps) {
  const router = useRouter();
  const isNew = !productId;
  
  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<Category[]>([]);
  const [loadingProduct, setLoadingProduct] = useState(isNew ? false : true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [enabledFields, setEnabledFields] = useState<string[]>([]);

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
    size_volume: '',
    pack_type: '',
    expiry_date: '',
    model_3d_url: '',
    try_on_image: '',
    color_images: [],
    mm_calibers: null,
  });

  const selectedCategory = categories.find(cat => cat.id === formData.category_id);

  useEffect(() => {
    loadCategories();
    if (!isNew) {
      loadProduct();
    }
  }, [productId, isNew]);

  useEffect(() => {
    if (formData.category_id) {
      loadSubCategories();
      loadEnabledFields();
    } else {
      setSubCategories([]);
      setEnabledFields([]);
    }
  }, [formData.category_id]);

  const loadCategories = async () => {
    try {
      const data = await productService.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadSubCategories = async () => {
    if (!formData.category_id) return;
    try {
      const data = await productService.getCategories();
      const subs = data.filter(cat => cat.parent_id === formData.category_id);
      setSubCategories(subs);
    } catch (error) {
      console.error('Failed to load sub categories:', error);
    }
  };

  const loadEnabledFields = async () => {
    if (!formData.category_id) return;
    try {
      const config = await categoryFieldConfigService.getFieldsForCategory(formData.category_id);
      setEnabledFields(config.enabled_fields || []);
    } catch (error) {
      console.error('Failed to load enabled fields:', error);
      setEnabledFields([]);
    }
  };

  const loadProduct = async () => {
    if (!productId) return;
    try {
      setLoadingProduct(true);
      const data = await productService.getOne(productId);
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
        base_curve_options: data.base_curve_options || [],
        diameter_options: data.diameter_options || [],
        powers_range: data.powers_range || '',
        replacement_frequency: data.replacement_frequency || '',
        contact_lens_brand: data.contact_lens_brand || '',
        contact_lens_color: data.contact_lens_color || '',
        contact_lens_material: data.contact_lens_material || '',
        contact_lens_type: data.contact_lens_type || '',
        has_uv_filter: data.has_uv_filter || false,
        can_sleep_with: data.can_sleep_with || false,
        water_content: data.water_content || '',
        is_medical_device: data.is_medical_device !== false,
        size_volume: data.size_volume || '',
        pack_type: data.pack_type || '',
        expiry_date: data.expiry_date || '',
        model_3d_url: data.model_3d_url || '',
        try_on_image: data.try_on_image || '',
        color_images: data.color_images || [],
        mm_calibers: data.mm_calibers || null,
      });
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to load product');
    } finally {
      setLoadingProduct(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      if (isNew) {
        await productService.create(formData);
        setSuccess('Product created successfully');
        setTimeout(() => {
          if (onSuccess) {
            onSuccess();
          } else {
            router.push('/products');
          }
        }, 1500);
      } else {
        await productService.update(productId!, formData);
        setSuccess('Product updated successfully');
        setTimeout(() => {
          if (onSuccess) {
            onSuccess();
          } else {
            router.push('/products');
          }
        }, 1500);
      }
    } catch (error: any) {
      const errorMessage = 
        error.response?.data?.errors?.name?.[0] ||
        error.response?.data?.errors?.sku?.[0] ||
        error.response?.data?.message ||
        `Failed to ${isNew ? 'create' : 'update'} product`;
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleImagesChange = (images: string[]) => {
    setFormData({ ...formData, images });
  };

  if (loadingProduct) {
    return <Loader />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Alerts */}
      <div className="space-y-3">
        {error && <Alert type="error" message={error} onClose={() => setError('')} />}
        {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}
      </div>

      {/* Basic Information */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        {/* Section Header with Gradient */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-500 px-8 py-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Basic Information</h2>
              <p className="text-blue-100 mt-1">Essential product details and identification</p>
            </div>
          </div>
        </div>
        
        <div className="p-8">
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
              <Input
                label="Product Name *"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="bg-white"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5 border border-purple-100">
                <label className="block text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.category_id || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    category_id: e.target.value ? Number(e.target.value) : undefined,
                    sub_category_id: undefined 
                  })}
                  className="w-full px-4 py-3.5 bg-white border-2 border-purple-200 rounded-xl focus:ring-4 focus:ring-purple-200 focus:border-purple-500 transition-all font-medium text-gray-700 shadow-sm hover:border-purple-300"
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl p-5 border border-cyan-100">
                <label className="block text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-cyan-500 rounded-full"></span>
                  Sub Category
                  {subCategories.length > 0 && <span className="text-gray-400 text-xs font-normal ml-2">(Optional)</span>}
                </label>
                <select
                  value={formData.sub_category_id || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    sub_category_id: e.target.value ? Number(e.target.value) : undefined 
                  })}
                  className="w-full px-4 py-3.5 bg-white border-2 border-cyan-200 rounded-xl focus:ring-4 focus:ring-cyan-200 focus:border-cyan-500 transition-all font-medium text-gray-700 shadow-sm hover:border-cyan-300 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!selectedCategory}
                >
                  <option value="">Select Sub Category</option>
                  {subCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                {!selectedCategory && (
                  <p className="mt-2 text-xs text-cyan-600 font-medium flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    Select a category first
                  </p>
                )}
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-100">
              <Input
                label="SKU *"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                required
                disabled={!isNew}
                className="bg-white"
                placeholder="e.g., PROD-001"
              />
            </div>
            
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-5 border border-emerald-100">
              <label className="block text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                Product Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.product_type}
                onChange={(e) => setFormData({ ...formData, product_type: e.target.value as any })}
                className="w-full px-4 py-3.5 bg-white border-2 border-emerald-200 rounded-xl focus:ring-4 focus:ring-emerald-200 focus:border-emerald-500 transition-all font-medium text-gray-700 shadow-sm hover:border-emerald-300"
                required
              >
                <option value="frame">Frame</option>
                <option value="sunglasses">Sunglasses</option>
                <option value="contact_lens">Contact Lens</option>
                <option value="eye_hygiene">Eye Hygiene</option>
                <option value="accessory">Accessory</option>
              </select>
            </div>
            
            <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-xl p-6 border border-slate-200">
              <label className="block text-sm font-bold text-gray-800 mb-3">
                Description
                <span className="text-gray-400 text-xs font-normal ml-2">(Detailed product information)</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 transition-all resize-none shadow-sm"
                rows={5}
                placeholder="Describe your product in detail... Include features, benefits, and any important information customers should know."
              />
            </div>
            
            <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl p-6 border border-violet-100">
              <Input
                label="Short Description"
                value={formData.short_description}
                onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
                maxLength={500}
                className="bg-white"
                placeholder="Brief summary (max 500 characters)"
              />
              <p className="mt-2 text-xs text-gray-500">
                {formData.short_description?.length || 0} / 500 characters
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing & Inventory */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-8 py-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Pricing & Inventory</h2>
              <p className="text-green-100 mt-1">Set prices and manage stock levels</p>
            </div>
          </div>
        </div>
        
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-200">
              <Input
                label="Price *"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                required
                className="bg-white font-semibold text-lg"
                placeholder="0.00"
              />
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5 border border-purple-200">
              <Input
                label="Compare At Price (Original)"
                type="number"
                step="0.01"
                min="0"
                value={formData.compare_at_price || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  compare_at_price: e.target.value ? parseFloat(e.target.value) : undefined 
                })}
                className="bg-white"
                placeholder="0.00"
              />
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-5 border border-amber-200">
              <Input
                label="Cost Price"
                type="number"
                step="0.01"
                min="0"
                value={formData.cost_price || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  cost_price: e.target.value ? parseFloat(e.target.value) : undefined 
                })}
                className="bg-white"
                placeholder="0.00"
              />
            </div>
          </div>
          
          {formData.compare_at_price && formData.compare_at_price > formData.price && (
            <div className="mt-6">
              <DiscountCalculator
                price={formData.price || 0}
                compareAtPrice={formData.compare_at_price}
                onCompareAtPriceChange={(value) => setFormData({ ...formData, compare_at_price: value })}
              />
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 pt-8 border-t-2 border-gray-200">
            <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-5 border border-teal-200">
              <Input
                label="Stock Quantity *"
                type="number"
                min="0"
                value={formData.stock_quantity}
                onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) || 0 })}
                required
                className="bg-white font-semibold"
                placeholder="0"
              />
            </div>
            <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-xl p-5 border border-rose-200">
              <label className="block text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-rose-500 rounded-full"></span>
                Stock Status <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.stock_status}
                onChange={(e) => setFormData({ ...formData, stock_status: e.target.value as any })}
                className="w-full px-4 py-3.5 bg-white border-2 border-rose-200 rounded-xl focus:ring-4 focus:ring-rose-200 focus:border-rose-500 transition-all font-medium text-gray-700 shadow-sm hover:border-rose-300"
                required
              >
                <option value="in_stock">In Stock</option>
                <option value="out_of_stock">Out of Stock</option>
                <option value="backorder">Backorder</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Images */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-8 py-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Product Images</h2>
              <p className="text-purple-100 mt-1">Upload up to 10 high-quality images</p>
            </div>
          </div>
        </div>
        <div className="p-8">
          <ProductImageUpload
            images={formData.images || []}
            onChange={handleImagesChange}
            maxImages={10}
          />
        </div>
      </div>

      {/* Category-Specific Product Options */}
      {formData.category_id && enabledFields.length > 0 && (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <CategoryProductForm
            formData={formData}
            setFormData={setFormData}
            enabledFields={enabledFields}
            productType={formData.product_type}
          />
        </div>
      )}

      {/* Status */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 px-8 py-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Product Status</h2>
              <p className="text-yellow-100 mt-1">Control product visibility and features</p>
            </div>
          </div>
        </div>
        <div className="p-8">
          <div className="space-y-4">
            <label className="flex items-center p-5 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-2 border-green-200 hover:border-green-300 hover:shadow-md transition-all cursor-pointer group">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-6 h-6 text-green-600 border-gray-300 rounded-lg focus:ring-4 focus:ring-green-200 cursor-pointer"
              />
              <div className="ml-4 flex-1">
                <span className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  Active
                </span>
                <p className="text-sm text-gray-600 mt-1">Product will be visible to customers</p>
              </div>
              {formData.is_active && (
                <div className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full">
                  ON
                </div>
              )}
            </label>
            <label className="flex items-center p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group">
              <input
                type="checkbox"
                checked={formData.is_featured}
                onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                className="w-6 h-6 text-blue-600 border-gray-300 rounded-lg focus:ring-4 focus:ring-blue-200 cursor-pointer"
              />
              <div className="ml-4 flex-1">
                <span className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  Featured
                </span>
                <p className="text-sm text-gray-600 mt-1">Show this product in featured sections</p>
              </div>
              {formData.is_featured && (
                <div className="px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-full">
                  FEATURED
                </div>
              )}
            </label>
          </div>
        </div>
      </div>

      {/* Color Variations - Only for saved products */}
      {!isNew && product && (
        <div>
          <ColorVariationsManager 
            productId={product.id} 
            categoryId={formData.category_id}
            productType={formData.product_type}
          />
        </div>
      )}

      {/* Submit */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-2xl shadow-2xl p-8 border border-gray-700">
        <div className="flex flex-col sm:flex-row gap-4">
          <Button 
            type="submit" 
            isLoading={saving} 
            size="lg"
            className="flex-1 text-lg py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all"
          >
            {isNew ? (
              <>
                <svg className="w-6 h-6 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Product
              </>
            ) : (
              <>
                <svg className="w-6 h-6 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Update Product
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => router.push('/products')}
            className="px-8 py-4 text-lg border-2 border-gray-400 rounded-xl hover:bg-gray-700 hover:border-gray-500 font-semibold transition-all text-white"
          >
            Cancel
          </Button>
        </div>
      </div>
    </form>
  );
}


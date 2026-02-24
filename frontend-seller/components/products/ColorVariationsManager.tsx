'use client';

import { useState, useEffect, useRef } from 'react';
import { productService, type ProductVariant, type CreateVariantData } from '@/services/product-service';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Image from 'next/image';
import Alert from '@/components/ui/Alert';
import apiClient from '@/lib/api-client';

interface ColorVariationsManagerProps {
  productId: number;
  categoryId?: number;
  productType?: string;
}

export default function ColorVariationsManager({ productId, categoryId, productType }: ColorVariationsManagerProps) {
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<CreateVariantData>({
    color_name: '',
    color_code: '',
    images: [],
    price: undefined,
    stock_quantity: 0,
    stock_status: 'in_stock',
    is_default: false,
    sort_order: 0,
  });

  // Check if this is an eye product (frame or sunglasses) based on product type
  // Also check category IDs as fallback for legacy products
  const isEyeProduct = productType === 'frame' || productType === 'sunglasses' || 
    (categoryId && [23, 28, 29].includes(categoryId));

  useEffect(() => {
    if (productId && isEyeProduct) {
      loadVariants();
    }
  }, [productId, isEyeProduct]);

  const loadVariants = async () => {
    try {
      setLoading(true);
      const data = await productService.getVariants(productId);
      setVariants(data);
    } catch (error) {
      console.error('Failed to load variants:', error);
      setAlert({ type: 'error', message: 'Failed to load color variations' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddImage = () => {
    const url = prompt('Enter image URL:');
    if (url && url.trim()) {
      setFormData({
        ...formData,
        images: [...(formData.images || []), url.trim()],
      });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setAlert({ type: 'error', message: 'Please select an image file' });
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setAlert({ type: 'error', message: 'Image size must be less than 5MB' });
      return;
    }

    setUploadingImage(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('image', file);

      const response = await apiClient.post('/seller/products/upload-image', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success && response.data.data?.url) {
        const imageUrl = response.data.data.url.startsWith('http')
          ? response.data.data.url
          : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${response.data.data.url}`;
        
        setFormData({
          ...formData,
          images: [...(formData.images || []), imageUrl],
        });
        setAlert({ type: 'success', message: 'Image uploaded successfully' });
      } else {
        throw new Error('Upload failed');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      setAlert({
        type: 'error',
        message: error.response?.data?.message || 'Failed to upload image',
      });
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = (index: number) => {
    setFormData({
      ...formData,
      images: formData.images?.filter((_, i) => i !== index) || [],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingVariant) {
        await productService.updateVariant(editingVariant.id, formData);
        setAlert({ type: 'success', message: 'Color variation updated successfully' });
      } else {
        await productService.createVariant(productId, formData);
        setAlert({ type: 'success', message: 'Color variation created successfully' });
      }
      setShowForm(false);
      setEditingVariant(null);
      resetForm();
      loadVariants();
    } catch (error: any) {
      setAlert({ type: 'error', message: error.response?.data?.message || 'Failed to save color variation' });
    }
  };

  const handleEdit = (variant: ProductVariant) => {
    setEditingVariant(variant);
    setFormData({
      color_name: variant.color_name,
      color_code: variant.color_code || '',
      images: variant.images || [],
      price: variant.price,
      stock_quantity: variant.stock_quantity,
      stock_status: variant.stock_status,
      is_default: variant.is_default,
      sort_order: variant.sort_order,
    });
    setShowForm(true);
  };

  const handleDelete = async (variantId: number) => {
    if (!confirm('Are you sure you want to delete this color variation?')) {
      return;
    }
    try {
      await productService.deleteVariant(variantId);
      setAlert({ type: 'success', message: 'Color variation deleted successfully' });
      loadVariants();
    } catch (error: any) {
      setAlert({ type: 'error', message: error.response?.data?.message || 'Failed to delete color variation' });
    }
  };

  const handleSetDefault = async (variantId: number) => {
    try {
      await productService.setDefaultVariant(variantId);
      setAlert({ type: 'success', message: 'Default color variation updated' });
      loadVariants();
    } catch (error: any) {
      setAlert({ type: 'error', message: error.response?.data?.message || 'Failed to set default variant' });
    }
  };

  const resetForm = () => {
    setFormData({
      color_name: '',
      color_code: '',
      images: [],
      price: undefined,
      stock_quantity: 0,
      stock_status: 'in_stock',
      is_default: false,
      sort_order: 0,
    });
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingVariant(null);
    resetForm();
  };

  if (!isEyeProduct) {
    return null; // Don't show for non-eye products
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <p className="text-gray-600">Loading color variations...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
      {alert && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Color Variations</h3>
          <p className="text-sm text-gray-600 mt-1">
            Add different color options for this product with separate images, prices, and stock
          </p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} size="sm">
            Add Color Variation
          </Button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-4 border-t border-gray-200 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Color Name"
              value={formData.color_name}
              onChange={(e) => setFormData({ ...formData, color_name: e.target.value })}
              required
            />
            <Input
              label="Color Code (Hex)"
              value={formData.color_code}
              onChange={(e) => setFormData({ ...formData, color_code: e.target.value })}
              placeholder="#000000"
              pattern="^#[0-9A-Fa-f]{6}$"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Price (optional, uses product price if empty)"
              type="number"
              step="0.01"
              min="0"
              value={formData.price || ''}
              onChange={(e) => setFormData({ ...formData, price: e.target.value ? parseFloat(e.target.value) : undefined })}
            />
            <Input
              label="Stock Quantity"
              type="number"
              min="0"
              value={formData.stock_quantity}
              onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) || 0 })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stock Status
            </label>
            <select
              value={formData.stock_status}
              onChange={(e) => setFormData({ ...formData, stock_status: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0066CC] focus:border-[#0066CC]"
            >
              <option value="in_stock">In Stock</option>
              <option value="out_of_stock">Out of Stock</option>
              <option value="backorder">Backorder</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Images
            </label>
            <div className="space-y-2">
              {formData.images?.map((image, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="relative w-16 h-16 rounded border border-gray-200 overflow-hidden">
                    <Image src={image} alt={`Image ${index + 1}`} fill className="object-cover" />
                  </div>
                  <Input value={image} readOnly className="flex-1" />
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => handleRemoveImage(index)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploadingImage}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                >
                  {uploadingImage ? 'Uploading...' : 'Upload Image'}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={handleAddImage}>
                  Add Image URL
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_default}
                onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                className="w-4 h-4 text-[#0066CC] border-gray-300 rounded focus:ring-[#0066CC]"
              />
              <span className="text-sm text-gray-700">Set as default variant</span>
            </label>
            <Input
              label="Sort Order"
              type="number"
              min="0"
              value={formData.sort_order}
              onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
              className="w-24"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" size="sm">
              {editingVariant ? 'Update' : 'Create'} Variation
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {variants.length > 0 && (
        <div className="border-t border-gray-200 pt-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-4">Existing Variations ({variants.length})</h4>
          <div className="space-y-4">
            {variants.map((variant) => (
              <div
                key={variant.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div
                      className="w-12 h-12 rounded-lg border-2 border-gray-300"
                      style={{ backgroundColor: variant.color_code || '#ccc' }}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h5 className="font-semibold text-gray-900">{variant.color_name}</h5>
                        {variant.is_default && (
                          <span className="px-2 py-0.5 text-xs font-semibold bg-[#0066CC] text-white rounded">
                            Default
                          </span>
                        )}
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                          variant.stock_status === 'in_stock'
                            ? 'bg-green-100 text-green-700'
                            : variant.stock_status === 'out_of_stock'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {variant.stock_status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        Price: €{variant.price ? variant.price.toFixed(2) : 'Product price'} | 
                        Stock: {variant.stock_quantity} | 
                        Images: {variant.images?.length || 0}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!variant.is_default && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetDefault(variant.id)}
                      >
                        Set Default
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => handleEdit(variant)}>
                      Edit
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => handleDelete(variant.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
                {variant.images && variant.images.length > 0 && (
                  <div className="flex gap-2 mt-4">
                    {variant.images.slice(0, 4).map((image, index) => (
                      <div key={index} className="relative w-16 h-16 rounded border border-gray-200 overflow-hidden">
                        <Image src={image} alt={`${variant.color_name} ${index + 1}`} fill className="object-cover" />
                      </div>
                    ))}
                    {variant.images.length > 4 && (
                      <div className="w-16 h-16 rounded border border-gray-200 flex items-center justify-center text-xs text-gray-500">
                        +{variant.images.length - 4}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {variants.length === 0 && !showForm && (
        <div className="text-center py-8 border-t border-gray-200">
          <p className="text-gray-600 mb-4">No color variations added yet</p>
          <Button onClick={() => setShowForm(true)} size="sm">
            Add First Color Variation
          </Button>
        </div>
      )}
    </div>
  );
}


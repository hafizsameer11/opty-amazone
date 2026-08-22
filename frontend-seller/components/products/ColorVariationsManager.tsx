'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  productService,
  type CreateVariantData,
  type ProductVariant,
} from '@/services/product-service';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Alert from '@/components/ui/Alert';
import apiClient, { getAxiosErrorMessage } from '@/lib/api-client';
import { resolveMediaUrl } from '@/lib/media-url';
import FrameSizesEditor from '@/components/products/FrameSizesEditor';

interface ColorVariationsManagerProps {
  productId: number;
  categoryId?: number;
  productType?: string;
}

interface DraftSizeRow {
  key: string;
  size_text: string;
  stock_quantity: number;
  stock_status: 'in_stock' | 'out_of_stock' | 'backorder';
}

function parseSizeText(text: string): { lens_width: number; bridge_width: number; temple_length: number; size_label: string } | null {
  const cleaned = text.trim().replace(/\s+/g, '');
  const m = cleaned.match(/^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/);
  if (!m) return null;
  return {
    lens_width: Number(m[1]),
    bridge_width: Number(m[2]),
    temple_length: Number(m[3]),
    size_label: `${m[1]}-${m[2]}-${m[3]}`,
  };
}

function emptyDraftSize(): DraftSizeRow {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    size_text: '',
    stock_quantity: 0,
    stock_status: 'in_stock',
  };
}

export default function ColorVariationsManager({ productId, categoryId, productType }: ColorVariationsManagerProps) {
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draftSizes, setDraftSizes] = useState<DraftSizeRow[]>([emptyDraftSize()]);
  const [formData, setFormData] = useState<CreateVariantData>({
    color_name: '',
    color_code: '#000000',
    images: [],
    price: undefined,
    stock_quantity: 0,
    stock_status: 'in_stock',
    is_default: false,
    sort_order: 0,
  });

  const isEyeProduct =
    productType === 'frame' ||
    productType === 'sunglasses' ||
    (categoryId != null && [1, 4, 23, 28, 29].includes(categoryId));

  const autoStock = useMemo(
    () => draftSizes.reduce((sum, row) => sum + Math.max(0, Number(row.stock_quantity) || 0), 0),
    [draftSizes]
  );

  const autoStatus: CreateVariantData['stock_status'] = autoStock > 0 ? 'in_stock' : 'out_of_stock';

  useEffect(() => {
    if (productId && isEyeProduct) {
      void loadVariants();
    }
  }, [productId, isEyeProduct]);

  const loadVariants = async () => {
    try {
      setLoading(true);
      const data = await productService.getVariants(productId);
      setVariants(
        data.map((v) => ({
          ...v,
          images: (v.images || []).map((u) => resolveMediaUrl(u)),
          price: v.price != null ? Number(v.price) : undefined,
        }))
      );
    } catch {
      setAlert({ type: 'error', message: 'Failed to load color variations' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddImageUrl = () => {
    const url = prompt('Enter image URL:');
    if (!url?.trim()) return;
    setFormData((prev) => ({
      ...prev,
      images: [...(prev.images || []), resolveMediaUrl(url.trim())],
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setAlert({ type: 'error', message: 'Please select an image file' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAlert({ type: 'error', message: 'Image size must be less than 5MB' });
      return;
    }

    setUploadingImage(true);
    try {
      const body = new FormData();
      body.append('image', file);
      const response = await apiClient.post('/seller/products/upload-image', body);
      const raw = response.data?.data?.url as string | undefined;
      if (!response.data?.success || !raw) throw new Error('Upload failed');
      const imageUrl = resolveMediaUrl(raw);
      setFormData((prev) => ({
        ...prev,
        images: [...(prev.images || []), imageUrl],
      }));
      setAlert({ type: 'success', message: 'Image uploaded successfully' });
    } catch (error: unknown) {
      setAlert({ type: 'error', message: getAxiosErrorMessage(error) || 'Failed to upload image' });
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images?.filter((_, i) => i !== index) || [],
    }));
  };

  const resetForm = () => {
    setFormData({
      color_name: '',
      color_code: '#000000',
      images: [],
      price: undefined,
      stock_quantity: 0,
      stock_status: 'in_stock',
      is_default: false,
      sort_order: 0,
    });
    setDraftSizes([emptyDraftSize()]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setAlert(null);

    const colorCode = (formData.color_code || '').trim();
    if (colorCode && !/^#[0-9A-Fa-f]{6}$/.test(colorCode)) {
      setAlert({ type: 'error', message: 'Color code must be a hex value like #000000' });
      setSaving(false);
      return;
    }

    const parsedSizes: Array<{
      lens_width: number;
      bridge_width: number;
      temple_length: number;
      size_label: string;
      stock_quantity: number;
      stock_status: DraftSizeRow['stock_status'];
    }> = [];

    if (!editingVariant) {
      for (const row of draftSizes) {
        if (!row.size_text.trim() && row.stock_quantity === 0) continue;
        const parsed = parseSizeText(row.size_text);
        if (!parsed) {
          setAlert({
            type: 'error',
            message: `Invalid size "${row.size_text || '(empty)'}". Use format 52-18-140`,
          });
          setSaving(false);
          return;
        }
        parsedSizes.push({
          ...parsed,
          stock_quantity: Math.max(0, Number(row.stock_quantity) || 0),
          stock_status: row.stock_status,
        });
      }
    }

    const payload: CreateVariantData & { sizes?: typeof parsedSizes } = {
      color_name: formData.color_name.trim(),
      color_code: colorCode || undefined,
      images: (formData.images || []).map((u) => resolveMediaUrl(u)),
      price: formData.price,
      stock_quantity: editingVariant ? formData.stock_quantity : autoStock,
      stock_status: editingVariant ? formData.stock_status : autoStatus,
      is_default: formData.is_default,
      sort_order: formData.sort_order,
    };

    if (!editingVariant && parsedSizes.length > 0) {
      payload.sizes = parsedSizes;
    }

    try {
      if (editingVariant) {
        await productService.updateVariant(editingVariant.id, payload);
        setAlert({ type: 'success', message: 'Color variation updated successfully' });
      } else {
        await productService.createVariant(productId, payload);
        setAlert({ type: 'success', message: 'Color variation created successfully' });
      }
      setShowForm(false);
      setEditingVariant(null);
      resetForm();
      await loadVariants();
    } catch (error: unknown) {
      setAlert({ type: 'error', message: getAxiosErrorMessage(error) || 'Failed to save color variation' });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (variant: ProductVariant) => {
    setEditingVariant(variant);
    setFormData({
      color_name: variant.color_name,
      color_code: variant.color_code || '#000000',
      images: (variant.images || []).map((u) => resolveMediaUrl(u)),
      price: variant.price != null ? Number(variant.price) : undefined,
      stock_quantity: Number(variant.stock_quantity) || 0,
      stock_status: variant.stock_status,
      is_default: variant.is_default,
      sort_order: variant.sort_order,
    });
    setDraftSizes([emptyDraftSize()]);
    setShowForm(true);
  };

  const handleDelete = async (variantId: number) => {
    if (!confirm('Are you sure you want to delete this color variation?')) return;
    try {
      await productService.deleteVariant(variantId);
      setAlert({ type: 'success', message: 'Color variation deleted successfully' });
      await loadVariants();
    } catch (error: unknown) {
      setAlert({ type: 'error', message: getAxiosErrorMessage(error) || 'Failed to delete color variation' });
    }
  };

  const handleSetDefault = async (variantId: number) => {
    try {
      await productService.setDefaultVariant(variantId);
      setAlert({ type: 'success', message: 'Default color variation updated' });
      await loadVariants();
    } catch (error: unknown) {
      setAlert({ type: 'error', message: getAxiosErrorMessage(error) || 'Failed to set default variant' });
    }
  };

  if (!isEyeProduct) return null;

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
        <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
      )}

      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Color Variations</h3>
          <p className="text-sm text-gray-600 mt-1">
            Add different color options with images, stock, and sizes per color. Price stays the same for all colors.
          </p>
        </div>
        {!showForm && (
          <Button onClick={() => { resetForm(); setEditingVariant(null); setShowForm(true); }} size="sm">
            Add Color Variation
          </Button>
        )}
      </div>

      {showForm && (
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 border-t border-gray-200 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Color Name"
              value={formData.color_name}
              onChange={(e) => setFormData((prev) => ({ ...prev, color_name: e.target.value }))}
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Color Code (Hex)</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={/^#[0-9A-Fa-f]{6}$/.test(formData.color_code || '') ? formData.color_code! : '#000000'}
                  onChange={(e) => setFormData((prev) => ({ ...prev, color_code: e.target.value }))}
                  className="h-11 w-14 rounded border border-gray-300 cursor-pointer"
                  aria-label="Pick color"
                />
                <Input
                  value={formData.color_code || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, color_code: e.target.value }))}
                  placeholder="#000000"
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Input
                label="Stock Quantity (Auto)"
                type="number"
                min={0}
                value={editingVariant ? formData.stock_quantity : autoStock}
                readOnly={!editingVariant}
                disabled={!editingVariant}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, stock_quantity: parseInt(e.target.value, 10) || 0 }))
                }
              />
              <p className="text-xs text-gray-500 mt-1">
                {editingVariant
                  ? 'Totals sync from sizes below when you add/edit sizes for this color.'
                  : 'Total stock is auto calculated from all sizes below.'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Stock Status (Auto)</label>
              <select
                value={editingVariant ? formData.stock_status : autoStatus}
                disabled={!editingVariant}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    stock_status: e.target.value as CreateVariantData['stock_status'],
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
              >
                <option value="in_stock">In Stock</option>
                <option value="out_of_stock">Out of Stock</option>
                <option value="backorder">Backorder</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Automatically updates based on total stock.</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Images</label>
            <div className="flex flex-wrap gap-3 mb-3">
              {formData.images?.map((image, index) => {
                const src = resolveMediaUrl(image);
                return (
                  <div key={`${src}-${index}`} className="relative w-20 h-20 rounded-lg border border-gray-200 overflow-hidden bg-gray-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`Variation ${index + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs leading-5"
                      aria-label="Remove image"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 text-gray-500 text-xs flex items-center justify-center hover:border-[#0066CC] hover:text-[#0066CC]"
              >
                {uploadingImage ? '…' : '+ Upload'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-2">First image will be used as the variation image.</p>
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => void handleFileUpload(e)}
                className="hidden"
                disabled={uploadingImage}
              />
              <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploadingImage}>
                {uploadingImage ? 'Uploading…' : 'Upload Image'}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={handleAddImageUrl}>
                Add Image URL
              </Button>
            </div>
          </div>

          {!editingVariant && (
            <div className="border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">Sizes &amp; Stock for this Color</h4>
                  <p className="text-xs text-gray-500">Only sizes with stock &gt; 0 will show on the storefront for this color.</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setDraftSizes((prev) => [...prev, emptyDraftSize()])}
                >
                  + Add Size
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="py-2 pr-2 font-medium">Size (Example: 52-18-140)</th>
                      <th className="py-2 pr-2 font-medium">Stock Quantity</th>
                      <th className="py-2 pr-2 font-medium">Status</th>
                      <th className="py-2 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {draftSizes.map((row, index) => (
                      <tr key={row.key} className="border-b border-gray-100">
                        <td className="py-2 pr-2">
                          <input
                            value={row.size_text}
                            onChange={(e) => {
                              const next = [...draftSizes];
                              next[index] = { ...row, size_text: e.target.value };
                              setDraftSizes(next);
                            }}
                            placeholder="52-18-140"
                            className="w-full px-2 py-1.5 border border-gray-300 rounded-md"
                            required={draftSizes.length === 1 || row.stock_quantity > 0}
                          />
                        </td>
                        <td className="py-2 pr-2">
                          <input
                            type="number"
                            min={0}
                            value={row.stock_quantity}
                            onChange={(e) => {
                              const next = [...draftSizes];
                              next[index] = {
                                ...row,
                                stock_quantity: Math.max(0, parseInt(e.target.value, 10) || 0),
                              };
                              setDraftSizes(next);
                            }}
                            className="w-24 px-2 py-1.5 border border-gray-300 rounded-md"
                          />
                        </td>
                        <td className="py-2 pr-2">
                          <select
                            value={row.stock_status}
                            onChange={(e) => {
                              const next = [...draftSizes];
                              next[index] = {
                                ...row,
                                stock_status: e.target.value as DraftSizeRow['stock_status'],
                              };
                              setDraftSizes(next);
                            }}
                            className="px-2 py-1.5 border border-gray-300 rounded-md"
                          >
                            <option value="in_stock">In Stock</option>
                            <option value="out_of_stock">Out of Stock</option>
                            <option value="backorder">Backorder</option>
                          </select>
                        </td>
                        <td className="py-2">
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            onClick={() =>
                              setDraftSizes((prev) =>
                                prev.length <= 1 ? [emptyDraftSize()] : prev.filter((_, i) => i !== index)
                              )
                            }
                          >
                            Remove
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_default}
                onChange={(e) => setFormData((prev) => ({ ...prev, is_default: e.target.checked }))}
                className="w-4 h-4 text-[#0066CC] border-gray-300 rounded focus:ring-[#0066CC]"
              />
              <span className="text-sm text-gray-700">Set as default variant</span>
            </label>
            <Input
              label="Sort Order"
              type="number"
              min={0}
              value={formData.sort_order}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, sort_order: parseInt(e.target.value, 10) || 0 }))
              }
              className="w-24"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? 'Saving…' : editingVariant ? 'Update Variation' : 'Create Variation'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setShowForm(false);
                setEditingVariant(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {variants.length > 0 && (
        <div className="border-t border-gray-200 pt-6 space-y-4">
          <h4 className="text-sm font-semibold text-gray-900">Existing Variations ({variants.length})</h4>
          {variants.map((variant) => (
            <div key={variant.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div
                    className="w-12 h-12 rounded-lg border-2 border-gray-300 shrink-0"
                    style={{ backgroundColor: variant.color_code || '#ccc' }}
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h5 className="font-semibold text-gray-900">{variant.color_name}</h5>
                      {variant.is_default && (
                        <span className="px-2 py-0.5 text-xs font-semibold bg-[#0066CC] text-white rounded">
                          Default
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 text-xs font-semibold rounded ${
                          variant.stock_status === 'in_stock'
                            ? 'bg-green-100 text-green-700'
                            : variant.stock_status === 'out_of_stock'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {String(variant.stock_status).replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Stock: {variant.stock_quantity} | Images: {variant.images?.length || 0}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {!variant.is_default && (
                    <Button variant="outline" size="sm" onClick={() => void handleSetDefault(variant.id)}>
                      Set Default
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => handleEdit(variant)}>
                    Edit
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => void handleDelete(variant.id)}>
                    Delete
                  </Button>
                </div>
              </div>

              {variant.images && variant.images.length > 0 && (
                <div className="flex gap-2 mt-4">
                  {variant.images.slice(0, 4).map((image, index) => (
                    <div key={index} className="relative w-16 h-16 rounded border border-gray-200 overflow-hidden bg-gray-50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={resolveMediaUrl(image)}
                        alt={`${variant.color_name} ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4">
                <FrameSizesEditor
                  productId={productId}
                  productVariantId={variant.id}
                  compact
                  title={`Sizes & Stock for ${variant.color_name}`}
                  description="Add/remove sizes with stock for this color only. Total color stock updates automatically."
                  onChanged={() => void loadVariants()}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {variants.length === 0 && !showForm && (
        <div className="border-t border-gray-200 pt-6 text-center py-6">
          <p className="text-gray-600 mb-2">No color variations added yet</p>
          <p className="text-sm text-gray-500 mb-4">
            Add a color first, then set sizes and stock inside that color (for eyeglasses and sunglasses).
          </p>
          <Button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            size="sm"
          >
            Add First Color Variation
          </Button>
        </div>
      )}
    </div>
  );
}

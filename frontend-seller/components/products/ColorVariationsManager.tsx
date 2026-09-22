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
import { useLanguage } from '@/contexts/LanguageContext';

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

/** Free-text size (e.g. "12mm", "Medium", or still "52-18-140"). Dimensions optional. */
function normalizeSizeRow(text: string): {
  lens_width: number;
  bridge_width: number;
  temple_length: number;
  size_label: string;
} | null {
  const label = text.trim();
  if (!label) return null;
  const compact = label.replace(/\s+/g, '');
  const m = compact.match(/^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/);
  if (m) {
    return {
      lens_width: Number(m[1]),
      bridge_width: Number(m[2]),
      temple_length: Number(m[3]),
      size_label: label,
    };
  }
  return {
    lens_width: 0,
    bridge_width: 0,
    temple_length: 0,
    size_label: label,
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
  const { t } = useLanguage();
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

  const stockStatusLabel = (stockStatus: string) => {
    const labels: Record<string, string> = {
      in_stock: t('form.inStock'),
      out_of_stock: t('form.outOfStock'),
      backorder: t('form.backorder'),
    };
    return labels[stockStatus] ?? stockStatus.replaceAll('_', ' ');
  };

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
      setAlert({ type: 'error', message: t('form.loadColorVariationsFailed') });
    } finally {
      setLoading(false);
    }
  };

  const handleAddImageUrl = () => {
    const url = prompt(t('form.enterImageUrl'));
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
      setAlert({ type: 'error', message: t('form.selectImageFile') });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAlert({ type: 'error', message: t('form.imageUnder5Mb') });
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
       setAlert({ type: 'success', message: t('form.imageUploaded') });
    } catch (error: unknown) {
      setAlert({ type: 'error', message: getAxiosErrorMessage(error) || t('form.uploadImageFailed') });
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

  const handleSubmit = async () => {
    setSaving(true);
    setAlert(null);

    const colorName = formData.color_name.trim();
    if (!colorName) {
      setAlert({ type: 'error', message: t('form.enterColorName') });
      setSaving(false);
      return;
    }

    const colorCode = (formData.color_code || '').trim();
    if (colorCode && !/^#[0-9A-Fa-f]{6}$/.test(colorCode)) {
      setAlert({ type: 'error', message: t('form.colorCodeHex') });
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
        const parsed = normalizeSizeRow(row.size_text);
        if (!parsed) {
          setAlert({
            type: 'error',
            message: t('form.enterSizeWithExamples'),
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
      if (parsedSizes.length === 0) {
        setAlert({
          type: 'error',
          message: t('form.addColorSize'),
        });
        setSaving(false);
        return;
      }
    }

    const payload: CreateVariantData & { sizes?: typeof parsedSizes } = {
      color_name: colorName,
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
        setAlert({ type: 'success', message: t('form.colorVariationUpdated') });
      } else {
        await productService.createVariant(productId, payload);
        setAlert({ type: 'success', message: t('form.colorVariationCreated') });
      }
      setShowForm(false);
      setEditingVariant(null);
      resetForm();
      await loadVariants();
    } catch (error: unknown) {
      setAlert({ type: 'error', message: getAxiosErrorMessage(error) || t('form.saveColorVariationFailed') });
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
    if (!confirm(t('form.deleteColorVariation'))) return;
    try {
      await productService.deleteVariant(variantId);
      setAlert({ type: 'success', message: t('form.colorVariationDeleted') });
      await loadVariants();
    } catch (error: unknown) {
      setAlert({ type: 'error', message: getAxiosErrorMessage(error) || t('form.deleteColorVariationFailed') });
    }
  };

  const handleSetDefault = async (variantId: number) => {
    try {
      await productService.setDefaultVariant(variantId);
      setAlert({ type: 'success', message: t('form.defaultColorVariationUpdated') });
      await loadVariants();
    } catch (error: unknown) {
      setAlert({ type: 'error', message: getAxiosErrorMessage(error) || t('form.setDefaultVariantFailed') });
    }
  };

  if (!isEyeProduct) return null;

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <p className="text-gray-600">{t('common.loading')}</p>
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
          <h3 className="text-lg font-semibold text-gray-900">{t('form.colorVariations')}</h3>
          <p className="text-sm text-gray-600 mt-1">
             {t('form.colorVariationsDescription')}
          </p>
        </div>
        {!showForm && (
          <Button onClick={() => { resetForm(); setEditingVariant(null); setShowForm(true); }} size="sm">
            {t('form.addColorVariation')}
          </Button>
        )}
      </div>

      {showForm && (
        <div
          className="space-y-4 border-t border-gray-200 pt-6"
          onKeyDown={(e) => {
            // Nested inside product <form> — block Enter from submitting the product
            if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
              e.preventDefault();
            }
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={t('form.colorName')}
              value={formData.color_name}
              onChange={(e) => setFormData((prev) => ({ ...prev, color_name: e.target.value }))}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('form.colorCode')}</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={/^#[0-9A-Fa-f]{6}$/.test(formData.color_code || '') ? formData.color_code! : '#000000'}
                  onChange={(e) => setFormData((prev) => ({ ...prev, color_code: e.target.value }))}
                  className="h-11 w-14 rounded border border-gray-300 cursor-pointer"
                  aria-label={t('form.pickColor')}
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
                label={t('form.stockAuto')}
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
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('form.stockStatus')}</label>
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
                <option value="in_stock">{t('form.inStock')}</option>
                <option value="out_of_stock">{t('form.outOfStock')}</option>
                <option value="backorder">{t('form.backorder')}</option>
              </select>
            <p className="text-xs text-gray-500 mt-1">{t('form.automaticStockHint')}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('form.imagesLabel')}</label>
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
                      aria-label={t('form.removeImage')}
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
                {uploadingImage ? '…' : `+ ${t('form.upload')}`}
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-2">{t('form.firstVariationImageHint')}</p>
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
                {uploadingImage ? t('form.uploading') : t('form.uploadImage')}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={handleAddImageUrl}>
                {t('form.addUrl')}
              </Button>
            </div>
          </div>

          {!editingVariant && (
            <div className="border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">{t('form.sizesStockForColor')}</h4>
                  <p className="text-xs text-gray-500">{t('form.sizesStockDescription')}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setDraftSizes((prev) => [...prev, emptyDraftSize()])}
                >
                  {t('form.addSize')}
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                          <th className="py-2 pr-2 font-medium">{t('form.sizeAnyText')}</th>
                          <th className="py-2 pr-2 font-medium">{t('form.stock')}</th>
                          <th className="py-2 pr-2 font-medium">{t('common.status')}</th>
                          <th className="py-2 font-medium">{t('form.action')}</th>
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
                            placeholder="12mm / Medium / 52-18-140"
                            className="w-full px-2 py-1.5 border border-gray-300 rounded-md"
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
                            <option value="in_stock">{t('form.inStock')}</option>
                            <option value="out_of_stock">{t('form.outOfStock')}</option>
                            <option value="backorder">{t('form.backorder')}</option>
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
                            {t('form.remove')}
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
               <span className="text-sm text-gray-700">{t('form.setDefaultVariant')}</span>
            </label>
            <Input
              label={t('form.sortOrder')}
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
            <Button type="button" size="sm" disabled={saving} onClick={() => void handleSubmit()}>
              {saving ? t('common.saving') : editingVariant ? t('form.updateVariation') : t('form.createVariation')}
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
              {t('form.cancel')}
            </Button>
          </div>
        </div>
      )}

      {variants.length > 0 && (
        <div className="border-t border-gray-200 pt-6 space-y-4">
           <h4 className="text-sm font-semibold text-gray-900">{t('form.existingVariations')} ({variants.length})</h4>
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
                          {t('form.defaultFrameColor')}
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
                        {stockStatusLabel(String(variant.stock_status))}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {t('form.stock')}: {variant.stock_quantity} | {t('form.imagesLabel')}: {variant.images?.length || 0}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {!variant.is_default && (
                    <Button variant="outline" size="sm" onClick={() => void handleSetDefault(variant.id)}>
                       {t('form.setDefault')}
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => handleEdit(variant)}>
                     {t('form.edit')}
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => void handleDelete(variant.id)}>
                     {t('form.delete')}
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
                  title={`${t('form.sizesStockForColor')}: ${variant.color_name}`}
                  description={t('form.sizesStockDescription')}
                  onChanged={() => void loadVariants()}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {variants.length === 0 && !showForm && (
        <div className="border-t border-gray-200 pt-6 text-center py-6">
           <p className="text-gray-600 mb-2">{t('form.noColorVariations')}</p>
          <p className="text-sm text-gray-500 mb-4">
            {t('form.addColorFirstHint')}
          </p>
          <Button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            size="sm"
          >
            {t('form.addFirstColorVariation')}
          </Button>
        </div>
      )}
    </div>
  );
}

'use client';

import { useRef, useState } from 'react';
import type { CreateProductData, EyeHygieneVariantRow, ProductSizeVolumeVariant } from '@/services/product-service';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import apiClient, { getApiOrigin } from '@/lib/api-client';
import { useLanguage } from '@/contexts/LanguageContext';

function displayImageUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
  if (url.startsWith('/storage')) return `${getApiOrigin()}${url}`;
  return url;
}

function expiryToInputValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const s = String(iso);
  return s.length >= 10 ? s.slice(0, 10) : '';
}

function inputDateToIso(dateStr: string): string | null {
  if (!dateStr || dateStr.length < 10) return null;
  return `${dateStr}T00:00:00.000Z`;
}

const defaultSizeRow = (sort: number): ProductSizeVolumeVariant => ({
  size_volume: '',
  pack_type: null,
  price: 0,
  compare_at_price: null,
  cost_price: null,
  stock_quantity: 0,
  stock_status: 'in_stock',
  sku: null,
  expiry_date: null,
  image_url: null,
  is_active: true,
  sort_order: sort,
});

const defaultNamedRow = (sort: number): EyeHygieneVariantRow => ({
  name: '',
  description: null,
  price: 0,
  image_url: null,
  is_active: true,
  sort_order: sort,
});

interface EyeHygieneVariantsEditorProps {
  formData: CreateProductData;
  setFormData: (data: CreateProductData | ((prev: CreateProductData) => CreateProductData)) => void;
  compact?: boolean;
}

export default function EyeHygieneVariantsEditor({
  formData,
  setFormData,
  compact = false,
}: EyeHygieneVariantsEditorProps) {
  const { t } = useLanguage();
  const sizeVolumes = formData.size_volume_variants ?? [];
  const named = formData.eye_hygiene_variants ?? [];
  const [uploading, setUploading] = useState<'size' | 'named' | null>(null);
  const [uploadKey, setUploadKey] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const pendingUploadRef = useRef<{ kind: 'size' | 'named'; index: number } | null>(null);

  const patchSizes = (next: ProductSizeVolumeVariant[]) => {
    setFormData((prev) => ({ ...prev, size_volume_variants: next }));
  };

  const patchNamed = (next: EyeHygieneVariantRow[]) => {
    setFormData((prev) => ({ ...prev, eye_hygiene_variants: next }));
  };

  const triggerUpload = (kind: 'size' | 'named', index: number) => {
    pendingUploadRef.current = { kind, index };
    fileRef.current?.click();
  };

  const handleFile = async (files: FileList | null) => {
    const pending = pendingUploadRef.current;
    pendingUploadRef.current = null;
    if (!pending || !files?.length) return;

    const valid = Array.from(files).filter((file) => {
      if (!file.type.startsWith('image/')) {
        window.alert(`${file.name}: ${t('form.notImageFile')}`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        window.alert(`${file.name}: ${t('form.fileExceeds5Mb')}`);
        return false;
      }
      return true;
    });
    if (!valid.length) return;

    const key = `${pending.kind}-${pending.index}`;
    setUploading(pending.kind);
    setUploadKey(key);
    try {
      const file = valid[0];
      const fd = new FormData();
      fd.append('image', file);
      const response = await apiClient.post<{ success: boolean; data?: { url?: string } }>(
        '/seller/products/upload-image',
        fd
      );
      const rawUrl = response.data.success && response.data.data?.url ? response.data.data.url : null;
      if (!rawUrl) throw new Error('Upload failed');

      if (pending.kind === 'size') {
        const next = [...sizeVolumes];
        const row = { ...next[pending.index] };
        row.image_url = rawUrl;
        next[pending.index] = row;
        patchSizes(next);
      } else {
        const next = [...named];
        const row = { ...next[pending.index] };
        row.image_url = rawUrl;
        next[pending.index] = row;
        patchNamed(next);
      }
    } catch (e) {
      console.error(e);
      window.alert(t('form.imageUploadFailed'));
    } finally {
      setUploading(null);
      setUploadKey(null);
    }
  };

  const titleCls = compact ? 'text-sm font-semibold text-gray-900' : 'text-base font-semibold text-gray-900';
  const subCls = compact ? 'text-xs text-gray-500 mb-2' : 'text-sm text-gray-600 mb-3';
  const boxCls = compact
    ? 'rounded-lg border border-emerald-100 bg-emerald-50/40 p-3 space-y-3'
    : 'rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-teal-50/40 p-4 space-y-4';

  return (
    <div className="space-y-6">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files)}
      />

      <div className={boxCls}>
        <div>
          <h3 className={titleCls}>{t('form.sizePackVariants')}</h3>
          <p className={subCls}>{t('form.sizePackDescription')}</p>
        </div>

        {sizeVolumes.length === 0 ? (
          <p className="text-xs text-gray-500">{t('form.noVariants')}</p>
        ) : (
          <div className="space-y-3">
            {sizeVolumes.map((row, index) => (
              <div
                key={row.id ?? `new-sv-${index}`}
                className="rounded-lg border border-white/80 bg-white/90 p-3 shadow-sm space-y-2"
              >
                <div className="flex flex-wrap gap-2 items-end">
                  <div className="min-w-[100px] flex-1">
                    <Input
                      label="Size / volume *"
                      value={row.size_volume}
                      onChange={(e) => {
                        const next = [...sizeVolumes];
                        next[index] = { ...row, size_volume: e.target.value };
                        patchSizes(next);
                      }}
                      placeholder="10ml"
                      className={compact ? 'text-sm' : ''}
                    />
                  </div>
                  <div className="min-w-[100px] flex-1">
                    <Input
                      label="Pack type"
                      value={row.pack_type ?? ''}
                      onChange={(e) => {
                        const next = [...sizeVolumes];
                        next[index] = {
                          ...row,
                          pack_type: e.target.value === '' ? null : e.target.value,
                        };
                        patchSizes(next);
                      }}
                      placeholder="Single"
                      className={compact ? 'text-sm' : ''}
                    />
                  </div>
                  <div className="w-[100px]">
                    <Input
                      label="Price *"
                      type="number"
                      step="0.01"
                      min="0"
                      value={row.price}
                      onChange={(e) => {
                        const next = [...sizeVolumes];
                        next[index] = { ...row, price: parseFloat(e.target.value) || 0 };
                        patchSizes(next);
                      }}
                      className={compact ? 'text-sm' : ''}
                    />
                  </div>
                  <div className="w-[100px]">
                    <Input
                      label="Compare at"
                      type="number"
                      step="0.01"
                      min="0"
                      value={row.compare_at_price ?? ''}
                      onChange={(e) => {
                        const next = [...sizeVolumes];
                        next[index] = {
                          ...row,
                          compare_at_price: e.target.value ? parseFloat(e.target.value) : null,
                        };
                        patchSizes(next);
                      }}
                      className={compact ? 'text-sm' : ''}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 items-end">
                  <div className="w-[88px]">
                    <Input
                      label="Stock"
                      type="number"
                      min="0"
                      value={row.stock_quantity}
                      onChange={(e) => {
                        const next = [...sizeVolumes];
                        next[index] = {
                          ...row,
                          stock_quantity: parseInt(e.target.value, 10) || 0,
                        };
                        patchSizes(next);
                      }}
                      className={compact ? 'text-sm' : ''}
                    />
                  </div>
                  <div className="min-w-[120px]">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">{t('form.stockStatus')}</label>
                    <select
                      value={row.stock_status}
                      onChange={(e) => {
                        const next = [...sizeVolumes];
                        next[index] = {
                          ...row,
                          stock_status: e.target.value as ProductSizeVolumeVariant['stock_status'],
                        };
                        patchSizes(next);
                      }}
                      className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md"
                    >
                      <option value="in_stock">{t('form.inStock')}</option>
                      <option value="out_of_stock">{t('form.outOfStock')}</option>
                      <option value="backorder">{t('form.backorder')}</option>
                    </select>
                  </div>
                  <div className="min-w-[100px] flex-1">
                    <Input
                      label="SKU"
                      value={row.sku ?? ''}
                      onChange={(e) => {
                        const next = [...sizeVolumes];
                        next[index] = {
                          ...row,
                          sku: e.target.value === '' ? null : e.target.value,
                        };
                        patchSizes(next);
                      }}
                      className={compact ? 'text-sm' : ''}
                    />
                  </div>
                  <div className="w-[140px]">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">{t('form.expiry')}</label>
                    <input
                      type="date"
                      value={expiryToInputValue(row.expiry_date)}
                      onChange={(e) => {
                        const next = [...sizeVolumes];
                        next[index] = {
                          ...row,
                          expiry_date: inputDateToIso(e.target.value),
                        };
                        patchSizes(next);
                      }}
                      className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <label className="flex items-center gap-2 text-xs text-gray-700">
                    <input
                      type="checkbox"
                      checked={row.is_active}
                      onChange={(e) => {
                        const next = [...sizeVolumes];
                        next[index] = { ...row, is_active: e.target.checked };
                        patchSizes(next);
                      }}
                    />
                    {t('form.activeOnStorefront')}
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    isLoading={uploading === 'size' && uploadKey === `size-${index}`}
                    onClick={() => triggerUpload('size', index)}
                  >
                    {t('form.uploadImage')}
                  </Button>
                  {row.image_url ? (
                    <span className="text-[11px] text-gray-500 truncate max-w-[180px]">
                      {row.image_url.replace(/^https?:\/\/[^/]+/i, '')}
                    </span>
                  ) : null}
                  {row.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={displayImageUrl(row.image_url)}
                      alt=""
                      className="h-10 w-10 rounded object-cover border border-gray-200"
                    />
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs text-red-700 border-red-200 ml-auto"
                    onClick={() => patchSizes(sizeVolumes.filter((_, i) => i !== index))}
                  >
                    {t('form.remove')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => patchSizes([...sizeVolumes, defaultSizeRow(sizeVolumes.length)])}
        >
          {t('form.addSizePackVariant')}
        </Button>
      </div>

      <div className={boxCls}>
        <div>
          <h3 className={titleCls}>{t('form.namedVariants')}</h3>
          <p className={subCls}>
            {t('form.namedVariantsDescription')}
          </p>
        </div>

        {named.length === 0 ? (
          <p className="text-xs text-gray-500">{t('form.noNamedVariants')}</p>
        ) : (
          <div className="space-y-3">
            {named.map((row, index) => (
              <div
                key={row.id ?? `new-eh-${index}`}
                className="rounded-lg border border-white/80 bg-white/90 p-3 shadow-sm space-y-2"
              >
                <div className="flex flex-wrap gap-2 items-end">
                  <div className="min-w-[160px] flex-1">
                    <Input
                      label="Name *"
                      value={row.name}
                      onChange={(e) => {
                        const next = [...named];
                        next[index] = { ...row, name: e.target.value };
                        patchNamed(next);
                      }}
                      placeholder="10ml — twin pack"
                      className={compact ? 'text-sm' : ''}
                    />
                  </div>
                  <div className="w-[100px]">
                    <Input
                      label="Price *"
                      type="number"
                      step="0.01"
                      min="0"
                      value={row.price}
                      onChange={(e) => {
                        const next = [...named];
                        next[index] = { ...row, price: parseFloat(e.target.value) || 0 };
                        patchNamed(next);
                      }}
                      className={compact ? 'text-sm' : ''}
                    />
                  </div>
                </div>
                <Input
                  label="Description"
                  value={row.description ?? ''}
                  onChange={(e) => {
                    const next = [...named];
                    next[index] = {
                      ...row,
                      description: e.target.value === '' ? null : e.target.value,
                    };
                    patchNamed(next);
                  }}
                  className={compact ? 'text-sm' : ''}
                />
                <div className="flex flex-wrap gap-2 items-center">
                  <label className="flex items-center gap-2 text-xs text-gray-700">
                    <input
                      type="checkbox"
                      checked={row.is_active}
                      onChange={(e) => {
                        const next = [...named];
                        next[index] = { ...row, is_active: e.target.checked };
                        patchNamed(next);
                      }}
                    />
                    {t('form.active')}
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    isLoading={uploading === 'named' && uploadKey === `named-${index}`}
                    onClick={() => triggerUpload('named', index)}
                  >
                    {t('form.uploadImage')}
                  </Button>
                  {row.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={displayImageUrl(row.image_url)}
                      alt=""
                      className="h-10 w-10 rounded object-cover border border-gray-200"
                    />
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs text-red-700 border-red-200 ml-auto"
                    onClick={() => patchNamed(named.filter((_, i) => i !== index))}
                  >
                    {t('form.remove')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => patchNamed([...named, defaultNamedRow(named.length)])}
        >
          {t('form.addNamedVariant')}
        </Button>
      </div>
    </div>
  );
}

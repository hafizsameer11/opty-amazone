'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  productService,
  type CreateFrameSizeData,
  type FrameSize,
} from '@/services/product-service';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Alert from '@/components/ui/Alert';
import apiClient from '@/lib/api-client';
import { resolveMediaUrl } from '@/lib/media-url';

interface FrameSizesEditorProps {
  productId: number;
  /** Required — sizes are always scoped to a color variant. */
  productVariantId: number;
  title?: string;
  description?: string;
  compact?: boolean;
  onChanged?: () => void;
}

const emptyForm = (variantId: number): CreateFrameSizeData => ({
  product_variant_id: variantId,
  lens_width: 0,
  bridge_width: 0,
  temple_length: 0,
  size_label: '',
  price: undefined,
  image: undefined,
  stock_quantity: 1,
  stock_status: 'in_stock',
});

function displaySize(size: FrameSize) {
  if (size.size_label?.trim()) return size.size_label.trim();
  const lw = Number(size.lens_width);
  const bw = Number(size.bridge_width);
  const tl = Number(size.temple_length);
  if (lw || bw || tl) return `${lw}-${bw}-${tl}`;
  return 'Size';
}

export default function FrameSizesEditor({
  productId,
  productVariantId,
  title = 'Sizes & stock',
  description = 'Enter any size name (e.g. 12mm, Medium) and set stock for this color.',
  compact = false,
  onChanged,
}: FrameSizesEditorProps) {
  const [sizes, setSizes] = useState<FrameSize[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CreateFrameSizeData>(() => emptyForm(productVariantId));
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadSizes = useCallback(async () => {
    try {
      setLoading(true);
      const data = await productService.getFrameSizes(productId, productVariantId);
      setSizes(data);
    } catch {
      setAlert({ type: 'error', message: 'Failed to load frame sizes' });
    } finally {
      setLoading(false);
    }
  }, [productId, productVariantId]);

  useEffect(() => {
    void loadSizes();
  }, [loadSizes]);

  useEffect(() => {
    setForm(emptyForm(productVariantId));
    setEditingId(null);
  }, [productVariantId]);

  const resetForm = () => {
    setForm(emptyForm(productVariantId));
    setEditingId(null);
  };

  const handleEdit = (size: FrameSize) => {
    setEditingId(size.id);
    setForm({
      product_variant_id: productVariantId,
      lens_width: Number(size.lens_width),
      bridge_width: Number(size.bridge_width),
      temple_length: Number(size.temple_length),
      frame_width: size.frame_width != null ? Number(size.frame_width) : undefined,
      frame_height: size.frame_height != null ? Number(size.frame_height) : undefined,
      size_label: size.size_label || '',
      price: size.price != null ? Number(size.price) : undefined,
      image: size.image || undefined,
      stock_quantity: size.stock_quantity,
      stock_status: size.stock_status,
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setAlert({ type: 'error', message: 'Please select an image file' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAlert({ type: 'error', message: 'Image must be under 5MB' });
      return;
    }
    try {
      const body = new FormData();
      body.append('image', file);
      const res = await apiClient.post('/seller/products/upload-image', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = res.data?.data?.url;
      if (!url) throw new Error('Upload failed');
      setForm((prev) => ({ ...prev, image: resolveMediaUrl(url) }));
    } catch {
      setAlert({ type: 'error', message: 'Failed to upload size image' });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    setAlert(null);
    try {
      const label = form.size_label?.trim() || '';
      if (!label) {
        setAlert({ type: 'error', message: 'Enter a size name (e.g. 12mm)' });
        setSaving(false);
        return;
      }
      const payload: CreateFrameSizeData = {
        ...form,
        product_variant_id: productVariantId,
        size_label: label,
        lens_width: form.lens_width ?? 0,
        bridge_width: form.bridge_width ?? 0,
        temple_length: form.temple_length ?? 0,
        image: form.image?.trim() || undefined,
      };
      if (editingId) {
        await productService.updateFrameSize(editingId, payload);
        setAlert({ type: 'success', message: 'Frame size updated' });
      } else {
        await productService.createFrameSize(productId, payload);
        setAlert({ type: 'success', message: 'Frame size added' });
      }
      resetForm();
      await loadSizes();
      onChanged?.();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to save frame size';
      setAlert({ type: 'error', message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this frame size?')) return;
    try {
      await productService.deleteFrameSize(id);
      if (editingId === id) resetForm();
      await loadSizes();
      onChanged?.();
    } catch {
      setAlert({ type: 'error', message: 'Failed to delete frame size' });
    }
  };

  return (
    <div className={`bg-white rounded-xl shadow border border-gray-100 overflow-hidden ${compact ? 'border-dashed' : ''}`}>
      <div className={`px-4 py-3 border-b border-gray-100 ${compact ? 'bg-white' : 'bg-gray-50'}`}>
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>

      <div className="p-4 space-y-4">
        {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

        {loading ? (
          <p className="text-sm text-gray-500">Loading sizes…</p>
        ) : sizes.length > 0 ? (
          <ul className="space-y-2">
            {sizes.map((size) => (
              <li
                key={size.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                <div>
                  <span className="font-semibold text-gray-900">{displaySize(size)}</span>
                  <span className="text-gray-500 ml-2">Qty: {size.stock_quantity}</span>
                  {size.price != null && (
                    <span className="text-[#0066CC] ml-2">€{Number(size.price).toFixed(2)}</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => handleEdit(size)}>
                    Edit
                  </Button>
                  <Button type="button" variant="danger" size="sm" onClick={() => void handleDelete(size.id)}>
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">No sizes yet for this color.</p>
        )}

        <div
          className="space-y-3 border-t border-gray-100 pt-4"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
              e.preventDefault();
            }
          }}
        >
          <p className="text-xs font-semibold text-gray-700">
            {editingId ? 'Edit size' : 'Add size'}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Input
              label="Size *"
              value={form.size_label || ''}
              onChange={(e) => setForm({ ...form, size_label: e.target.value })}
              placeholder="12mm / Medium / 52-18-140"
            />
            <Input
              label="Stock quantity *"
              type="number"
              min={0}
              value={String(form.stock_quantity)}
              onChange={(e) =>
                setForm({ ...form, stock_quantity: Math.max(0, Number(e.target.value) || 0) })
              }
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stock status</label>
              <select
                value={form.stock_status}
                onChange={(e) =>
                  setForm({ ...form, stock_status: e.target.value as CreateFrameSizeData['stock_status'] })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="in_stock">In stock</option>
                <option value="out_of_stock">Out of stock</option>
                <option value="backorder">Backorder</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Input
              label="Price override (optional)"
              type="number"
              step="0.01"
              min={0}
              value={form.price != null ? String(form.price) : ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  price: e.target.value === '' ? undefined : Number(e.target.value),
                })
              }
            />
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => void handleImageUpload(e)} />
            <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              Upload size image
            </Button>
            {form.image && (
              <span className="text-xs text-gray-500 truncate max-w-xs">{form.image}</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" disabled={saving} onClick={() => void handleSubmit()}>
              {saving ? 'Saving…' : editingId ? 'Update size' : 'Add size'}
            </Button>
            {editingId && (
              <Button type="button" variant="outline" size="sm" onClick={resetForm}>
                Cancel edit
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

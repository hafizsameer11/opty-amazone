'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Alert from '@/components/ui/Alert';
import apiClient, { getApiOrigin } from '@/lib/api-client';
import {
  productService,
  type ContactLensUnitConfig,
  type ContactLensPackRow,
  type ContactLensColourStockRow,
  type ProductVariant,
} from '@/services/product-service';
import { useLanguage } from '@/contexts/LanguageContext';

function displayImageUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
  if (url.startsWith('/storage')) return `${getApiOrigin()}${url}`;
  return url;
}

function parseUnitsInput(raw: string): number[] {
  const parts = raw.split(/[,\s]+/).map((s) => parseInt(s.trim(), 10));
  return [...new Set(parts.filter((n) => Number.isFinite(n) && n > 0))].sort((a, b) => a - b);
}

function mergePacks(quantities: number[], existing: ContactLensPackRow[]): ContactLensPackRow[] {
  const byQty = new Map<number, ContactLensPackRow>();
  existing.forEach((p) => byQty.set(p.quantity, p));
  return quantities.map((quantity) => {
    const prev = byQty.get(quantity);
    return {
      quantity,
      price: prev?.price ?? null,
      images: prev?.images?.length ? [...prev.images] : [],
      available_variant_ids: prev?.available_variant_ids?.length
        ? [...prev.available_variant_ids]
        : [],
    };
  });
}

interface ContactLensPackUnitsEditorProps {
  productId: number;
  productName: string;
  basePrice: number;
  value: ContactLensUnitConfig | undefined;
  onChange: (next: ContactLensUnitConfig) => void;
  onSave: (config: ContactLensUnitConfig) => Promise<void>;
}

export default function ContactLensPackUnitsEditor({
  productId,
  productName,
  basePrice,
  value,
  onChange,
  onSave,
}: ContactLensPackUnitsEditorProps) {
  const { t } = useLanguage();
  const packs = value?.packs ?? [];
  const colourStock = value?.colour_stock ?? [];
  const [unitsInput, setUnitsInput] = useState(() => packs.map((p) => p.quantity).join(', '));
  const [qtyInput, setQtyInput] = useState(() => (value?.qty_options ?? []).join(', '));
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [saveErr, setSaveErr] = useState('');
  const [uploadingQty, setUploadingQty] = useState<number | null>(null);
  const [colourVariants, setColourVariants] = useState<ProductVariant[]>([]);
  const fileInputsRef = useRef<Record<number, HTMLInputElement | null>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await productService.getVariants(productId);
        if (!cancelled) setColourVariants(rows.filter((v) => Boolean(v.color_name)));
      } catch {
        if (!cancelled) setColourVariants([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const quantitiesFromField = useMemo(() => parseUnitsInput(unitsInput), [unitsInput]);
  const qtyOptionsFromField = useMemo(() => parseUnitsInput(qtyInput), [qtyInput]);

  const syncPacksFromInput = () => {
    onChange({
      packs: mergePacks(quantitiesFromField, packs),
      qty_options: qtyOptionsFromField,
      colour_stock: colourStock,
    });
  };

  const updatePack = (quantity: number, patch: Partial<ContactLensPackRow>) => {
    const next = packs.map((p) => (p.quantity === quantity ? { ...p, ...patch } : p));
    if (!next.some((p) => p.quantity === quantity)) {
      next.push({ quantity, price: null, images: [], available_variant_ids: [], ...patch });
      next.sort((a, b) => a.quantity - b.quantity);
    }
    onChange({ packs: next, qty_options: qtyOptionsFromField, colour_stock: colourStock });
  };

  const setPackImagesFromText = (quantity: number, text: string) => {
    const urls = text
      .split(/\n|,/)
      .map((s) => s.trim())
      .filter(Boolean);
    updatePack(quantity, { images: urls });
  };

  const removePackImageAt = (quantity: number, index: number) => {
    const list = [...(packs.find((p) => p.quantity === quantity)?.images || [])];
    list.splice(index, 1);
    updatePack(quantity, { images: list });
  };

  const togglePackColour = (quantity: number, variantId: number) => {
    const pack = packs.find((p) => p.quantity === quantity);
    const current = pack?.available_variant_ids ?? [];
    // Empty list means "all colours". First toggle starts from all → remove one.
    const base =
      current.length === 0 && colourVariants.length > 0
        ? colourVariants.map((v) => v.id)
        : [...current];
    const next = base.includes(variantId)
      ? base.filter((id) => id !== variantId)
      : [...base, variantId];
    updatePack(quantity, { available_variant_ids: next });
  };

  const setColourStockQty = (packQuantity: number, variantId: number, stock: number) => {
    const next: ContactLensColourStockRow[] = colourStock.filter(
      (r) => !(r.pack_quantity === packQuantity && r.variant_id === variantId)
    );
    if (Number.isFinite(stock) && stock >= 0) {
      next.push({ pack_quantity: packQuantity, variant_id: variantId, stock_quantity: stock });
    }
    next.sort((a, b) => a.pack_quantity - b.pack_quantity || a.variant_id - b.variant_id);
    onChange({
      packs: mergePacks(quantitiesFromField.length ? quantitiesFromField : packs.map((p) => p.quantity), packs),
      qty_options: qtyOptionsFromField,
      colour_stock: next,
    });
  };

  const getColourStock = (packQuantity: number, variantId: number): number => {
    const row = colourStock.find(
      (r) => r.pack_quantity === packQuantity && r.variant_id === variantId
    );
    return row?.stock_quantity ?? 0;
  };

  const handlePackImageUpload = async (quantity: number, files: FileList | null) => {
    if (!files?.length) return;
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

    setUploadingQty(quantity);
    const startList = [...(packs.find((p) => p.quantity === quantity)?.images || [])];
    const added: string[] = [];
    try {
      for (const file of valid) {
        const fd = new FormData();
        fd.append('image', file);
        const response = await apiClient.post<{ success: boolean; data?: { url?: string } }>(
          '/seller/products/upload-image',
          fd
        );
        const rawUrl = response.data.success && response.data.data?.url ? response.data.data.url : null;
        if (!rawUrl) throw new Error(t('form.uploadFailed'));
        const absolute =
          rawUrl.startsWith('http://') || rawUrl.startsWith('https://')
            ? rawUrl
            : rawUrl.startsWith('/storage')
              ? `${getApiOrigin()}${rawUrl}`
              : rawUrl;
        if (!startList.includes(absolute) && !added.includes(absolute)) {
          added.push(absolute);
        }
      }
      if (added.length) {
        updatePack(quantity, { images: [...startList, ...added] });
      }
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { message?: string } }; message?: string };
      window.alert(ax.response?.data?.message || ax.message || t('form.uploadFailed'));
    } finally {
      setUploadingQty(null);
      const input = fileInputsRef.current[quantity];
      if (input) input.value = '';
    }
  };

  const handleSave = async () => {
    const next: ContactLensUnitConfig = {
      packs: mergePacks(quantitiesFromField, packs),
      qty_options: qtyOptionsFromField,
      colour_stock: colourStock,
    };
    onChange(next);
    setSaving(true);
    setSaveMsg('');
    setSaveErr('');
    try {
      await onSave(next);
      setSaveMsg(t('form.packUnitsSaved'));
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { message?: string } } };
      setSaveErr(ax.response?.data?.message || t('form.savePackUnitsFailed'));
    } finally {
      setSaving(false);
    }
  };

  const displayPacks = quantitiesFromField.length ? mergePacks(quantitiesFromField, packs) : packs;

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-slate-700 to-slate-900 px-6 py-5 sm:px-8">
        <h2 className="text-xl sm:text-2xl font-bold text-white">{t('form.packUnits')}</h2>
        <p className="text-slate-300 mt-1 text-sm">
          {t('form.packUnitsDescription')}
        </p>
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        {saveErr && <Alert type="error" message={saveErr} onClose={() => setSaveErr('')} />}
        {saveMsg && <Alert type="success" message={saveMsg} onClose={() => setSaveMsg('')} />}

        <div className="rounded-xl border border-sky-200 bg-sky-50/80 p-4 text-sm text-sky-950 space-y-2">
          <p className="font-semibold">{t('form.howItWorks')}</p>
          <ol className="list-decimal list-inside space-y-1 text-sky-900/90">
            <li>
              {t('form.packUnitsHelp1')}
            </li>
            <li>{t('form.packUnitsHelp2', { price: basePrice.toFixed(2) })}</li>
            <li>
              {t('form.packUnitsHelp3')}
            </li>
            <li>
              {t('form.packUnitsHelp4')}
            </li>
          </ol>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Input
              label="Available units (pack sizes)"
              value={unitsInput}
              onChange={(e) => setUnitsInput(e.target.value)}
              onBlur={syncPacksFromInput}
              placeholder={t('e.g., 10, 20, 30')}
            />
            <p className="text-xs text-gray-500 mt-1">{t('form.availableUnitsHelp')}</p>
          </div>
          <div>
            <Input
              label="Buyer Qty options (boxes per eye)"
              value={qtyInput}
              onChange={(e) => setQtyInput(e.target.value)}
              onBlur={syncPacksFromInput}
              placeholder="e.g. 1, 2, 3, 4"
            />
            <p className="text-xs text-gray-500 mt-1">{t('form.qtyOptionsHelp')}</p>
          </div>
        </div>

        <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 px-3 py-2 text-sm text-indigo-950">
          {t('form.productReference', { id: productId })} · {productName}
        </div>

        {displayPacks.length === 0 ? (
          <p className="text-center text-gray-500 text-sm py-8 border border-dashed border-gray-200 rounded-xl">
            {t('form.addPackSizesHint')}
          </p>
        ) : (
          <div className="space-y-4">
            {displayPacks.map((pack) => {
              const allowed =
                pack.available_variant_ids && pack.available_variant_ids.length > 0
                  ? new Set(pack.available_variant_ids)
                  : null;
              return (
                <div
                  key={pack.quantity}
                  className="rounded-xl border border-gray-200 p-4 space-y-3 bg-gray-50/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-gray-900">{t('form.pack')} × {pack.quantity}</h3>
                    <span className="text-xs text-gray-500">{t('form.lensesPerBox')}</span>
                  </div>
                  <Input
                    label={t('form.packPriceOverride', { price: basePrice.toFixed(2) })}
                    type="number"
                    step="0.01"
                    min="0"
                    value={pack.price != null && Number.isFinite(Number(pack.price)) ? String(pack.price) : ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      updatePack(pack.quantity, {
                        price: v === '' ? null : parseFloat(v),
                      });
                    }}
                  />
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">{t('form.packImages')}</label>
                    <div className="flex flex-wrap gap-2">
                      {(pack.images || []).map((url, imgIdx) => (
                        <div
                          key={`${pack.quantity}-${imgIdx}-${url.slice(0, 24)}`}
                          className="relative h-20 w-20 rounded-lg border border-gray-200 overflow-hidden bg-gray-100 shrink-0 group"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={displayImageUrl(url)}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removePackImageAt(pack.quantity, imgIdx)}
                            className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            {t('form.remove')}
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        ref={(el) => {
                          fileInputsRef.current[pack.quantity] = el;
                        }}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => handlePackImageUpload(pack.quantity, e.target.files)}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="text-sm"
                        disabled={uploadingQty === pack.quantity}
                        onClick={() => fileInputsRef.current[pack.quantity]?.click()}
                      >
                        {uploadingQty === pack.quantity ? t('form.uploading') : `+ ${t('form.uploadImages')}`}
                      </Button>
                      <span className="text-xs text-gray-500">{t('form.imageFormats')}</span>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        {t('form.pasteImageUrls')}
                      </label>
                      <textarea
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm min-h-[72px]"
                        value={(pack.images || []).join('\n')}
                        onChange={(e) => setPackImagesFromText(pack.quantity, e.target.value)}
                        placeholder={t('https://…')}
                      />
                    </div>
                  </div>

                  {colourVariants.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-gray-200">
                      <p className="text-sm font-medium text-gray-800">{t('form.coloursAvailable')}</p>
                      <p className="text-xs text-gray-500">
                        {t('form.coloursHint')}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {colourVariants.map((v) => {
                          const checked = allowed == null || allowed.has(v.id);
                          return (
                            <label
                              key={`${pack.quantity}-colour-${v.id}`}
                              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => togglePackColour(pack.quantity, v.id)}
                              />
                              <span
                                className="inline-block h-3 w-3 rounded-full border border-gray-300"
                                style={{ backgroundColor: v.color_code || '#ddd' }}
                              />
                              {v.color_name}
                            </label>
                          );
                        })}
                      </div>

                      <p className="text-sm font-medium text-gray-800 pt-2">{t('form.packColourStock')}</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {colourVariants
                          .filter((v) => allowed == null || allowed.has(v.id))
                          .map((v) => (
                            <Input
                              key={`${pack.quantity}-stock-${v.id}`}
                              label={`${v.color_name} ${t('form.stock')}`}
                              type="number"
                              min="0"
                              value={String(getColourStock(pack.quantity, v.id))}
                              onChange={(e) =>
                                setColourStockQty(
                                  pack.quantity,
                                  v.id,
                                  Math.max(0, parseInt(e.target.value, 10) || 0)
                                )
                              }
                            />
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="bg-slate-800 hover:bg-slate-900 text-white min-w-[200px]"
          >
            {saving ? t('common.saving') : t('form.savePackUnits')}
          </Button>
        </div>
      </div>
    </div>
  );
}

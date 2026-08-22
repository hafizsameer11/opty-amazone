'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Product } from '@/services/product-service';
import type { AddToCartData } from '@/services/cart-service';
import Button from '@/components/ui/Button';
import { getFullImageUrl } from '@/lib/image-utils';

export interface EyeHygieneSizeVolumeRow {
  id: number;
  size_volume: string;
  pack_type?: string | null;
  price: number | string;
  compare_at_price?: number | string | null;
  stock_quantity?: number;
  stock_status?: string;
  sku?: string | null;
  image_url?: string | null;
  is_active?: boolean;
}

export interface EyeHygieneNamedRow {
  id: number;
  name: string;
  description?: string | null;
  price: number | string;
  image_url?: string | null;
  is_active?: boolean;
}

export type EyeHygieneDisplayChange = {
  price: number;
  imageUrls: string[] | null;
};

type Selection =
  | { kind: 'size_volume'; id: number }
  | { kind: 'eye_hygiene'; id: number }
  | { kind: 'product_only' };

function toNum(v: unknown, fallback = 0): number {
  if (v === null || v === undefined || v === '') return fallback;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : fallback;
}

function formatLabelSize(row: EyeHygieneSizeVolumeRow): string {
  const p = row.pack_type ? String(row.pack_type) : '';
  return p ? `${row.size_volume} · ${p}` : String(row.size_volume);
}

export default function EyeHygieneDetails({
  product,
  onAddToCart,
  addingToCart = false,
  onVariantDisplayChange,
}: {
  product: Product;
  onAddToCart: (config: AddToCartData) => Promise<void>;
  addingToCart?: boolean;
  /** Notify parent PDP so main gallery + price swap when ML/volume changes. */
  onVariantDisplayChange?: (change: EyeHygieneDisplayChange) => void;
}) {
  const sizeRows = (product as Product & { size_volume_variants?: EyeHygieneSizeVolumeRow[] })
    .size_volume_variants;
  const namedRows = (product as Product & { eye_hygiene_variants?: EyeHygieneNamedRow[] })
    .eye_hygiene_variants;

  const sizeList = useMemo(
    () => (Array.isArray(sizeRows) ? sizeRows.filter((r) => r.is_active !== false) : []),
    [sizeRows]
  );
  const namedList = useMemo(
    () => (Array.isArray(namedRows) ? namedRows.filter((r) => r.is_active !== false) : []),
    [namedRows]
  );

  const needsVariant = sizeList.length > 0 || namedList.length > 0;

  const [selection, setSelection] = useState<Selection>({ kind: 'product_only' });
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (!needsVariant) {
      setSelection({ kind: 'product_only' });
      return;
    }
    const firstInStockSize = sizeList.find((r) => r.stock_status !== 'out_of_stock');
    if (firstInStockSize) {
      setSelection({ kind: 'size_volume', id: firstInStockSize.id });
      return;
    }
    if (sizeList.length > 0) {
      setSelection({ kind: 'size_volume', id: sizeList[0].id });
      return;
    }
    if (namedList.length > 0) {
      setSelection({ kind: 'eye_hygiene', id: namedList[0].id });
    }
  }, [needsVariant, sizeList, namedList]);

  const selectedSize = selection.kind === 'size_volume' ? sizeList.find((r) => r.id === selection.id) : null;
  const selectedNamed = selection.kind === 'eye_hygiene' ? namedList.find((r) => r.id === selection.id) : null;

  const displayPrice = useMemo(() => {
    if (selectedSize) return toNum(selectedSize.price, toNum(product.price, 0));
    if (selectedNamed) return toNum(selectedNamed.price, toNum(product.price, 0));
    return toNum(product.price, 0);
  }, [selectedSize, selectedNamed, product.price]);

  const variantImageUrl = useMemo(() => {
    if (selectedSize?.image_url) return selectedSize.image_url;
    if (selectedNamed?.image_url) return selectedNamed.image_url;
    return null;
  }, [selectedSize, selectedNamed]);

  useEffect(() => {
    if (!onVariantDisplayChange) return;
    onVariantDisplayChange({
      price: displayPrice,
      imageUrls: variantImageUrl ? [getFullImageUrl(variantImageUrl)] : null,
    });
  }, [displayPrice, variantImageUrl, onVariantDisplayChange]);

  const displayStockStatus = useMemo(() => {
    if (selectedSize) return selectedSize.stock_status || 'in_stock';
    if (selectedNamed) return product.stock_status;
    return product.stock_status;
  }, [selectedSize, selectedNamed, product.stock_status]);

  const displayStockQuantity = useMemo(() => {
    if (selectedSize) return Math.floor(toNum(selectedSize.stock_quantity, 0));
    if (selectedNamed) return Math.floor(toNum(product.stock_quantity, 0));
    return Math.floor(toNum(product.stock_quantity, 0));
  }, [selectedSize, selectedNamed, product.stock_quantity]);

  const canAdd =
    displayStockStatus === 'in_stock' &&
    (!needsVariant || selection.kind !== 'product_only') &&
    displayStockQuantity >= quantity;

  const handleAddToCart = async () => {
    if (needsVariant && selection.kind === 'product_only') {
      return;
    }
    const base: AddToCartData = {
      product_id: product.id,
      quantity,
    };
    if (selection.kind === 'size_volume') {
      base.product_size_volume_id = selection.id;
      base.selected_variant_id = `size_volume_${selection.id}`;
    } else if (selection.kind === 'eye_hygiene') {
      base.eye_hygiene_variant_id = selection.id;
      base.selected_variant_id = `eye_hygiene_${selection.id}`;
    }
    await onAddToCart(base);
  };

  return (
    <div className="space-y-6">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Product information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {product.size_volume && (
            <div>
              <span className="text-gray-600 font-medium">Default size/volume:</span>
              <span className="ml-2">{product.size_volume}</span>
            </div>
          )}
          {product.pack_type && (
            <div>
              <span className="text-gray-600 font-medium">Pack type:</span>
              <span className="ml-2 capitalize">{product.pack_type}</span>
            </div>
          )}
          {product.expiry_date && (
            <div>
              <span className="text-gray-600 font-medium">Expiry:</span>
              <span className="ml-2">{new Date(product.expiry_date).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </div>

      {sizeList.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Size / ML / pack</h4>
          <div className="space-y-2">
            {sizeList.map((row) => {
              const active = selection.kind === 'size_volume' && selection.id === row.id;
              const out = row.stock_status === 'out_of_stock';
              return (
                <button
                  key={row.id}
                  type="button"
                  disabled={out}
                  onClick={() => setSelection({ kind: 'size_volume', id: row.id })}
                  className={`w-full text-left rounded-lg border-2 px-3 py-2 transition-colors ${
                    active
                      ? 'border-[#0066CC] bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  } ${out ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex justify-between gap-2 items-center">
                    <div className="flex items-center gap-3 min-w-0">
                      {row.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={getFullImageUrl(row.image_url)}
                          alt=""
                          className="w-12 h-12 rounded object-cover flex-shrink-0 border border-gray-100"
                        />
                      ) : null}
                      <span className="font-medium text-gray-900 truncate">{formatLabelSize(row)}</span>
                    </div>
                    <span className="text-[#0066CC] font-semibold flex-shrink-0">
                      €{toNum(row.price, 0).toFixed(2)}
                    </span>
                  </div>
                  {row.sku ? <p className="text-xs text-gray-500 mt-0.5">SKU: {row.sku}</p> : null}
                  {out ? <p className="text-xs text-red-600 mt-1">Out of stock</p> : null}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {namedList.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Named options</h4>
          <div className="space-y-2">
            {namedList.map((row) => {
              const active = selection.kind === 'eye_hygiene' && selection.id === row.id;
              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => setSelection({ kind: 'eye_hygiene', id: row.id })}
                  className={`w-full text-left rounded-lg border-2 px-3 py-2 transition-colors ${
                    active
                      ? 'border-[#0066CC] bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex justify-between gap-2 items-center">
                    <div className="flex items-center gap-3 min-w-0">
                      {row.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={getFullImageUrl(row.image_url)}
                          alt=""
                          className="w-12 h-12 rounded object-cover flex-shrink-0 border border-gray-100"
                        />
                      ) : null}
                      <span className="font-medium text-gray-900 truncate">{row.name}</span>
                    </div>
                    <span className="text-[#0066CC] font-semibold flex-shrink-0">
                      €{toNum(row.price, 0).toFixed(2)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {needsVariant && sizeList.length > 0 && namedList.length > 0 ? (
        <p className="text-xs text-gray-500">
          Selecting a named option switches away from size/pack pricing; pick one line that matches what the customer
          should be charged.
        </p>
      ) : null}

      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">Quantity</label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="w-10 h-10 rounded-lg border-2 border-gray-200 hover:border-gray-300 flex items-center justify-center font-semibold"
          >
            −
          </button>
          <span className="text-lg font-semibold w-12 text-center">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity(Math.min(displayStockQuantity || 999, quantity + 1))}
            className="w-10 h-10 rounded-lg border-2 border-gray-200 hover:border-gray-300 flex items-center justify-center font-semibold"
          >
            +
          </button>
        </div>
        {displayStockQuantity > 0 ? (
          <p className="text-xs text-gray-500 mt-1">{displayStockQuantity} available</p>
        ) : null}
      </div>

      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Subtotal:</span>
          <span className="text-lg font-bold text-[#0066CC]">
            €{(displayPrice * quantity).toFixed(2)}
          </span>
        </div>
      </div>

      <Button
        onClick={handleAddToCart}
        disabled={addingToCart || !canAdd}
        className="w-full"
        size="lg"
      >
        {addingToCart ? (
          <span className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Adding…
          </span>
        ) : !canAdd ? (
          displayStockStatus !== 'in_stock' ? (
            'Out of stock'
          ) : needsVariant ? (
            'Select an option'
          ) : (
            'Unavailable'
          )
        ) : (
          'Add to cart'
        )}
      </Button>

      {product.description && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="font-semibold text-gray-900 mb-2">Description</h4>
          <p className="text-sm text-gray-600 whitespace-pre-line">{product.description}</p>
        </div>
      )}
    </div>
  );
}

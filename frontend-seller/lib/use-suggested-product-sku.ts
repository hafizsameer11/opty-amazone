'use client';

import { useEffect } from 'react';
import { productService } from '@/services/product-service';

function fallbackSku() {
  return `VX-${Date.now().toString(36).toUpperCase().slice(-8)}`;
}

/** Prefill SKU on new-product forms; seller can edit before save. */
export function useSuggestedProductSku(
  enabled: boolean,
  sku: string,
  onSuggested: (sku: string) => void
) {
  useEffect(() => {
    if (!enabled || sku.trim()) return;

    let cancelled = false;
    productService
      .suggestSku()
      .then((value) => {
        if (!cancelled) onSuggested(value);
      })
      .catch(() => {
        if (!cancelled) onSuggested(fallbackSku());
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, sku, onSuggested]);
}

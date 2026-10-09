import type { CreateVariantData } from '@/services/product-service';

/**
 * Size handling shared by the create-time and edit-time colour variation
 * editors.
 *
 * Sizes are free text ("12mm", "Medium", or still "52-18-140"), so the raw
 * text is stored as `size_label` — the same value the seller sees in the
 * input — and the optional numeric dimensions are parsed out of it when it
 * happens to match the compact lens-bridge-temple form.
 */

export type DraftSizeRow = {
  key: string;
  size_text: string;
  stock_quantity: number;
  stock_status: 'in_stock' | 'out_of_stock' | 'backorder';
};

/** Parsed size, ready for the API. */
export type ParsedVariantSize = NonNullable<CreateVariantData['sizes']>[number];

export function emptyDraftSize(): DraftSizeRow {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    size_text: '',
    stock_quantity: 0,
    stock_status: 'in_stock',
  };
}

/** Free-text size (e.g. "12mm", "Medium", or still "52-18-140"). Dimensions optional. */
export function normalizeSizeRow(text: string): {
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

/** The text currently shown in a size input for an API-shaped size row. */
export function sizeRowText(size?: ParsedVariantSize | null): string {
  return size?.size_label ?? '';
}

/** Total stock across a variant's sizes, mirroring the backend's own sum. */
export function sumSizes(sizes?: ParsedVariantSize[] | null): number {
  return (sizes ?? []).reduce((sum, size) => sum + Math.max(0, Number(size.stock_quantity) || 0), 0);
}

/**
 * Convert the edit-time draft rows into API-shaped sizes.
 *
 * Rows left completely blank are dropped so an untouched "add size" row never
 * turns into an empty size on the backend.
 */
export function draftSizesToApi(sizes: DraftSizeRow[]): ParsedVariantSize[] {
  const parsed: ParsedVariantSize[] = [];

  for (const row of sizes) {
    if (!row.size_text.trim() && row.stock_quantity === 0) continue;
    const normalized = normalizeSizeRow(row.size_text);
    if (!normalized) continue;

    parsed.push({
      ...normalized,
      stock_quantity: Math.max(0, Number(row.stock_quantity) || 0),
      stock_status: row.stock_status,
    });
  }

  return parsed;
}

/** Turn API-shaped sizes back into draft rows for editing. */
export function apiSizesToDraft(sizes?: ParsedVariantSize[] | null): DraftSizeRow[] {
  if (!sizes?.length) return [emptyDraftSize()];

  return sizes.map((size, index) => ({
    key: `existing-${index}-${size.size_label}`,
    size_text: size.size_label,
    stock_quantity: Math.max(0, Number(size.stock_quantity) || 0),
    stock_status: size.stock_status ?? 'in_stock',
  }));
}
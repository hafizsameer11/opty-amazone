'use client';
import { useCampaignPrice } from '@/components/campaigns/useCampaignPrice';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Product } from '@/services/product-service';
import { getPrescriptionOptions, type PrescriptionOptions } from '@/services/prescription-options-service';
import Button from '@/components/ui/Button';
import { getFullImageUrl } from '@/lib/image-utils';

export type ContactLensPackSelection =
  | { mode: 'pack'; quantity: number }
  | { mode: 'variant'; variantId: number }
  | { mode: 'none' };

export type ContactLensGalleryChange = {
  /** Thumbnail strip URLs (empty for spherical pack-only products). */
  sidebarUrls: string[];
  /** Main hero image(s) for the selected pack/colour. */
  mainUrls: string[] | null;
  /** When true, PDP hides the left thumbnail column (spherical CL). */
  hideSidebar?: boolean;
};

type ContactLensUnitConfigParsed = {
  packs: Array<{
    quantity: number;
    price: number | null;
    images: string[];
    available_variant_ids: number[];
  }>;
  qty_options: number[];
  colour_stock: Array<{ pack_quantity: number; variant_id: number; stock_quantity: number }>;
};

export function parseContactLensUnitConfig(product: Product): ContactLensUnitConfigParsed {
  const raw = (product as Product & { contact_lens_unit_config?: unknown }).contact_lens_unit_config;
  if (!raw || typeof raw !== 'object') {
    return { packs: [], qty_options: [], colour_stock: [] };
  }
  const obj = raw as {
    packs?: unknown;
    qty_options?: unknown;
    colour_stock?: unknown;
  };
  const packs = Array.isArray(obj.packs)
    ? obj.packs
        .filter((p): p is Record<string, unknown> => p != null && typeof p === 'object')
        .filter((p) => Number.isFinite(Number(p.quantity)) && Number(p.quantity) > 0)
        .map((p) => ({
          quantity: Number(p.quantity),
          price: p.price != null && p.price !== '' ? Number(p.price) : null,
          images: Array.isArray(p.images) ? p.images.map(String).filter(Boolean) : [],
          available_variant_ids: Array.isArray(p.available_variant_ids)
            ? p.available_variant_ids.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0)
            : [],
        }))
        .sort((a, b) => a.quantity - b.quantity)
    : [];

  const qty_options = Array.isArray(obj.qty_options)
    ? [
        ...new Set(
          obj.qty_options
            .map((n) => Math.floor(Number(n)))
            .filter((n) => Number.isFinite(n) && n >= 1)
        ),
      ].sort((a, b) => a - b)
    : [];

  const colour_stock = Array.isArray(obj.colour_stock)
    ? obj.colour_stock
        .filter((r): r is Record<string, unknown> => r != null && typeof r === 'object')
        .map((r) => ({
          pack_quantity: Math.floor(Number(r.pack_quantity)),
          variant_id: Math.floor(Number(r.variant_id)),
          stock_quantity: Math.floor(Number(r.stock_quantity ?? 0)),
        }))
        .filter(
          (r) =>
            Number.isFinite(r.pack_quantity) &&
            r.pack_quantity > 0 &&
            Number.isFinite(r.variant_id) &&
            r.variant_id > 0
        )
    : [];

  return { packs, qty_options, colour_stock };
}

/** Format diopter-style values as 14.00 / -2.25 (preserve two decimals). */
function formatDiopterDisplay(raw: string): string {
  const n = parseFloat(String(raw).replace(',', '.'));
  if (!Number.isFinite(n)) return String(raw);
  const body = Math.abs(n).toFixed(2);
  if (n > 0) return `+${body}`;
  if (n < 0) return `-${body}`;
  return body;
}

/** Format millimetre values as 14.50. */
function formatMmDisplay(raw: string): string {
  const n = parseFloat(String(raw).replace(',', '.'));
  if (!Number.isFinite(n)) return String(raw);
  return n.toFixed(2);
}

function sortNumericStrings(values: string[]): string[] {
  return [...values].sort((a, b) => {
    const na = parseFloat(String(a).replace(',', '.'));
    const nb = parseFloat(String(b).replace(',', '.'));
    if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
    return String(a).localeCompare(String(b), undefined, { numeric: true });
  });
}

function mergeEyeOptionArrays(opts: PrescriptionOptions | null, field: 'cyl' | 'axis'): string[] {
  if (!opts) return [];
  const b = opts[field];
  return sortNumericStrings([...new Set([...b.left, ...b.right, ...b.both].map(String))]);
}

/** Merge left/right with shared `both` values (seller often saves PWR as eye_type=both). */
function powerOptionsForSide(
  opts: PrescriptionOptions | null,
  side: 'left' | 'right'
): string[] {
  if (!opts) return [];
  const fromPwr = [...(opts.pwr?.[side] || []), ...(opts.pwr?.both || [])];
  if (fromPwr.length > 0) return sortNumericStrings([...new Set(fromPwr.map(String))]);
  const fromSph = [...(opts.sph?.[side] || []), ...(opts.sph?.both || [])];
  return sortNumericStrings([...new Set(fromSph.map(String))]);
}

function sideOptionsForField(
  opts: PrescriptionOptions | null,
  field: 'cyl' | 'axis',
  side: 'left' | 'right'
): string[] {
  if (!opts) return [];
  const block = opts[field];
  return sortNumericStrings([...new Set([...(block?.[side] || []), ...(block?.both || [])].map(String))]);
}

const selectBoxClass =
  'w-full px-2 py-2.5 text-sm font-medium border-2 rounded-lg focus:ring-2 transition-all appearance-none pr-8 bg-white';

interface ContactLensConfigurationProps {
  product: Product;
  onPackGalleryChange?: (change: ContactLensGalleryChange) => void;
  onDisplayPriceChange?: (price: number | null) => void;
  onSelectedPackQuantityChange?: (quantity: number | null) => void;
  onAddToCart: (config: {
    product_id: number;
    variant_id?: number;
    quantity: number;
    contact_lens_pack_quantity?: number;
    contact_lens_right_base_curve?: number;
    contact_lens_right_diameter?: number;
    contact_lens_right_power?: number;
    contact_lens_right_qty?: number;
    contact_lens_right_cylinder?: number;
    contact_lens_right_axis?: number;
    contact_lens_left_base_curve?: number;
    contact_lens_left_diameter?: number;
    contact_lens_left_power?: number;
    contact_lens_left_qty?: number;
    contact_lens_left_cylinder?: number;
    contact_lens_left_axis?: number;
    product_variant?: { color_name?: string; color_code?: string };
  }) => Promise<void>;
  addingToCart?: boolean;
}

interface EyeConfiguration {
  base_curve: string;
  diameter: string;
  sph: string; // SPH (Power)
  cyl: string; // CYL (Cylinder) - for astigmatism
  axis: string; // AXIS - for astigmatism
  quantity: number;
  enabled: boolean;
}

function bumpQty(current: number, delta: number, min: number, max: number): number {
  const n = Number(current);
  const base = Number.isFinite(n) ? n : min;
  return Math.min(max, Math.max(min, base + delta));
}

export default function ContactLensConfiguration({
  product,
  onPackGalleryChange,
  onDisplayPriceChange,
  onSelectedPackQuantityChange,
  onAddToCart,
  addingToCart = false,
}: ContactLensConfigurationProps) {
  const unitConfig = useMemo(() => parseContactLensUnitConfig(product), [product]);
  const configuredPacks = unitConfig.packs;
  const hasConfiguredPacks = configuredPacks.length > 0;
  const qtyOptions = unitConfig.qty_options;
  const hasQtyOptions = qtyOptions.length > 0;
  const qtyMin = hasQtyOptions ? qtyOptions[0] : 1;
  const qtyMax = hasQtyOptions ? qtyOptions[qtyOptions.length - 1] : 99;

  const colourVariants = useMemo(() => {
    if (!product.variants?.length) return [];
    return product.variants.filter((v) => Boolean(v.color_name) || (v.images && v.images.length > 0));
  }, [product.variants]);

  const isColouredLens = useMemo(() => {
    const slug = (product.category?.slug || '').toLowerCase();
    const name = (product.category?.name || '').toLowerCase();
    const subSlug = (product.sub_category?.slug || '').toLowerCase();
    const subName = (product.sub_category?.name || '').toLowerCase();
    const isColourCategory = (value: string) =>
      /\bcolou?rs?\b/.test(value.replace(/-/g, ' ')) ||
      value.includes('coloured') ||
      value.includes('colored');
    return (
      isColourCategory(slug) ||
      isColourCategory(name) ||
      isColourCategory(subSlug) ||
      isColourCategory(subName) ||
      Boolean(product.contact_lens_color) ||
      (hasConfiguredPacks && colourVariants.length > 0)
    );
  }, [product.category, product.sub_category, product.contact_lens_color, hasConfiguredPacks, colourVariants.length]);

  /** Use variants as pack alternatives only when no seller packs AND not colour-lens mode. */
  const useVariantsAsPacks = !hasConfiguredPacks && !isColouredLens && Boolean(product.variants?.length);

  const initialPackSelection = useMemo((): ContactLensPackSelection => {
    if (configuredPacks.length > 0) {
      return { mode: 'pack', quantity: configuredPacks[0].quantity };
    }
    if (!isColouredLens && product.variants?.length) {
      return { mode: 'variant', variantId: product.variants[0].id };
    }
    return { mode: 'none' };
  }, [configuredPacks, isColouredLens, product.variants]);

  const [packSelection, setPackSelection] = useState<ContactLensPackSelection>(initialPackSelection);

  const [selectedColourVariantId, setSelectedColourVariantId] = useState<number | null>(null);

  useEffect(() => {
    setPackSelection(initialPackSelection);
  }, [product.id, initialPackSelection]);

  const coloursForSelectedPack = useMemo(() => {
    if (!colourVariants.length) return [];
    if (packSelection.mode !== 'pack') return colourVariants;
    const pack = configuredPacks.find((p) => p.quantity === packSelection.quantity);
    if (!pack || !pack.available_variant_ids.length) return colourVariants;
    const allowed = new Set(pack.available_variant_ids);
    return colourVariants.filter((v) => allowed.has(v.id));
  }, [colourVariants, packSelection, configuredPacks]);

  useEffect(() => {
    if (coloursForSelectedPack.length === 0) {
      setSelectedColourVariantId(null);
      return;
    }
    setSelectedColourVariantId((prev) =>
      prev != null && coloursForSelectedPack.some((v) => v.id === prev)
        ? prev
        : coloursForSelectedPack[0].id
    );
  }, [coloursForSelectedPack]);

  const isAstigmatism =
    product.name?.toLowerCase().includes('astigmatism') ||
    product.category?.name?.toLowerCase().includes('astigmatism') ||
    product.category?.slug?.toLowerCase().includes('astigmatism') ||
    product.sub_category?.name?.toLowerCase().includes('astigmatism') ||
    product.sub_category?.slug?.toLowerCase().includes('astigmatism');

  const defaultQty = hasQtyOptions ? qtyOptions[0] : 1;

  const [rightEye, setRightEye] = useState<EyeConfiguration>({
    base_curve: '',
    diameter: '',
    sph: '--',
    cyl: '--',
    axis: '--',
    quantity: defaultQty,
    enabled: true,
  });

  const [leftEye, setLeftEye] = useState<EyeConfiguration>({
    base_curve: '',
    diameter: '',
    sph: '--',
    cyl: '--',
    axis: '--',
    quantity: defaultQty,
    enabled: true,
  });

  const [prescriptionOptions, setPrescriptionOptions] = useState<PrescriptionOptions | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(true);

  useEffect(() => {
    const loadPrescriptionOptions = async () => {
      try {
        setLoadingOptions(true);
        const options = await getPrescriptionOptions(product.id);
        setPrescriptionOptions(options);
      } catch (error) {
        console.error('Failed to load prescription options:', error);
        setPrescriptionOptions(null);
      } finally {
        setLoadingOptions(false);
      }
    };

    loadPrescriptionOptions();
  }, [product.id]);

  // When backend qty options load/change, clamp eye quantities into the allowed set.
  useEffect(() => {
    if (!hasQtyOptions) return;
    const clamp = (q: number) => (qtyOptions.includes(q) ? q : qtyOptions[0]);
    setRightEye((prev) => ({ ...prev, quantity: clamp(Number(prev.quantity)) }));
    setLeftEye((prev) => ({ ...prev, quantity: clamp(Number(prev.quantity)) }));
  }, [hasQtyOptions, qtyOptions]);

  const baseCurveOptions = useMemo(() => {
    const api = prescriptionOptions?.base_curve || [];
    if (api.length) return sortNumericStrings(api.map(String));
    return sortNumericStrings((product.base_curve_options || []).map(String));
  }, [prescriptionOptions, product.base_curve_options]);

  const diameterOptionsList = useMemo(() => {
    const api = prescriptionOptions?.diameter || [];
    if (api.length) return sortNumericStrings(api.map(String));
    return sortNumericStrings((product.diameter_options || []).map(String));
  }, [prescriptionOptions, product.diameter_options]);

  const showCylAxisFields = useMemo(() => {
    if (isAstigmatism) return true;
    if (!prescriptionOptions) return false;
    return (
      mergeEyeOptionArrays(prescriptionOptions, 'cyl').length > 0 ||
      mergeEyeOptionArrays(prescriptionOptions, 'axis').length > 0
    );
  }, [isAstigmatism, prescriptionOptions]);

  const powerFieldLabel = showCylAxisFields ? 'SPH' : 'PWR';

  const rightSphOptions = powerOptionsForSide(prescriptionOptions, 'right');
  const leftSphOptions = powerOptionsForSide(prescriptionOptions, 'left');
  const rightCylOptions = sideOptionsForField(prescriptionOptions, 'cyl', 'right');
  const leftCylOptions = sideOptionsForField(prescriptionOptions, 'cyl', 'left');
  const rightAxisOptions = sideOptionsForField(prescriptionOptions, 'axis', 'right');
  const leftAxisOptions = sideOptionsForField(prescriptionOptions, 'axis', 'left');
  const hasAnySphOptions = rightSphOptions.length > 0 || leftSphOptions.length > 0;

  const { price: campaignPrice } = useCampaignPrice(product.id, {
    variant_id: packSelection.mode === 'variant' ? packSelection.variantId : selectedColourVariantId || undefined,
    contact_lens_pack_quantity: packSelection.mode === 'pack' ? packSelection.quantity : undefined,
  }, Math.max(1, (rightEye.enabled ? Number(rightEye.quantity) : 0) + (leftEye.enabled ? Number(leftEye.quantity) : 0)));
  const selectedPackPrice = useMemo(() => {
    if (campaignPrice) return campaignPrice.discounted_price;
    if (packSelection.mode === 'pack') {
      const row = configuredPacks.find((p) => p.quantity === packSelection.quantity);
      if (row?.price != null && Number.isFinite(Number(row.price))) return Number(row.price);
    }
    if (packSelection.mode === 'variant') {
      const v = product.variants?.find((x) => x.id === packSelection.variantId);
      return Number(v?.price ?? product.price) || 0;
    }
    if (hasConfiguredPacks && configuredPacks[0]?.price != null) {
      return Number(configuredPacks[0].price);
    }
    if (hasConfiguredPacks) return 0;
    return Number(product.price) || 0;
  }, [packSelection, configuredPacks, hasConfiguredPacks, product.price, product.variants, campaignPrice]);

  useEffect(() => {
    if (!onSelectedPackQuantityChange) return;
    if (packSelection.mode === 'pack') {
      onSelectedPackQuantityChange(packSelection.quantity);
    } else {
      onSelectedPackQuantityChange(null);
    }
  }, [packSelection, onSelectedPackQuantityChange]);

  useEffect(() => {
    if (!onDisplayPriceChange) return;
    onDisplayPriceChange(selectedPackPrice);
  }, [selectedPackPrice, onDisplayPriceChange, product.id]);

  const packColourStock = useMemo(() => {
    if (packSelection.mode !== 'pack' || selectedColourVariantId == null) return null;
    const row = unitConfig.colour_stock.find(
      (r) => r.pack_quantity === packSelection.quantity && r.variant_id === selectedColourVariantId
    );
    return row ?? null;
  }, [packSelection, selectedColourVariantId, unitConfig.colour_stock]);

  const lastGallerySigRef = useRef<string>('');

  useEffect(() => {
    if (!onPackGalleryChange) return;

    const sphericalPackOnly = hasConfiguredPacks && !isColouredLens;
    let mainUrls: string[] | null = null;

    if ((hasConfiguredPacks || isColouredLens) && selectedColourVariantId != null) {
      const colour = coloursForSelectedPack.find((v) => v.id === selectedColourVariantId);
      if (colour?.images?.length) {
        mainUrls = colour.images.map((u) => getFullImageUrl(u));
      }
    }

    if (!mainUrls && packSelection.mode === 'pack') {
      const row = configuredPacks.find((p) => p.quantity === packSelection.quantity);
      if (row?.images?.length) {
        mainUrls = row.images.map((u) => getFullImageUrl(u));
      }
    } else if (!mainUrls && packSelection.mode === 'variant') {
      const v = product.variants?.find((x) => x.id === packSelection.variantId);
      if (v?.images?.length) {
        mainUrls = v.images.map((u) => getFullImageUrl(u));
      }
    } else if (!mainUrls && hasConfiguredPacks) {
      const first = configuredPacks[0];
      if (first?.images?.length) {
        mainUrls = first.images.map((u) => getFullImageUrl(u));
      }
    }

    const sidebarUrls: string[] = [];
    if (!sphericalPackOnly) {
      const seen = new Set<string>();
      configuredPacks.forEach((p) =>
        p.images.forEach((url) => {
          const full = getFullImageUrl(url);
          if (full && !seen.has(full)) {
            seen.add(full);
            sidebarUrls.push(full);
          }
        })
      );
      (mainUrls || []).forEach((url) => {
        if (url && !seen.has(url)) {
          seen.add(url);
          sidebarUrls.push(url);
        }
      });
    }

    const sig = `${product.id}\n${sphericalPackOnly}\n${sidebarUrls.join('\u0001')}\n${mainUrls?.join('\u0001') ?? ''}`;
    if (lastGallerySigRef.current === sig) return;
    lastGallerySigRef.current = sig;
    onPackGalleryChange({ sidebarUrls, mainUrls, hideSidebar: sphericalPackOnly });
  }, [
    onPackGalleryChange,
    packSelection,
    configuredPacks,
    product.id,
    product.variants,
    hasConfiguredPacks,
    isColouredLens,
    selectedColourVariantId,
    coloursForSelectedPack,
  ]);

  const selectPack = (quantity: number) => {
    setPackSelection({ mode: 'pack', quantity });
    onSelectedPackQuantityChange?.(quantity);
    const row = configuredPacks.find((p) => p.quantity === quantity);
    if (onDisplayPriceChange) {
      const next =
        row?.price != null && Number.isFinite(Number(row.price))
          ? Number(row.price)
          : hasConfiguredPacks
            ? 0
            : Number(product.price) || 0;
      onDisplayPriceChange(next);
    }
  };

  const selectVariantPack = (variantId: number) => {
    setPackSelection({ mode: 'variant', variantId });
  };

  const handleRightEyeChange = (field: keyof EyeConfiguration, value: string | number | boolean) => {
    setRightEye({ ...rightEye, [field]: value });
  };

  const handleLeftEyeChange = (field: keyof EyeConfiguration, value: string | number | boolean) => {
    setLeftEye({ ...leftEye, [field]: value });
  };

  const handleCopyRightToLeft = () => {
    setLeftEye({
      ...rightEye,
      quantity: leftEye.quantity,
    });
  };

  const handleAddToCart = async () => {
    const hasBaseCurveOptions = baseCurveOptions.length > 0;
    const hasDiameterOptions = diameterOptionsList.length > 0;

    if (hasConfiguredPacks && packSelection.mode !== 'pack') {
      alert('Please select a pack size.');
      return;
    }

    if ((hasConfiguredPacks || isColouredLens) && coloursForSelectedPack.length > 0 && selectedColourVariantId == null) {
      alert('Please select a lens colour.');
      return;
    }

    if (packColourStock != null && packColourStock.stock_quantity < 1) {
      alert('Selected pack and colour combination is out of stock.');
      return;
    }

    if (rightEye.enabled) {
      if (hasBaseCurveOptions && !rightEye.base_curve) {
        alert('Please fill in Base Curve for right eye.');
        return;
      }
      if (hasDiameterOptions && !rightEye.diameter) {
        alert('Please fill in Diameter for right eye.');
        return;
      }
    }

    if (leftEye.enabled) {
      if (hasBaseCurveOptions && !leftEye.base_curve) {
        alert('Please fill in Base Curve for left eye.');
        return;
      }
      if (hasDiameterOptions && !leftEye.diameter) {
        alert('Please fill in Diameter for left eye.');
        return;
      }
    }

    if (!rightEye.enabled && !leftEye.enabled) {
      alert('Please enable at least one eye.');
      return;
    }

    if (showCylAxisFields) {
      if (rightEye.enabled && rightEye.cyl !== '--') {
        if (rightEye.axis === '--') {
          alert('Please enter AXIS for right eye when CYL is specified.');
          return;
        }
      }
      if (leftEye.enabled && leftEye.cyl !== '--') {
        if (leftEye.axis === '--') {
          alert('Please enter AXIS for left eye when CYL is specified.');
          return;
        }
      }
      if (hasAnySphOptions && rightEye.enabled && rightEye.cyl === '--' && rightEye.sph === '--') {
        alert('Please fill in SPH (Power) for right eye.');
        return;
      }
      if (hasAnySphOptions && leftEye.enabled && leftEye.cyl === '--' && leftEye.sph === '--') {
        alert('Please fill in SPH (Power) for left eye.');
        return;
      }
    } else {
      if (hasAnySphOptions && rightEye.enabled && rightEye.sph === '--') {
        alert('Please fill in SPH (Power) for right eye.');
        return;
      }
      if (hasAnySphOptions && leftEye.enabled && leftEye.sph === '--') {
        alert('Please fill in SPH (Power) for left eye.');
        return;
      }
    }

    const config: Record<string, unknown> = {
      product_id: product.id,
      quantity: (rightEye.enabled ? Number(rightEye.quantity) : 0) + (leftEye.enabled ? Number(leftEye.quantity) : 0),
    };

    if (packSelection.mode === 'pack') {
      config.contact_lens_pack_quantity = packSelection.quantity;
    }
    if (packSelection.mode === 'variant') {
      config.variant_id = packSelection.variantId;
    } else if ((hasConfiguredPacks || isColouredLens) && selectedColourVariantId != null) {
      config.variant_id = selectedColourVariantId;
      const colour = coloursForSelectedPack.find((v) => v.id === selectedColourVariantId);
      if (colour) {
        config.product_variant = {
          color_name: colour.color_name,
          color_code: colour.color_code,
        };
      }
    }

    if (rightEye.enabled) {
      if (rightEye.base_curve && rightEye.base_curve !== '') {
        config.contact_lens_right_base_curve = parseFloat(rightEye.base_curve);
      }
      if (rightEye.diameter && rightEye.diameter !== '') {
        config.contact_lens_right_diameter = parseFloat(rightEye.diameter);
      }
      const rightSph =
        rightEye.sph === '--' && showCylAxisFields && rightEye.cyl !== '--' ? '0.00' : rightEye.sph;
      if (rightSph !== '--') {
        config.contact_lens_right_power = parseFloat(rightSph);
      }
      config.contact_lens_right_qty = Number(rightEye.quantity);
      if (showCylAxisFields && rightEye.cyl !== '--') {
        config.contact_lens_right_cylinder = parseFloat(rightEye.cyl);
      }
      if (showCylAxisFields && rightEye.axis !== '--') {
        config.contact_lens_right_axis = parseInt(rightEye.axis, 10);
      }
    }

    if (leftEye.enabled) {
      if (leftEye.base_curve && leftEye.base_curve !== '') {
        config.contact_lens_left_base_curve = parseFloat(leftEye.base_curve);
      }
      if (leftEye.diameter && leftEye.diameter !== '') {
        config.contact_lens_left_diameter = parseFloat(leftEye.diameter);
      }
      const leftSph =
        leftEye.sph === '--' && showCylAxisFields && leftEye.cyl !== '--' ? '0.00' : leftEye.sph;
      if (leftSph !== '--') {
        config.contact_lens_left_power = parseFloat(leftSph);
      }
      config.contact_lens_left_qty = Number(leftEye.quantity);
      if (showCylAxisFields && leftEye.cyl !== '--') {
        config.contact_lens_left_cylinder = parseFloat(leftEye.cyl);
      }
      if (showCylAxisFields && leftEye.axis !== '--') {
        config.contact_lens_left_axis = parseInt(leftEye.axis, 10);
      }
    }

    await onAddToCart(config as Parameters<ContactLensConfigurationProps['onAddToCart']>[0]);
  };

  const canAddToCart = (() => {
    if (!rightEye.enabled && !leftEye.enabled) return false;
    if (product.stock_status !== 'in_stock') return false;
    if (hasConfiguredPacks && packSelection.mode !== 'pack') return false;
    if ((hasConfiguredPacks || isColouredLens) && coloursForSelectedPack.length > 0 && selectedColourVariantId == null) {
      return false;
    }
    if (packColourStock != null && packColourStock.stock_quantity < 1) return false;

    const hasBaseCurveOptions = baseCurveOptions.length > 0;
    const hasDiameterOptions = diameterOptionsList.length > 0;

    if (rightEye.enabled) {
      if (hasBaseCurveOptions && (!rightEye.base_curve || rightEye.base_curve === '')) return false;
      if (hasDiameterOptions && (!rightEye.diameter || rightEye.diameter === '')) return false;
      if (showCylAxisFields) {
        if (rightEye.cyl !== '--' && rightEye.axis === '--') return false;
        if (hasAnySphOptions && rightEye.cyl === '--' && rightEye.sph === '--') return false;
      } else if (hasAnySphOptions && rightEye.sph === '--') {
        return false;
      }
    }

    if (leftEye.enabled) {
      if (hasBaseCurveOptions && (!leftEye.base_curve || leftEye.base_curve === '')) return false;
      if (hasDiameterOptions && (!leftEye.diameter || leftEye.diameter === '')) return false;
      if (showCylAxisFields) {
        if (leftEye.cyl !== '--' && leftEye.axis === '--') return false;
        if (hasAnySphOptions && leftEye.cyl === '--' && leftEye.sph === '--') return false;
      } else if (hasAnySphOptions && leftEye.sph === '--') {
        return false;
      }
    }

    return true;
  })();

  const renderQtyControl = (
    eye: EyeConfiguration,
    onChange: (field: keyof EyeConfiguration, value: string | number | boolean) => void,
    enabled: boolean
  ) => {
    if (hasQtyOptions) {
      return (
        <select
          value={eye.quantity}
          onChange={(e) => onChange('quantity', parseInt(e.target.value, 10) || qtyMin)}
          disabled={!enabled}
          className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed bg-white font-medium"
        >
          {qtyOptions.map((q) => (
            <option key={q} value={q}>
              {q}
            </option>
          ))}
        </select>
      );
    }

    return (
      <div className="flex items-center gap-2" dir="ltr">
        <button
          type="button"
          aria-label="Decrease quantity"
          onClick={() => onChange('quantity', bumpQty(eye.quantity, -1, qtyMin, qtyMax))}
          disabled={!enabled || Number(eye.quantity) <= qtyMin}
          className="w-10 h-10 rounded-lg border-2 border-gray-300 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-semibold text-gray-700"
        >
          −
        </button>
        <span className="w-16 text-center text-base font-medium text-gray-900 tabular-nums">
          {Number(eye.quantity) || qtyMin}
        </span>
        <button
          type="button"
          aria-label="Increase quantity"
          onClick={() => onChange('quantity', bumpQty(eye.quantity, 1, qtyMin, qtyMax))}
          disabled={!enabled || Number(eye.quantity) >= qtyMax}
          className="w-10 h-10 rounded-lg border-2 border-gray-300 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-semibold text-gray-700"
        >
          +
        </button>
      </div>
    );
  };

  const powerSelectClass = (selected: boolean, accent: 'blue' | 'purple') =>
    `${selectBoxClass} ${
      selected
        ? accent === 'blue'
          ? 'border-blue-500 bg-blue-50 text-blue-900 focus:ring-blue-500 focus:border-blue-500'
          : 'border-purple-500 bg-purple-50 text-purple-900 focus:ring-purple-500 focus:border-purple-500'
        : 'border-gray-200 hover:border-gray-300 text-gray-900 focus:ring-blue-500 focus:border-blue-500'
    }`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Select the parameters</h2>
        <p className="text-lg text-gray-700">{product.name}</p>
        {loadingOptions ? (
          <p className="text-xs text-gray-500 mt-1">Loading prescription options…</p>
        ) : null}
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-3">Pack size (lenses per box)</label>
        <div className="flex flex-wrap gap-3">
          {hasConfiguredPacks
            ? configuredPacks.map((pack) => {
                const selected = packSelection.mode === 'pack' && packSelection.quantity === pack.quantity;
                const thumb = pack.images[0];
                return (
                  <button
                    key={`pack-${pack.quantity}`}
                    type="button"
                    onClick={() => selectPack(pack.quantity)}
                    aria-pressed={selected}
                    className={`flex flex-col items-center rounded-xl border-2 p-2 w-[5.5rem] transition-all ${
                      selected
                        ? 'border-[#0066CC] bg-[#0066CC]/5 shadow-md'
                        : 'border-gray-300 hover:border-gray-400 bg-white'
                    }`}
                  >
                    <div className="w-14 h-14 rounded-lg bg-gray-100 overflow-hidden mb-1 flex items-center justify-center">
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={getFullImageUrl(thumb)}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xs text-gray-400 text-center px-1">×{pack.quantity}</span>
                      )}
                    </div>
                    <span className="text-xs font-bold text-gray-900">×{pack.quantity}</span>
                    <span className="text-[10px] text-gray-600">
                      €{Number(pack.price != null ? pack.price : 0).toFixed(2)}
                    </span>
                  </button>
                );
              })
            : useVariantsAsPacks && product.variants
              ? product.variants.map((v) => {
                  const selected = packSelection.mode === 'variant' && packSelection.variantId === v.id;
                  const thumb = v.images?.[0];
                  return (
                    <button
                      key={`var-${v.id}`}
                      type="button"
                      onClick={() => selectVariantPack(v.id)}
                      aria-pressed={selected}
                      className={`flex flex-col items-center rounded-xl border-2 p-2 w-[5.5rem] transition-all ${
                        selected
                          ? 'border-[#0066CC] bg-[#0066CC]/5 shadow-md'
                          : 'border-gray-300 hover:border-gray-400 bg-white'
                      }`}
                    >
                      <div className="w-14 h-14 rounded-lg bg-gray-100 overflow-hidden mb-1 flex items-center justify-center">
                        {thumb ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={getFullImageUrl(thumb)} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[10px] text-gray-500 text-center px-0.5">{v.color_name || '—'}</span>
                        )}
                      </div>
                      <span className="text-[10px] font-semibold text-gray-900 text-center leading-tight">
                        {v.color_name || `Opt ${v.id}`}
                      </span>
                      <span className="text-[10px] text-gray-600">€{Number(v.price ?? product.price).toFixed(2)}</span>
                    </button>
                  );
                })
              : (
                  <div className="text-sm text-gray-600 rounded-lg border border-gray-200 px-4 py-3 bg-gray-50">
                    Standard pack — €{Number(selectedPackPrice).toFixed(2)}
                  </div>
                )}
        </div>
        {hasConfiguredPacks && (
          <p className="text-xs text-gray-500 mt-2">
            {isColouredLens
              ? 'Select a pack for price; choose a colour to update the product image.'
              : 'Select a pack to update the product image and price. The first pack is selected by default.'}
          </p>
        )}
      </div>

      {(hasConfiguredPacks || isColouredLens) && coloursForSelectedPack.length > 0 && (
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-3">Lens colour</label>
          <div className="flex flex-wrap gap-3">
            {coloursForSelectedPack.map((v) => {
              const selected = selectedColourVariantId === v.id;
              const thumb = v.images?.[0];
              const stockRow =
                packSelection.mode === 'pack'
                  ? unitConfig.colour_stock.find(
                      (r) => r.pack_quantity === packSelection.quantity && r.variant_id === v.id
                    )
                  : null;
              return (
                <button
                  key={`colour-${v.id}`}
                  type="button"
                  onClick={() => setSelectedColourVariantId(v.id)}
                  className={`flex flex-col items-center rounded-xl border-2 p-2 w-[5.5rem] transition-all ${
                    selected
                      ? 'border-[#0066CC] bg-[#0066CC]/5 shadow-md'
                      : 'border-gray-300 hover:border-gray-400 bg-white'
                  }`}
                >
                  <div
                    className="w-14 h-14 rounded-lg overflow-hidden mb-1 flex items-center justify-center border border-gray-100"
                    style={{ backgroundColor: v.color_code || '#f3f4f6' }}
                  >
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={getFullImageUrl(thumb)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] text-gray-600 text-center px-0.5">{v.color_name || '—'}</span>
                    )}
                  </div>
                  <span className="text-[10px] font-semibold text-gray-900 text-center leading-tight">
                    {v.color_name || `Colour ${v.id}`}
                  </span>
                  <span className="text-[10px] text-gray-500">
                    {stockRow != null ? `${stockRow.stock_quantity} left` : 'Same pack price'}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Colour changes the product image only. Price stays tied to pack quantity (€
            {Number(selectedPackPrice).toFixed(2)}).
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-blue-50 via-blue-50/50 to-white border-2 border-blue-200 rounded-xl p-5 shadow-md">
          <div className="flex items-center gap-3 mb-4">
            <input
              type="checkbox"
              id="right-eye-enabled"
              checked={rightEye.enabled}
              onChange={(e) => handleRightEyeChange('enabled', e.target.checked)}
              className="w-5 h-5 text-[#0066CC] border-gray-300 rounded focus:ring-[#0066CC]"
            />
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
              R
            </div>
            <h3 className="text-lg font-bold text-gray-900">Right Eye OD</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quantity (Qty)</label>
              {renderQtyControl(rightEye, handleRightEyeChange, rightEye.enabled)}
            </div>

            {baseCurveOptions.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Base Curve (B.C) mm</label>
                <select
                  value={rightEye.base_curve}
                  onChange={(e) => handleRightEyeChange('base_curve', e.target.value)}
                  disabled={!rightEye.enabled}
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed bg-white font-medium"
                >
                  <option value="">--</option>
                  {baseCurveOptions.map((bc) => (
                    <option key={bc} value={bc}>
                      {formatMmDisplay(bc)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {diameterOptionsList.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Diameter (DIA) mm</label>
                <select
                  value={rightEye.diameter}
                  onChange={(e) => handleRightEyeChange('diameter', e.target.value)}
                  disabled={!rightEye.enabled}
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed bg-white font-medium"
                >
                  <option value="">--</option>
                  {diameterOptionsList.map((dia) => (
                    <option key={dia} value={dia}>
                      {formatMmDisplay(dia)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              {rightSphOptions.length > 0 && (
                <div className="relative">
                  <label className="block text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">
                    {powerFieldLabel}
                  </label>
                  <select
                    value={rightEye.sph}
                    onChange={(e) => handleRightEyeChange('sph', e.target.value)}
                    disabled={!rightEye.enabled}
                    className={powerSelectClass(rightEye.sph !== '--', 'blue')}
                  >
                    <option value="--">--</option>
                    {rightSphOptions.map((sph) => (
                      <option key={sph} value={sph}>
                        {formatDiopterDisplay(sph)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {showCylAxisFields && (
                <div className="relative">
                  <label className="block text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">CYL</label>
                  <select
                    value={rightEye.cyl}
                    onChange={(e) => handleRightEyeChange('cyl', e.target.value)}
                    disabled={!rightEye.enabled}
                    className={powerSelectClass(rightEye.cyl !== '--', 'blue')}
                  >
                    <option value="--">--</option>
                    {rightCylOptions.length > 0 ? (
                      rightCylOptions.map((cyl) => (
                        <option key={cyl} value={cyl}>
                          {formatDiopterDisplay(cyl)}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>
                        No options
                      </option>
                    )}
                  </select>
                </div>
              )}

              {showCylAxisFields && (
                <div className="relative">
                  <label className="block text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">AXIS</label>
                  <select
                    value={rightEye.axis}
                    onChange={(e) => handleRightEyeChange('axis', e.target.value)}
                    disabled={!rightEye.enabled}
                    className={powerSelectClass(rightEye.axis !== '--', 'blue')}
                  >
                    <option value="--">--</option>
                    {rightAxisOptions.length > 0 ? (
                      rightAxisOptions.map((axis) => (
                        <option key={axis} value={axis}>
                          {axis}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>
                        No options
                      </option>
                    )}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 via-purple-50/50 to-white border-2 border-purple-200 rounded-xl p-5 shadow-md">
          <div className="flex items-center gap-3 mb-4">
            <input
              type="checkbox"
              id="left-eye-enabled"
              checked={leftEye.enabled}
              onChange={(e) => handleLeftEyeChange('enabled', e.target.checked)}
              className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-600"
            />
            <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold text-sm">
              L
            </div>
            <h3 className="text-lg font-bold text-gray-900">Left Eye OS</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quantity (Qty)</label>
              {renderQtyControl(leftEye, handleLeftEyeChange, leftEye.enabled)}
            </div>

            {baseCurveOptions.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Base Curve (B.C) mm</label>
                <select
                  value={leftEye.base_curve}
                  onChange={(e) => handleLeftEyeChange('base_curve', e.target.value)}
                  disabled={!leftEye.enabled}
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:opacity-50 disabled:cursor-not-allowed bg-white font-medium"
                >
                  <option value="">--</option>
                  {baseCurveOptions.map((bc) => (
                    <option key={bc} value={bc}>
                      {formatMmDisplay(bc)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {diameterOptionsList.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Diameter (DIA) mm</label>
                <select
                  value={leftEye.diameter}
                  onChange={(e) => handleLeftEyeChange('diameter', e.target.value)}
                  disabled={!leftEye.enabled}
                  className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:opacity-50 disabled:cursor-not-allowed bg-white font-medium"
                >
                  <option value="">--</option>
                  {diameterOptionsList.map((dia) => (
                    <option key={dia} value={dia}>
                      {formatMmDisplay(dia)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              {leftSphOptions.length > 0 && (
                <div className="relative">
                  <label className="block text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">
                    {powerFieldLabel}
                  </label>
                  <select
                    value={leftEye.sph}
                    onChange={(e) => handleLeftEyeChange('sph', e.target.value)}
                    disabled={!leftEye.enabled}
                    className={powerSelectClass(leftEye.sph !== '--', 'purple')}
                  >
                    <option value="--">--</option>
                    {leftSphOptions.map((sph) => (
                      <option key={sph} value={sph}>
                        {formatDiopterDisplay(sph)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {showCylAxisFields && (
                <div className="relative">
                  <label className="block text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">CYL</label>
                  <select
                    value={leftEye.cyl}
                    onChange={(e) => handleLeftEyeChange('cyl', e.target.value)}
                    disabled={!leftEye.enabled}
                    className={powerSelectClass(leftEye.cyl !== '--', 'purple')}
                  >
                    <option value="--">--</option>
                    {leftCylOptions.length > 0 ? (
                      leftCylOptions.map((cyl) => (
                        <option key={cyl} value={cyl}>
                          {formatDiopterDisplay(cyl)}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>
                        No options
                      </option>
                    )}
                  </select>
                </div>
              )}

              {showCylAxisFields && (
                <div className="relative">
                  <label className="block text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">AXIS</label>
                  <select
                    value={leftEye.axis}
                    onChange={(e) => handleLeftEyeChange('axis', e.target.value)}
                    disabled={!leftEye.enabled}
                    className={powerSelectClass(leftEye.axis !== '--', 'purple')}
                  >
                    <option value="--">--</option>
                    {leftAxisOptions.length > 0 ? (
                      leftAxisOptions.map((axis) => (
                        <option key={axis} value={axis}>
                          {axis}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>
                        No options
                      </option>
                    )}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={handleCopyRightToLeft}
          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
            />
          </svg>
          Copy Right to Left
        </button>
      </div>

      <Button
        onClick={handleAddToCart}
        disabled={!canAddToCart || addingToCart}
        className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 text-lg"
        size="lg"
      >
        {addingToCart ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Adding to Cart...
          </span>
        ) : product.stock_status !== 'in_stock' ? (
          'Out of Stock'
        ) : (
          <span className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            Add to Cart
          </span>
        )}
      </Button>
    </div>
  );
}

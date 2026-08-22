import type { Product } from '@/services/product-service';

export const PRODUCT_EDIT_FLOWS = [
  'contact-lenses',
  'eye-glasses',
  'sun-glasses',
  'eye-hygiene',
  'accessori',
] as const;

export type ProductEditFlow = (typeof PRODUCT_EDIT_FLOWS)[number];

const PRODUCT_TYPE_TO_FLOW: Record<Product['product_type'], ProductEditFlow> = {
  contact_lens: 'contact-lenses',
  frame: 'eye-glasses',
  sunglasses: 'sun-glasses',
  eye_hygiene: 'eye-hygiene',
  accessory: 'accessori',
};

const FLOW_TO_PRODUCT_TYPE = Object.fromEntries(
  (Object.entries(PRODUCT_TYPE_TO_FLOW) as [Product['product_type'], ProductEditFlow][]).map(([k, v]) => [v, k])
) as Record<ProductEditFlow, Product['product_type']>;

/**
 * Typed edit URL for each product_type. If type is missing (older API payloads), fall back to
 * `/products/:id/edit` which client-redirects once `getOne` returns the full product.
 */
export function getProductEditPath(
  product: Pick<Product, 'id'> & { product_type?: Product['product_type'] }
): string {
  const id = Number(product.id);
  if (!Number.isFinite(id)) {
    return '/products';
  }
  const pt = product.product_type;
  const flow = pt ? PRODUCT_TYPE_TO_FLOW[pt] : undefined;
  if (!flow) {
    return `/products/${id}/edit`;
  }
  return `/products/${id}/edit/${flow}`;
}

export function isProductEditFlow(value: string | undefined): value is ProductEditFlow {
  return !!value && (PRODUCT_EDIT_FLOWS as readonly string[]).includes(value);
}

export function productTypeForEditFlow(flow: ProductEditFlow): Product['product_type'] {
  return FLOW_TO_PRODUCT_TYPE[flow];
}

export const EDIT_FLOW_LABELS: Record<ProductEditFlow, { title: string; subtitle: string }> = {
  'contact-lenses': {
    title: 'Edit contact lenses',
    subtitle: 'Update this SKU, images, and per-product prescription options (sphere, cylinder, axis, base curve, diameter).',
  },
  'eye-glasses': {
    title: 'Edit eyeglasses',
    subtitle: 'Update frame details, pricing, and variations for this product.',
  },
  'sun-glasses': {
    title: 'Edit sunglasses',
    subtitle: 'Update sunglasses details, pricing, and variations for this product.',
  },
  'eye-hygiene': {
    title: 'Edit eye hygiene product',
    subtitle: 'Update product details, pricing, and inventory.',
  },
  accessori: {
    title: 'Edit accessory',
    subtitle: 'Update accessory details, pricing, and inventory.',
  },
};

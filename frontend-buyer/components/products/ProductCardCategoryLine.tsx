'use client';

import type { Product } from '@/services/product-service';

type ProductCategoryFields = Pick<Product, 'category' | 'sub_category'>;

interface ProductCardCategoryLineProps {
  product: ProductCategoryFields;
  /** Smaller text for dense grids (e.g. home). */
  size?: 'compact' | 'default';
  className?: string;
}

export default function ProductCardCategoryLine({
  product,
  size = 'default',
  className = '',
}: ProductCardCategoryLineProps) {
  const cat = product.category?.name?.trim();
  const sub = product.sub_category?.name?.trim();
  const parts: string[] = [];
  if (cat) parts.push(cat);
  if (sub && sub.toLowerCase() !== cat?.toLowerCase()) {
    parts.push(sub);
  }
  if (parts.length === 0) return null;

  const text = parts.join(' › ');

  const sizeClass =
    size === 'compact' ? 'text-[11px] leading-snug' : 'text-xs leading-snug';

  return (
    <p
      className={`text-gray-500 line-clamp-2 ${sizeClass} ${className}`.trim()}
      title={text}
    >
      {text}
    </p>
  );
}

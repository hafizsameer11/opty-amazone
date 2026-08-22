'use client';

import Link from 'next/link';
import Image from 'next/image';
import { getFullImageUrl, isLocalhostImage } from '@/lib/image-utils';
import type { Category } from '@/services/product-service';

const PLACEHOLDER_GRADIENTS = [
  'from-slate-700 via-slate-600 to-slate-500',
  'from-blue-900 via-blue-700 to-sky-600',
  'from-indigo-900 via-indigo-700 to-blue-600',
  'from-cyan-900 via-cyan-700 to-teal-600',
  'from-zinc-800 via-zinc-600 to-slate-500',
  'from-sky-900 via-sky-700 to-blue-500',
];

export function categoryInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase() || 'VE';
}

export function categoryImageUrl(category: Pick<Category, 'image' | 'image_url'>): string | null {
  const raw = category.image_url || category.image;
  if (!raw) return null;
  const full = getFullImageUrl(raw);
  return full === '/file.svg' ? null : full;
}

interface CategoryTileProps {
  category: Category;
  label: string;
  index?: number;
  href?: string;
  className?: string;
  /** Larger tile for index pages */
  size?: 'sm' | 'md' | 'lg';
}

export default function CategoryTile({
  category,
  label,
  index = 0,
  href,
  className = '',
  size = 'md',
}: CategoryTileProps) {
  const imageUrl = categoryImageUrl(category);
  const gradient = PLACEHOLDER_GRADIENTS[index % PLACEHOLDER_GRADIENTS.length];
  const initials = categoryInitials(label || category.name);
  const to = href ?? `/categories/${category.slug}`;

  const aspect =
    size === 'lg' ? 'aspect-[4/3]' : size === 'sm' ? 'aspect-square' : 'aspect-[5/4]';
  const titleSize =
    size === 'lg' ? 'text-base sm:text-lg' : size === 'sm' ? 'text-sm' : 'text-sm sm:text-base';

  return (
    <Link
      href={to}
      className={`group relative block overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md hover:border-[#0066CC]/40 ${className}`}
    >
      <div className={`relative w-full ${aspect} bg-gray-100`}>
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={label}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            unoptimized={isLocalhostImage(imageUrl)}
          />
        ) : (
          <div
            className={`absolute inset-0 bg-gradient-to-br ${gradient} flex items-center justify-center`}
            aria-hidden="true"
          >
            <span className="text-white/90 font-semibold tracking-wide text-2xl sm:text-3xl select-none">
              {initials}
            </span>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent opacity-90" />
        <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
          <div className={`font-semibold text-white drop-shadow-sm line-clamp-2 ${titleSize}`}>
            {label}
          </div>
          <span className="mt-0.5 inline-block text-[11px] uppercase tracking-[0.14em] text-white/80">
            Shop now
          </span>
        </div>
      </div>
    </Link>
  );
}

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import Button from '@/components/ui/Button';
import { getFullImageUrl } from '@/lib/image-utils';
import { wishlistService, type WishlistItem } from '@/services/wishlist-service';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';

export default function SavedItemsPanel({ onCountChange }: { onCountChange?: (count: number) => void }) {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setTotalCount] = useState(0);
  const onCountChangeRef = useRef(onCountChange);

  useEffect(() => { onCountChangeRef.current = onCountChange; }, [onCountChange]);

  const load = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const result = await wishlistService.listAll();
      const nextItems = result.items || [];
      setItems(nextItems);
      setTotalCount(result.total);
      onCountChangeRef.current?.(result.total);
    } catch (e) {
      console.error('Failed to load saved items:', e);
      setError('Could not load saved items. Please try again.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useLiveRefresh(() => load(true), true, 30000);

  const remove = async (productId: number) => {
    try {
      await wishlistService.remove(productId);
      setItems((current) => {
        const next = current.filter((item) => item.product?.id !== productId);
        setTotalCount((count) => {
          const updated = Math.max(0, count - 1);
          onCountChangeRef.current?.(updated);
          return updated;
        });
        return next;
      });
    } catch (e) {
      console.error('Failed to remove saved item:', e);
      setError('Could not remove this saved item. Please try again.');
    }
  };

  return (
    <div className="rounded-2xl bg-white shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900">Saved Items</h2>
      <p className="text-sm text-gray-600 mt-1">Products you have saved for later.</p>
      {loading ? <p className="mt-6 text-sm text-gray-500">Loading saved items…</p> : null}
      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      {!loading && !error && items.length === 0 ? <div className="mt-6 rounded-xl border p-8 text-center text-sm text-gray-500">You have not saved any products yet.</div> : null}
      {!loading && items.length > 0 ? (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {items.map((item) => {
            const price = item.product?.pricing?.discounted_price ?? item.product?.price;
            const original = item.product?.pricing?.original_price;
            return (
              <article key={item.id} className="rounded-xl border bg-white overflow-hidden">
                <img src={getFullImageUrl(item.product?.images?.[0] || '/placeholder-product.png')} alt={item.product?.name || 'Saved product'} className="w-full h-44 object-cover" />
                <div className="p-4">
                  <h3 className="font-semibold line-clamp-2">{item.product?.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">{item.product?.store?.name}</p>
                  <p className="font-bold mt-2">€{Number(price || 0).toFixed(2)} {original && Number(original) > Number(price) ? <span className="text-xs text-gray-400 line-through ml-1">€{Number(original).toFixed(2)}</span> : null}</p>
                  <div className="flex gap-2 mt-4">
                    <Link className="flex-1 text-center rounded-lg bg-[#0066CC] text-white px-3 py-2 text-sm" href={`/products/${item.product?.id}`}>View</Link>
                    <Button variant="outline" size="sm" onClick={() => item.product?.id && void remove(item.product.id)}>Remove</Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

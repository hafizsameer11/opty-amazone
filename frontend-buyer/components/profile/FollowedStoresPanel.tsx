'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { StoreService, type PublicStore } from '@/services/store-service';
import { getAxiosErrorMessage } from '@/lib/api-client';
import { getFullImageUrl, isLocalhostImage } from '@/lib/image-utils';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';

function storeImageUrl(primary?: string, raw?: string): string {
  const preferred = getFullImageUrl(primary);
  const fallback = getFullImageUrl(raw);
  if (isLocalhostImage(preferred) && fallback !== '/file.svg') return fallback;
  return preferred;
}

function ImageWithFallback({ src, fallback, alt, className }: { src: string; fallback?: string; alt: string; className: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      onError={(event) => {
        const image = event.currentTarget;
        if (fallback && image.src !== fallback) image.src = fallback;
        else image.style.display = 'none';
      }}
    />
  );
}

export default function FollowedStoresPanel({ onCountChange }: { onCountChange?: (count: number) => void }) {
  const [stores, setStores] = useState<PublicStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unfollowing, setUnfollowing] = useState<number | null>(null);
  const onCountChangeRef = useRef(onCountChange);

  useEffect(() => { onCountChangeRef.current = onCountChange; }, [onCountChange]);

  // Inform the profile page only after this component has committed its own
  // state update. Calling the parent setter inside setStores' updater runs
  // during rendering and triggers React's cross-component update warning.
  useEffect(() => {
    onCountChangeRef.current?.(stores.length);
  }, [stores.length]);

  const load = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const result = await StoreService.getFollowedStores();
      setStores(result.data.stores);
    } catch (e) {
      console.error('Failed to load followed stores:', e);
      setError(getAxiosErrorMessage(e) || 'Could not load followed stores. Please try again.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useLiveRefresh(() => load(true), true, 30000);

  const unfollow = async (id: number) => {
    setUnfollowing(id);
    try {
      await StoreService.unfollowStore(id);
      setStores((current) => current.filter((store) => store.id !== id));
    } catch (e) {
      console.error('Failed to unfollow store:', e);
      setError(getAxiosErrorMessage(e) || 'Could not unfollow this store. Please try again.');
    } finally {
      setUnfollowing(null);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">Followed Stores</h2>
      <p className="mt-1 text-sm text-gray-600">Stores you follow and their latest products.</p>
      {loading && <p className="mt-6 text-sm text-gray-500">Loading followed stores...</p>}
      {error && <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-red-600"><p>{error}</p><button type="button" className="underline" onClick={() => void load()}>Retry</button></div>}
      {!loading && !error && stores.length === 0 && <p className="mt-6 text-sm text-gray-500">You are not following any stores yet.</p>}
      {!loading && stores.length > 0 && (
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {stores.map((store) => {
            const banner = storeImageUrl(store.banner_image_url, store.banner_image);
            const profile = storeImageUrl(store.profile_image_url, store.profile_image);
            const hasBanner = banner !== '/file.svg';
            const hasProfile = profile !== '/file.svg';
            return (
              <article key={store.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <Link href={`/stores/${store.id}`} className="group block">
                  <div className="relative h-28 bg-gradient-to-br from-gray-100 to-gray-200">
                    {hasBanner && <ImageWithFallback src={banner} fallback={store.banner_image ? getFullImageUrl(store.banner_image) : undefined} alt={`${store.name} banner`} className="h-full w-full object-cover transition group-hover:scale-105" />}
                    {!hasBanner && <div className="flex h-full items-center justify-center text-4xl font-bold text-gray-300">{store.name.charAt(0).toUpperCase()}</div>}
                    <div className="absolute bottom-0 left-5 translate-y-1/2 overflow-hidden rounded-full border-4 border-white bg-white shadow-md">
                      {hasProfile ? <ImageWithFallback src={profile} fallback={store.profile_image ? getFullImageUrl(store.profile_image) : undefined} alt={store.name} className="h-16 w-16 object-cover" /> : <div className="flex h-16 w-16 items-center justify-center bg-[#0066CC] text-2xl font-bold text-white">{store.name.charAt(0).toUpperCase()}</div>}
                    </div>
                  </div>
                  <div className="px-5 pb-4 pt-11">
                    <h3 className="truncate font-semibold text-gray-900 group-hover:text-[#0066CC]">{store.name}</h3>
                    <p className="mt-1 line-clamp-2 min-h-10 text-sm text-gray-600">{store.description || 'Optical store'}</p>
                    <p className="mt-3 text-xs text-gray-500">{store.products_count || 0} products · {store.followers_count || 0} followers</p>
                  </div>
                </Link>
                <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3">
                  <Link className="text-sm font-medium text-[#0066CC]" href={`/stores/${store.id}`}>Open Store</Link>
                  <button type="button" className="text-sm text-red-600 disabled:opacity-50" disabled={unfollowing === store.id} onClick={() => void unfollow(store.id)}>{unfollowing === store.id ? 'Removing...' : 'Unfollow'}</button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

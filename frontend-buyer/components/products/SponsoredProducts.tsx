'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { adService, rememberAd, type SponsoredAd } from '@/services/ad-service';
import { getFullImageUrl } from '@/lib/image-utils';

function SponsoredCard({ ad }: { ad: SponsoredAd }) {
  const card = useRef<HTMLAnchorElement>(null);
  const impression = useRef<Promise<boolean> | null>(null);
  const [opening, setOpening] = useState(false);
  const countImpression = () => {
    if (!impression.current) impression.current = adService.event(ad.tracking_token, 'impression').catch(() => { impression.current = null; return false; });
    return impression.current;
  };
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const observer = new IntersectionObserver(([entry]) => {
      clearTimeout(timer);
      if (entry.isIntersecting && entry.intersectionRatio >= 0.5 && document.visibilityState === 'visible') {
        timer = setTimeout(() => { void countImpression(); }, 1000);
      }
    }, { threshold: 0.5 });
    if (card.current) observer.observe(card.current);
    return () => { observer.disconnect(); clearTimeout(timer); };
  // Each card is keyed by its signed delivery token.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <Link ref={card} href={`/products/${ad.product.id}`} aria-busy={opening}
    onClick={async (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault(); if (opening) return; setOpening(true);
      try {
        if (await countImpression()) {
          if (await adService.event(ad.tracking_token, 'click')) rememberAd(ad.product.id, ad.tracking_token);
        }
      } catch { /* Opening a product must not depend on tracking availability. */ }
      finally { window.location.assign(`/products/${ad.product.id}`); }
    }} className="block rounded-xl border border-blue-100 bg-white p-4 shadow-sm focus-visible:outline-blue-600">
    <span className="inline-block text-xs font-semibold text-slate-600 bg-slate-100 rounded px-2 py-1">Sponsored</span>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={getFullImageUrl(ad.product.images?.[0] || '/file.svg')} alt={ad.product.name} className="h-36 w-full object-contain my-3" loading="lazy" />
    <h3 className="text-sm font-semibold text-slate-900 line-clamp-2">{ad.product.name}</h3>
    <p className="text-blue-700 font-bold mt-2">€{Number(ad.product.price).toFixed(2)}</p>
  </Link>;
}

export default function SponsoredProducts({ placement, categoryId, query, excludeProductId }: {
  placement: 'homepage' | 'categories' | 'search' | 'recommendations'; categoryId?: number; query?: string; excludeProductId?: number;
}) {
  const [ads, setAds] = useState<SponsoredAd[]>([]);
  useEffect(() => {
    let alive = true;
    adService.delivery(placement, categoryId, query, excludeProductId).then(rows => { if (alive) setAds(rows); }).catch(() => { if (alive) setAds([]); });
    return () => { alive = false; };
  }, [placement, categoryId, query, excludeProductId]);
  if (!ads.length) return null;
  return <section aria-label="Sponsored products" className="my-6 p-4 rounded-2xl bg-blue-50/60 border border-blue-100">
    <div className="flex items-baseline justify-between mb-3"><h2 className="font-semibold text-slate-900">{placement === 'recommendations' ? 'Sponsored recommendations' : 'Sponsored products'}</h2><span className="text-xs text-slate-500">Ads</span></div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{ads.map(ad => <SponsoredCard key={ad.tracking_token} ad={ad} />)}</div>
  </section>;
}

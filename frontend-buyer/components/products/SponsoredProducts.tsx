'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { adService, rememberAd, type SponsoredAd } from '@/services/ad-service';
import { getFullImageUrl } from '@/lib/image-utils';
import DiscountCampaignIndicator from '@/components/campaigns/DiscountCampaignIndicator';

function SponsoredCard({ ad }: { ad: SponsoredAd }) {
  const card = useRef<HTMLAnchorElement>(null);
  const impression = useRef<Promise<boolean> | null>(null);
  const [opening, setOpening] = useState(false);

  const countImpression = () => {
    if (!impression.current) {
      impression.current = adService.event(ad.tracking_token, 'impression').catch(() => {
        impression.current = null;
        return false;
      });
    }
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

  return (
    <Link
      ref={card}
      href={`/products/${ad.product.id}`}
      aria-busy={opening}
      onClick={async (event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        if (opening) return;
        setOpening(true);
        try {
          if (await countImpression()) {
            if (await adService.event(ad.tracking_token, 'click')) rememberAd(ad.product.id, ad.tracking_token);
          }
        } catch { /* Opening a product must not depend on tracking availability. */ }
        finally { window.location.assign(`/products/${ad.product.id}`); }
      }}
      className="group relative flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-blue-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-blue-600"
    >
      <div className="relative h-32 w-full border-b border-blue-100 bg-gradient-to-br from-blue-50 to-slate-50 sm:h-36">
        <span className="absolute left-2 top-2 z-10 rounded-full bg-[#0052a3] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">Sponsored</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={getFullImageUrl(ad.product.images?.[0] || '/file.svg')} alt={ad.product.name} className="h-full w-full object-contain p-3 transition-transform duration-300 group-hover:scale-105" loading="lazy" />
      </div>
      <div className="flex min-h-[170px] flex-1 flex-col p-3 sm:p-4">
        <h3 className="line-clamp-2 text-sm font-semibold text-slate-900 transition-colors group-hover:text-[#0066CC] md:text-[15px]">{ad.product.name}</h3>
        <DiscountCampaignIndicator pricing={ad.product.pricing} compact className="mb-2 mt-2" />
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <p className="text-base font-bold text-[#0066CC] md:text-lg">€{Number(ad.product.price).toFixed(2)}</p>
          {ad.product.compare_at_price && Number(ad.product.compare_at_price) > Number(ad.product.price)
            ? <span className="text-xs text-slate-400 line-through">€{Number(ad.product.compare_at_price).toFixed(2)}</span>
            : null}
        </div>
      </div>
    </Link>
  );
}

export default function SponsoredProducts({ placement, categoryId, query, excludeProductId }: {
  placement: 'homepage' | 'categories' | 'search' | 'recommendations'; categoryId?: number; query?: string; excludeProductId?: number;
}) {
  const [ads, setAds] = useState<SponsoredAd[]>([]);

  useEffect(() => {
    let alive = true;
    adService.delivery(placement, categoryId, query, excludeProductId).then((rows) => {
      if (alive) setAds(rows);
    }).catch(() => {
      if (alive) setAds([]);
    });
    return () => { alive = false; };
  }, [placement, categoryId, query, excludeProductId]);

  if (!ads.length) return null;
  const title = placement === 'recommendations' ? 'Sponsored Recommendations' : 'Sponsored Products';

  return (
    <section aria-label={title} className="my-5 w-full pb-1 sm:my-6">
      <div className="flex items-center justify-between gap-3 rounded-t-2xl bg-[#0052a3] px-3 py-3 text-white sm:px-4">
        <h2 className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide md:text-base">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20" aria-hidden="true">
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3v2m0 14v2m8-10h2M3 11H1m15.66-5.66 1.41-1.41M4.93 18.07l1.41-1.41m0-11.32L4.93 3.93m12.73 14.14-1.41-1.41M15 11a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          </span>
          {title}
        </h2>
        <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold">Promoted</span>
      </div>
      <div className="rounded-b-2xl bg-white px-2.5 py-3.5 shadow-sm sm:px-3.5 sm:py-5">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">{ads.map((ad) => <SponsoredCard key={ad.tracking_token} ad={ad} />)}</div>
      </div>
    </section>
  );
}

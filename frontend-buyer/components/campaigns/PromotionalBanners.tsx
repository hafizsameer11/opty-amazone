'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { campaignService, type CampaignBanner, type Placement } from '@/services/campaign-service';

function Banner({ banner, hero = false }: { banner: CampaignBanner; hero?: boolean }) {
  const element = useRef<HTMLAnchorElement>(null);
  const impression = useRef<Promise<void> | null>(null);
  const visible = useRef(false);

  const record = () => {
    if (!impression.current) {
      impression.current = campaignService.event(banner.tracking_token, 'impression').catch(() => {
        impression.current = null;
      });
    }
    return impression.current;
  };

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const observer = new IntersectionObserver((entries) => {
      visible.current = entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.5);
      if (timer) clearTimeout(timer);
      if (visible.current && document.visibilityState === 'visible') {
        timer = setTimeout(() => {
          if (visible.current && document.visibilityState === 'visible') void record();
        }, 1000);
      }
    }, { threshold: [0, 0.5, 1] });

    if (element.current) observer.observe(element.current);
    const onVisibility = () => {
      if (document.visibilityState !== 'visible' && timer) clearTimeout(timer);
      else if (visible.current) timer = setTimeout(() => void record(), 1000);
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      observer.disconnect();
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [banner.tracking_token]);

  const onClick = async (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      if (visible.current) void record()?.then(() => campaignService.event(banner.tracking_token, 'click')).catch(() => {});
      return;
    }

    event.preventDefault();
    if (visible.current) {
      await Promise.race([
        record()?.then(() => campaignService.event(banner.tracking_token, 'click')).catch(() => {}),
        new Promise((resolve) => setTimeout(resolve, 700)),
      ]);
    }
    window.location.assign(banner.destination);
  };

  if (hero) {
    return (
      <a
        ref={element}
        className="group relative block aspect-[16/9] overflow-hidden rounded-2xl bg-slate-900 shadow-[0_18px_40px_-22px_rgba(15,23,42,0.7)] sm:aspect-[16/5]"
        href={banner.destination}
        rel="noopener noreferrer"
        onClick={onClick}
      >
        <picture>
          <source media="(max-width: 640px)" srcSet={banner.creative.mobile_url || banner.creative.desktop_url} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={banner.creative.desktop_url} alt={banner.creative.alt_text} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.025]" />
        </picture>
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-900/28 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4 text-white sm:max-w-[65%] sm:p-7 lg:p-9">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-blue-100 sm:text-xs">Featured offer</p>
          <h3 className="mt-1 line-clamp-2 text-lg font-bold leading-tight sm:mt-2 sm:text-2xl lg:text-3xl">{banner.creative.title}</h3>
          {banner.creative.description && <p className="mt-1 hidden line-clamp-2 text-sm text-slate-100 sm:block sm:text-base">{banner.creative.description}</p>}
          <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-xs font-bold text-[#0052a3] transition group-hover:bg-blue-50 sm:px-4 sm:text-sm">{banner.creative.cta_text}<span aria-hidden="true">→</span></span>
        </div>
      </a>
    );
  }

  return (
    <a ref={element} className="block overflow-hidden rounded-xl border bg-white shadow-sm" href={banner.destination} rel="noopener noreferrer" onClick={onClick}>
      <picture className="block aspect-[16/7] overflow-hidden bg-slate-100">
        <source media="(max-width: 640px)" srcSet={banner.creative.mobile_url || banner.creative.desktop_url} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={banner.creative.desktop_url} alt={banner.creative.alt_text} className="h-full w-full object-cover" />
      </picture>
      <div className="p-4"><h3 className="font-semibold">{banner.creative.title}</h3>{banner.creative.description && <p className="mt-1 text-sm text-gray-600">{banner.creative.description}</p>}<span className="mt-3 inline-block font-semibold text-blue-700">{banner.creative.cta_text} →</span></div>
    </a>
  );
}

function HeroBannerCarousel({ banners }: { banners: CampaignBanner[] }) {
  const viewport = useRef<HTMLDivElement>(null);
  const scrollFrame = useRef<number | null>(null);
  const normalizeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const multiple = banners.length > 1;
  const slides = multiple ? [banners[banners.length - 1], ...banners, banners[0]] : banners;

  useEffect(() => {
    setActiveIndex((index) => Math.min(index, Math.max(0, banners.length - 1)));
    const element = viewport.current;
    if (!element) return;
    const frame = requestAnimationFrame(() => element.scrollTo({ left: multiple ? element.clientWidth : 0, behavior: 'auto' }));
    return () => cancelAnimationFrame(frame);
  }, [banners.length, multiple]);

  const normalizeLoop = useCallback((physicalIndex: number) => {
    if (!multiple || !viewport.current) return;
    if (normalizeTimer.current !== null) clearTimeout(normalizeTimer.current);
    normalizeTimer.current = setTimeout(() => {
      const element = viewport.current;
      if (!element) return;
      const target = physicalIndex === 0 ? banners.length : 1;
      element.scrollTo({ left: target * element.clientWidth, behavior: 'auto' });
      normalizeTimer.current = null;
    }, 350);
  }, [banners.length, multiple]);

  const updateActiveIndex = useCallback(() => {
    const element = viewport.current;
    if (!element || !element.clientWidth || !banners.length) return;
    const physicalIndex = Math.round(element.scrollLeft / element.clientWidth);
    const realIndex = !multiple
      ? 0
      : physicalIndex === 0
        ? banners.length - 1
        : physicalIndex >= banners.length + 1
          ? 0
          : physicalIndex - 1;
    setActiveIndex(Math.min(banners.length - 1, Math.max(0, realIndex)));
    if (physicalIndex === 0 || physicalIndex >= banners.length + 1) normalizeLoop(physicalIndex);
  }, [banners.length, multiple, normalizeLoop]);

  const onScroll = useCallback(() => {
    if (scrollFrame.current !== null) cancelAnimationFrame(scrollFrame.current);
    scrollFrame.current = requestAnimationFrame(() => {
      scrollFrame.current = null;
      updateActiveIndex();
    });
  }, [updateActiveIndex]);

  useEffect(() => () => {
    if (scrollFrame.current !== null) cancelAnimationFrame(scrollFrame.current);
    if (normalizeTimer.current !== null) clearTimeout(normalizeTimer.current);
  }, []);

  const goToIndex = useCallback((index: number) => {
    if (!viewport.current || !banners.length) return;
    if (normalizeTimer.current !== null) clearTimeout(normalizeTimer.current);
    const nextIndex = (index + banners.length) % banners.length;
    const physicalIndex = multiple ? nextIndex + 1 : 0;
    viewport.current.scrollTo({ left: physicalIndex * viewport.current.clientWidth, behavior: 'smooth' });
    setActiveIndex(nextIndex);
  }, [banners.length, multiple]);

  const move = useCallback((direction: 'previous' | 'next') => {
    if (!multiple || !viewport.current) return;
    if (normalizeTimer.current !== null) clearTimeout(normalizeTimer.current);
    const nextIndex = (activeIndex + (direction === 'next' ? 1 : -1) + banners.length) % banners.length;
    const physicalIndex = activeIndex + 1 + (direction === 'next' ? 1 : -1);
    viewport.current.scrollTo({ left: physicalIndex * viewport.current.clientWidth, behavior: 'smooth' });
    setActiveIndex(nextIndex);
  }, [activeIndex, banners.length, multiple]);

  useEffect(() => {
    if (!multiple || paused) return;
    const interval = window.setInterval(() => move('next'), 6_000);
    return () => window.clearInterval(interval);
  }, [move, multiple, paused]);

  if (!banners.length) return null;

  return (
    <section
      aria-label="Featured promotions"
      aria-roledescription="carousel"
      className="my-5 sm:my-7"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="relative overflow-hidden">
        <p className="sr-only" aria-live="polite">Promotion {activeIndex + 1} of {banners.length}</p>
        <div
          ref={viewport}
          className="flex snap-x snap-mandatory overflow-x-auto overflow-y-hidden scroll-smooth scrollbar-hide overscroll-x-contain touch-pan-x"
          tabIndex={0}
          role="group"
          aria-label="Promotional banners"
          onScroll={onScroll}
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft') move('previous');
            if (event.key === 'ArrowRight') move('next');
          }}
          onTouchStart={() => {
            if (normalizeTimer.current !== null) clearTimeout(normalizeTimer.current);
            setPaused(true);
          }}
          onTouchEnd={() => setPaused(false)}
        >
          {slides.map((banner, slideIndex) => (
            <div key={`${banner.tracking_token}-${slideIndex}`} className="w-full min-w-full shrink-0 snap-start">
              <Banner banner={banner} hero />
            </div>
          ))}
        </div>
        {multiple && <>
          <button type="button" onClick={() => move('previous')} className="absolute left-2 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-white text-[#0052a3] shadow-[0_4px_18px_rgba(15,23,42,0.45)] transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-[#0052a3] focus:ring-offset-2 sm:left-4 sm:inline-flex sm:h-12 sm:w-12 lg:left-6" aria-label="Previous banner"><svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="m15 18-6-6 6-6" /></svg></button>
          <button type="button" onClick={() => move('next')} className="absolute right-2 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-white text-[#0052a3] shadow-[0_4px_18px_rgba(15,23,42,0.45)] transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-[#0052a3] focus:ring-offset-2 sm:right-4 sm:inline-flex sm:h-12 sm:w-12 lg:right-6" aria-label="Next banner"><svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="m9 18 6-6-6-6" /></svg></button>
        </>}
        {multiple && <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-slate-950/35 px-2.5 py-1.5 backdrop-blur" role="tablist" aria-label="Banner slides">{banners.map((banner, index) => <button key={banner.tracking_token} type="button" role="tab" aria-selected={index === activeIndex} aria-label={`Show banner ${index + 1}`} onClick={() => goToIndex(index)} className={`h-1.5 rounded-full transition-all ${index === activeIndex ? 'w-5 bg-white' : 'w-1.5 bg-white/60 hover:bg-white'}`} />)}</div>}
      </div>
    </section>
  );
}

export function HomepagePromotionalBanners() {
  const [banners, setBanners] = useState<CampaignBanner[]>([]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let active = true;
    const load = async () => {
      const results = await Promise.allSettled([
        campaignService.banners('homepage_hero'),
        campaignService.banners('homepage_featured'),
      ]);
      if (!active) return;
      const nextBanners = results.flatMap((result) => result.status === 'fulfilled' ? result.value : []);
      setBanners(Array.from(new Map(nextBanners.map((banner) => [banner.tracking_token, banner])).values()));
    };

    void load();
    const refresh = window.setInterval(load, 30_000);
    return () => { active = false; window.clearInterval(refresh); };
  }, []);

  useEffect(() => {
    const nextEnd = banners.map((banner) => Date.parse(banner.ends_at)).filter(Number.isFinite).filter((end) => end > Date.now()).sort((a, b) => a - b)[0];
    if (!nextEnd) return;
    const timer = window.setTimeout(() => setNow(Date.now()), Math.max(0, nextEnd - Date.now()) + 25);
    return () => window.clearTimeout(timer);
  }, [banners, now]);

  const visibleBanners = banners.filter((banner) => {
    const end = Date.parse(banner.ends_at);
    return !Number.isFinite(end) || end > now;
  });

  if (!visibleBanners.length) return null;
  return <HeroBannerCarousel banners={visibleBanners} />;
}

export default function PromotionalBanners({ placement, categoryId, storeId }: { placement: Placement; categoryId?: number; storeId?: number }) {
  const [banners, setBanners] = useState<CampaignBanner[]>([]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let active = true;
    const load = () => campaignService.banners(placement, categoryId, storeId).then((data) => { if (active) setBanners(data); }).catch(() => { if (active) setBanners([]); });
    void load();
    const refresh = window.setInterval(load, 30_000);
    return () => { active = false; window.clearInterval(refresh); };
  }, [placement, categoryId, storeId]);

  useEffect(() => {
    const nextEnd = banners.map((banner) => Date.parse(banner.ends_at)).filter(Number.isFinite).filter((end) => end > Date.now()).sort((a, b) => a - b)[0];
    if (!nextEnd) return;
    const timer = window.setTimeout(() => setNow(Date.now()), Math.max(0, nextEnd - Date.now()) + 25);
    return () => window.clearTimeout(timer);
  }, [banners, now]);

  const visibleBanners = banners.filter((banner) => {
    const end = Date.parse(banner.ends_at);
    return !Number.isFinite(end) || end > now;
  });

  if (!visibleBanners.length) return null;
  if (placement === 'homepage_hero' || placement === 'homepage_featured') return <HeroBannerCarousel banners={visibleBanners} />;
  return <section aria-label={`${placement.replaceAll('_', ' ')} promotions`} className={`my-6 grid gap-4 ${placement === 'sidebar' ? '' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>{visibleBanners.map((banner) => <Banner key={banner.tracking_token} banner={banner} />)}</section>;
}

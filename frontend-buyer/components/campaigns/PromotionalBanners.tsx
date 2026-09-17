'use client';

import { useEffect, useRef, useState } from 'react';
import { campaignService, type CampaignBanner, type Placement } from '@/services/campaign-service';

function Banner({ banner }: { banner: CampaignBanner }) {
  const element = useRef<HTMLAnchorElement>(null); const impression = useRef<Promise<void> | null>(null); const visible = useRef(false);
  const record = () => { if (!impression.current) impression.current = campaignService.event(banner.tracking_token,'impression').catch(() => { impression.current = null; }); return impression.current; };
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const observer = new IntersectionObserver(entries => {
      visible.current = entries.some(e => e.isIntersecting && e.intersectionRatio >= 0.5);
      if (timer) clearTimeout(timer);
      if (visible.current && document.visibilityState === 'visible') timer = setTimeout(() => { if (visible.current && document.visibilityState === 'visible') void record(); },1000);
    }, { threshold: [0,0.5,1] });
    if (element.current) observer.observe(element.current);
    const onVisibility = () => { if (document.visibilityState !== 'visible' && timer) clearTimeout(timer); else if (visible.current) timer = setTimeout(() => void record(),1000); };
    document.addEventListener('visibilitychange',onVisibility);
    return () => { observer.disconnect(); if (timer) clearTimeout(timer); document.removeEventListener('visibilitychange',onVisibility); };
  }, [banner.tracking_token]);
  return <a ref={element} className="block overflow-hidden rounded-xl border bg-white shadow-sm" href={banner.destination} rel="noopener noreferrer" onClick={async e => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) { if (visible.current) void record()?.then(() => campaignService.event(banner.tracking_token,'click')).catch(()=>{}); return; }
    e.preventDefault();
    if (visible.current) { await Promise.race([record()?.then(() => campaignService.event(banner.tracking_token,'click')).catch(()=>{}),new Promise(resolve=>setTimeout(resolve,700))]); }
    window.location.assign(banner.destination);
  }}><picture><source media="(max-width: 640px)" srcSet={banner.creative.mobile_url || banner.creative.desktop_url} /><img src={banner.creative.desktop_url} alt={banner.creative.alt_text} className={`w-full object-cover ${banner.placement==='homepage_hero' ? 'max-h-96' : 'max-h-56'}`} /></picture><div className="p-4"><h3 className="font-semibold">{banner.creative.title}</h3>{banner.creative.description && <p className="text-sm text-gray-600 mt-1">{banner.creative.description}</p>}<span className="inline-block mt-3 font-semibold text-blue-700">{banner.creative.cta_text} →</span></div></a>;
}

export default function PromotionalBanners({ placement, categoryId, storeId }: { placement: Placement; categoryId?: number; storeId?: number }) {
  const [banners,setBanners]=useState<CampaignBanner[]>([]);
  useEffect(()=>{ let active=true; setBanners([]); campaignService.banners(placement,categoryId,storeId).then(data=>{ if(active) setBanners(data); }).catch(()=>{}); return ()=>{active=false;}; },[placement,categoryId,storeId]);
  if (!banners.length) return null;
  return <section aria-label={`${placement.replaceAll('_',' ')} promotions`} className={`my-6 grid gap-4 ${placement==='homepage_hero' || placement==='sidebar' ? '' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>{banners.map(b=><Banner key={b.tracking_token} banner={b} />)}</section>;
}

'use client';

import { useEffect, useState } from 'react';
import type { CampaignPrice } from '@/services/campaign-service';

type Promotion = Pick<CampaignPrice, 'campaign_id' | 'campaign_name' | 'applied_campaign' | 'campaigns'> | null | undefined;

function campaignFor(pricing: Promotion) {
  if (!pricing?.campaign_id) return null;
  return pricing.applied_campaign ?? pricing.campaigns?.find((campaign) => campaign.id === pricing.campaign_id) ?? null;
}

function formatRemaining(milliseconds: number) {
  const totalMinutes = Math.max(0, Math.floor(milliseconds / 60_000));
  const days = Math.floor(totalMinutes / 1_440);
  const hours = Math.floor((totalMinutes % 1_440) / 60);
  const minutes = totalMinutes % 60;
  return `${String(days).padStart(2, '0')}d ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`;
}

/**
 * A client-side companion to the centrally calculated campaign price.  It only
 * renders while the server-calculated campaign is still current, so an expired
 * offer cannot remain visible while the next catalog refresh is in flight.
 */
export default function DiscountCampaignIndicator({
  pricing,
  compact = false,
  className = '',
}: {
  pricing: Promotion;
  compact?: boolean;
  className?: string;
}) {
  const campaign = campaignFor(pricing);
  const end = campaign?.ends_at ? Date.parse(campaign.ends_at) : Number.NaN;
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (!campaign || !Number.isFinite(end)) return;
    const update = () => setNow(Date.now());
    update();
    const interval = window.setInterval(update, 1_000);
    return () => window.clearInterval(interval);
  }, [campaign?.id, end]);

  if (!campaign || !Number.isFinite(end) || now === null || end <= now) return null;

  return (
    <div
      className={`rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-rose-800 ${compact ? 'text-[11px]' : 'text-xs'} ${className}`.trim()}
      aria-label={`Discount campaign active. Ends in ${formatRemaining(end - now)}`}
      title={campaign.name}
    >
      <span className="block font-bold uppercase tracking-wide">Discount campaign active</span>
      <span className="block font-semibold">Ends in: {formatRemaining(end - now)}</span>
    </div>
  );
}

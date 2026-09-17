'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { referralService, type ReferralDashboard } from '@/services/referral-service';

const euro = (value: string | number) => `€${Number(value || 0).toFixed(2)}`;

export default function ReferralPanel() {
  const [data, setData] = useState<ReferralDashboard | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const search = useSearchParams();
  const productId = search.get('product');
  useEffect(() => {
    referralService.dashboard(productId ? Number(productId) : undefined).then(setData).catch((e: unknown) => {
      const response = (e as { response?: { status?: number; data?: { message?: string } } }).response;
      setError(response?.status && response.status >= 500 ? 'Referrals are temporarily unavailable. Please try again shortly.' : response?.data?.message || 'Unable to load referrals.');
    });
  }, [productId]);
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  const platformUrl = data ? `${origin}${data.platform.link}` : '';
  const counts = useMemo(() => ['pending', 'qualified', 'rewarded', 'rejected', 'reversed'] as const, []);
  const copy = async (value: string, label: string) => { await navigator.clipboard.writeText(value); setCopied(label); window.setTimeout(() => setCopied(''), 1800); };
  if (error) return <section className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">{error}</section>;
  if (!data) return <section className="rounded-2xl border bg-white p-6 text-gray-500">Loading your referral program…</section>;
  return <section className="space-y-6">
    <div className="rounded-2xl border bg-gradient-to-br from-teal-50 to-white p-6">
      <p className="text-sm font-semibold text-teal-700">Refer &amp; Earn</p><h2 className="mt-1 text-2xl font-bold text-gray-900">Invite a new buyer</h2>
      <p className="mt-2 text-sm text-gray-600">Your permanent code is <strong>{data.platform.code}</strong>. Attribution lasts {data.platform.attribution_days} days; rewards follow a paid, delivered, protected order.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]"><code className="rounded-lg bg-white p-3 text-sm break-all">{platformUrl}</code><button onClick={() => void copy(platformUrl, 'platform')} className="rounded-lg bg-teal-700 px-4 py-2 font-medium text-white">{copied === 'platform' ? 'Copied' : 'Copy link'}</button></div>
    </div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{counts.map((status) => <div key={status} className="rounded-xl border bg-white p-4"><p className="text-xs uppercase tracking-wide text-gray-500">{status}</p><p className="mt-1 text-2xl font-bold">{data.stats[status] || 0}</p></div>)}</div>
    <div className="rounded-xl border bg-white p-6"><div className="flex flex-wrap justify-between gap-3"><div><h3 className="font-bold">Seller referral campaigns</h3><p className="text-sm text-gray-600">Share a Buyer-specific campaign link. It only rewards eligible products from that seller.</p></div>{productId && <p className="text-sm text-teal-700">Sharing from product #{productId}</p>}</div>
      <div className="mt-4 space-y-3">{data.campaigns.length === 0 ? <p className="text-sm text-gray-500">There are no active seller campaigns right now.</p> : data.campaigns.map((campaign) => {
        const product = productId ? `&product=${encodeURIComponent(productId)}` : '';
        const link = `${origin}/referral/campaign/${encodeURIComponent(campaign.identifier)}?referrer=${encodeURIComponent(data.platform.code)}${product}`;
        return <article key={campaign.id} className="rounded-lg border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold">{campaign.name}</p><p className="text-sm text-gray-600">{campaign.store?.name} · {campaign.reward_type === 'percentage' ? `${campaign.reward_amount}% of eligible items` : euro(campaign.reward_amount)} · {campaign.scope_type} scope</p><p className="mt-1 text-xs text-gray-500">{campaign.new_customer_only ? 'New customer only' : 'Existing buyers allowed'} · Minimum {euro(campaign.minimum_order_amount)} · Ends {campaign.ends_at ? new Date(campaign.ends_at).toLocaleDateString() : 'when paused'}</p></div><button onClick={() => void copy(link, `campaign-${campaign.id}`)} className="rounded-lg border border-teal-700 px-3 py-2 text-sm font-medium text-teal-700">{copied === `campaign-${campaign.id}` ? 'Copied' : 'Copy campaign link'}</button></div>
          {(campaign.products?.length || campaign.categories?.length) ? <p className="mt-3 text-xs text-gray-600">Eligible: {[...(campaign.products || []).map(p => p.name), ...(campaign.categories || []).map(c => c.name)].join(', ')}</p> : null}</article>;
      })}</div>
    </div>
    <div className="rounded-xl border bg-white p-6"><div className="flex justify-between"><h3 className="font-bold">Referral history</h3><p className="font-semibold text-teal-700">Total paid {euro(data.stats.total_rewards || 0)}</p></div><div className="mt-4 space-y-3">{data.history.data.length === 0 ? <p className="text-sm text-gray-500">No referral rewards yet.</p> : data.history.data.map(row => <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-gray-50 p-3 text-sm"><div><p className="font-medium">{row.source === 'platform' ? 'Platform referral reward' : row.campaign?.name || 'Seller referral reward'} · {row.referred?.name || 'Buyer'}</p><p className="text-xs text-gray-500">Order {row.order?.order_no || 'pending'} · Eligible subtotal {euro(row.eligible_subtotal)} {row.reason ? `· ${row.reason}` : ''}</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${row.status === 'rewarded' ? 'bg-green-100 text-green-700' : row.status === 'reversed' || row.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{row.status} · {euro(row.amount)}</span></div>)}</div></div>
  </section>;
}

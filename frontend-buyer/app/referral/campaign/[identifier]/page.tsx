'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { referralService, storeReferralAttribution } from '@/services/referral-service';

export default function CampaignReferralLandingPage() {
  return <Suspense fallback={<main className="min-h-[65vh]" />}><CampaignReferralLandingPageContent /></Suspense>;
}

function CampaignReferralLandingPageContent() {
  const params = useParams<{ identifier: string }>();
  const search = useSearchParams();
  const product = search.get('product');
  const referrer = search.get('referrer');
  const incomplete = !referrer || !params.identifier;
  const [message, setMessage] = useState(() => incomplete ? 'This referral link is incomplete.' : 'Validating referral link…');
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    if (incomplete) return;
    referralService.track(referrer, params.identifier, product ? Number(product) : undefined)
      .then((data) => { storeReferralAttribution(data.token); setToken(data.token); setMessage('This referral is saved for your next buyer registration.'); })
      .catch(() => setMessage('This referral campaign is invalid, paused, or expired.'));
  }, [incomplete, params.identifier, product, referrer]);
  const destination = product ? `/products/${encodeURIComponent(product)}` : '/products';
  return <main className="mx-auto flex min-h-[65vh] max-w-xl items-center px-4 py-12"><section className="w-full rounded-2xl border bg-white p-8 text-center shadow-sm"><p className="text-sm font-semibold text-teal-700">VistaExpress referral</p><h1 className="mt-2 text-3xl font-bold">Shop, then refer friends</h1><p className="mt-4 text-gray-600">{message}</p>{token ? <p className="mt-3 text-sm text-gray-500">Rewards apply only to the campaign’s eligible seller products and are paid after a qualifying delivered order.</p> : null}<div className="mt-7 flex flex-wrap justify-center gap-3"><Link href={`/auth/register/buyer${referrer ? `?ref=${encodeURIComponent(referrer)}` : ''}`} className="rounded-lg bg-[#0066CC] px-5 py-3 font-medium text-white">Create buyer account</Link><Link href={destination} className="rounded-lg border px-5 py-3 font-medium text-gray-700">{product ? 'View eligible product' : 'Browse products'}</Link></div></section></main>;
}

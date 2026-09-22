'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdShell from '@/components/ads/AdShell';
import CampaignList from '@/components/ads/CampaignList';
import BoostWizard from '@/components/ads/BoostWizard';
import { adService, adError, type CampaignDraft } from '@/services/ad-service';
import { walletService } from '@/services/wallet-service';
import { useLanguage } from '@/contexts/LanguageContext';

function Campaigns() {
  const { t } = useLanguage(); const router = useRouter(); const [open, setOpen] = useState(false); const [initial, setInitial] = useState<Partial<CampaignDraft>>();
  const [error, setError] = useState(''); const [message, setMessage] = useState(''); const [fundingOpen, setFundingOpen] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const duplicate = params.get('duplicate');
    if (duplicate) adService.duplicate(Number(duplicate)).then(data => { setInitial(data); setOpen(true); }).catch(e => setError(adError(e)));
  }, []);
  return <div className="space-y-6 text-slate-900"><div className="flex flex-wrap justify-between items-start gap-4"><div><h1 className="text-3xl font-bold">{t('ads.title')}</h1><p className="text-slate-600 mt-2">{t('ads.subtitle')}</p></div><div className="flex flex-wrap gap-3"><button className="rounded-lg border border-blue-700 px-5 py-3 text-blue-700" onClick={() => setFundingOpen(true)}>{t('ads.addFunds')}</button><button className="bg-blue-700 text-white rounded-lg px-5 py-3" onClick={() => { setInitial(undefined); setOpen(true); }}>{t('ads.boostProduct')}</button></div></div>
    {error && <p role="alert" className="bg-red-50 text-red-800 p-4 rounded-lg">{error}</p>}{message && <p role="status" className="bg-green-50 text-green-800 p-4 rounded-lg">{message}</p>}
    <CampaignList />
    {open && <BoostWizard initial={initial} onClose={() => setOpen(false)} onCreated={campaign => { setOpen(false); router.push('/boost-ads/' + campaign.id); }} />}
    {fundingOpen && <AddFundsModal onClose={() => setFundingOpen(false)} onAdded={() => { setFundingOpen(false); setMessage(t('ads.fundsAdded')); }} />}
  </div>;
}

function AddFundsModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null); const request = useRef<{ amount: string; key: string } | null>(null); const [amount, setAmount] = useState('25'); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  useEffect(() => { dialog.current?.showModal(); }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (busy) return; setBusy(true); setError('');
    const key = request.current?.amount === amount ? request.current.key : crypto.randomUUID(); request.current = { amount, key };
    try { await walletService.topUp({ amount, idempotency_key: key }); request.current = null; onAdded(); }
    catch (e) { setError(adError(e)); } finally { setBusy(false); }
  }
  return <dialog ref={dialog} onCancel={e => { e.preventDefault(); if (!busy) onClose(); }} aria-labelledby="add-funds-title" className="seller-mobile-sheet fixed inset-x-0 bottom-0 top-auto m-0 h-fit w-full max-w-none rounded-t-3xl border-0 p-0 shadow-xl backdrop:bg-black/50 sm:inset-0 sm:m-auto sm:w-[min(92vw,420px)] sm:rounded-2xl">
    <form onSubmit={submit} className="p-4 sm:p-6"><span className="mx-auto mb-3 block h-1 w-10 rounded-full bg-slate-200 sm:hidden" /><div className="flex items-center justify-between gap-4"><h2 id="add-funds-title" className="text-lg font-bold sm:text-xl">Add Funds</h2><button type="button" aria-label="Close" disabled={busy} onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100">✕</button></div><p className="mt-2 text-sm text-slate-600">Enter the amount to add to your Seller Wallet.</p>{error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}<label className="mt-5 block text-sm font-medium">Amount (EUR)<input autoFocus type="number" required min="5" max="100000" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="mt-1 block w-full rounded-lg border px-3 py-2" /></label><div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3"><button type="button" disabled={busy} onClick={onClose} className="rounded-lg px-4 py-2">Cancel</button><button disabled={busy} className="rounded-lg bg-blue-700 px-4 py-2 text-white disabled:opacity-50">{busy ? 'Adding…' : 'Confirm'}</button></div></form>
  </dialog>;
}
export default function BoostAdsPage() {
  const { t } = useLanguage();
  return <AdShell><Suspense fallback={<p>{t('ads.loadingCampaigns')}</p>}><Campaigns /></Suspense></AdShell>;
}

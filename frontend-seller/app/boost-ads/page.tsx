'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdShell from '@/components/ads/AdShell';
import CampaignList from '@/components/ads/CampaignList';
import BoostWizard from '@/components/ads/BoostWizard';
import { adService, adError, type CampaignDraft } from '@/services/ad-service';
import { walletService } from '@/services/wallet-service';

function Campaigns() {
  const router = useRouter(); const [open, setOpen] = useState(false); const [initial, setInitial] = useState<Partial<CampaignDraft>>();
  const [error, setError] = useState(''); const [message, setMessage] = useState(''); const [fundingOpen, setFundingOpen] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const duplicate = params.get('duplicate');
    if (duplicate) adService.duplicate(Number(duplicate)).then(data => { setInitial(data); setOpen(true); }).catch(e => setError(adError(e)));
  }, []);
  return <div className="space-y-6 text-slate-900"><div className="flex flex-wrap justify-between items-start gap-4"><div><h1 className="text-3xl font-bold">Boost Ads</h1><p className="text-slate-600 mt-2">Promote your products with CPC campaigns. Review performance and manage reserved funds.</p></div><div className="flex flex-wrap gap-3"><button className="rounded-lg border border-blue-700 px-5 py-3 text-blue-700" onClick={() => setFundingOpen(true)}>Add Funds</button><button className="bg-blue-700 text-white rounded-lg px-5 py-3" onClick={() => { setInitial(undefined); setOpen(true); }}>Boost Product</button></div></div>
    {error && <p role="alert" className="bg-red-50 text-red-800 p-4 rounded-lg">{error}</p>}{message && <p role="status" className="bg-green-50 text-green-800 p-4 rounded-lg">{message}</p>}
    <CampaignList />
    {open && <BoostWizard initial={initial} onClose={() => setOpen(false)} onCreated={campaign => { setOpen(false); router.push('/boost-ads/' + campaign.id); }} />}
    {fundingOpen && <AddFundsModal onClose={() => setFundingOpen(false)} onAdded={() => { setFundingOpen(false); setMessage('Funds were added to your Seller Wallet.'); }} />}
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
  return <dialog ref={dialog} onCancel={e => { e.preventDefault(); if (!busy) onClose(); }} aria-labelledby="add-funds-title" className="fixed inset-0 m-auto h-fit w-[min(92vw,420px)] rounded-2xl p-0 shadow-xl backdrop:bg-black/50">
    <form onSubmit={submit} className="p-6"><div className="flex items-center justify-between gap-4"><h2 id="add-funds-title" className="text-xl font-bold">Add Funds</h2><button type="button" aria-label="Close" disabled={busy} onClick={onClose}>✕</button></div><p className="mt-2 text-sm text-slate-600">Enter the amount to add to your Seller Wallet.</p>{error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}<label className="mt-5 block text-sm font-medium">Amount (EUR)<input autoFocus type="number" required min="5" max="100000" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="mt-1 block w-full rounded-lg border px-3 py-2" /></label><div className="mt-6 flex justify-end gap-3"><button type="button" disabled={busy} onClick={onClose} className="rounded-lg px-4 py-2">Cancel</button><button disabled={busy} className="rounded-lg bg-blue-700 px-4 py-2 text-white disabled:opacity-50">{busy ? 'Adding…' : 'Confirm'}</button></div></form>
  </dialog>;
}
export default function BoostAdsPage() {
  return <AdShell><Suspense fallback={<p>Loading campaigns…</p>}><Campaigns /></Suspense></AdShell>;
}

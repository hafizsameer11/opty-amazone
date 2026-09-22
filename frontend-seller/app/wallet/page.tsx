'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { walletService, type LedgerEntry, type Page, type SellerWallet, type Withdrawal } from '@/services/wallet-service';
import { useLanguage } from '@/contexts/LanguageContext';

const eur = (value: string | number | undefined) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(Number(value || 0));
const label = (value: string) => value.replaceAll('_', ' ');
const errorText = (error: unknown, fallback: string) => (error as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

export default function SellerWalletPage() {
  const { isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const [wallet, setWallet] = useState<SellerWallet | null>(null);
  const [entries, setEntries] = useState<Page<LedgerEntry> | null>(null);
  const [withdrawals, setWithdrawals] = useState<Page<Withdrawal> | null>(null);
  const [entryPage, setEntryPage] = useState(1); const [withdrawalPage, setWithdrawalPage] = useState(1);
  const [history, setHistory] = useState<'transactions' | 'withdrawals'>('transactions');
  const [modal, setModal] = useState<'fund' | 'withdraw' | null>(null);
  const [form, setForm] = useState({ amount: '', account_name: '', account_number: '', bank_name: '' });
  const [topUpAmount, setTopUpAmount] = useState('25'); const [busy, setBusy] = useState(false);
  const [error, setError] = useState(''); const [message, setMessage] = useState('');
  const topUpRequest = useRef<{ amount: string; key: string } | null>(null);
  const load = useCallback(async () => {
    try {
      const [summary, transactions, requests] = await Promise.all([walletService.summary(), walletService.transactions(entryPage), walletService.withdrawals(withdrawalPage)]);
      setWallet(summary); setEntries(transactions); setWithdrawals(requests); setError('');
    } catch (e: unknown) { setError(errorText(e, t('wallet.refreshFailed'))); }
  }, [entryPage, withdrawalPage, t]);
  useEffect(() => { if (isAuthenticated) void load(); }, [isAuthenticated, load]);
  useLiveRefresh(load, isAuthenticated);
  const withdraw = async (e: React.FormEvent) => {
    e.preventDefault(); if (busy) return; setBusy(true); setError(''); setMessage('');
    const slot = 'opty-seller-withdrawal'; const fingerprint = JSON.stringify(form);
    let saved: { fingerprint: string; key: string } | null = null;
    try { saved = JSON.parse(sessionStorage.getItem(slot) || 'null'); } catch { /* New request */ }
    const key = saved?.fingerprint === fingerprint ? saved.key : crypto.randomUUID();
    sessionStorage.setItem(slot, JSON.stringify({ fingerprint, key }));
    try {
      await walletService.withdraw({ amount: form.amount, idempotency_key: key, bank_details: { account_name: form.account_name, account_number: form.account_number, bank_name: form.bank_name } });
      sessionStorage.removeItem(slot); setForm({ ...form, amount: '' }); setModal(null); setHistory('withdrawals'); setMessage(t('wallet.withdrawalRequested')); await load();
    } catch (e: unknown) { setError(errorText(e, t('wallet.withdrawalFailed'))); }
    finally { setBusy(false); }
  };
  const topUp = async (e: React.FormEvent) => {
    e.preventDefault(); if (busy) return; setBusy(true); setError(''); setMessage('');
    const key = topUpRequest.current?.amount === topUpAmount ? topUpRequest.current.key : crypto.randomUUID();
    topUpRequest.current = { amount: topUpAmount, key };
    try { await walletService.topUp({ amount: topUpAmount, idempotency_key: key }); topUpRequest.current = null; setModal(null); setHistory('transactions'); setMessage(t('wallet.fundsAdded')); await load(); }
    catch (e: unknown) { setError(errorText(e, t('wallet.addFundsFailed'))); }
    finally { setBusy(false); }
  };
  const primaryMetrics: [string, keyof SellerWallet][] = [[t('wallet.availableBalance'), 'available_balance'], [t('wallet.adsReserved'), 'ad_reserved_balance'], [t('wallet.adsSpend'), 'ad_spend_total'], [t('wallet.pendingEarnings'), 'pending_balance']];
  const details: [string, keyof SellerWallet][] = [[t('wallet.topUps'), 'top_up_total'], [t('wallet.lockedEscrow'), 'locked_escrow_amount'], [t('wallet.totalEarnings'), 'total_earnings'], [t('wallet.reservedCommitments'), 'reserved_balance'], [t('wallet.disputedEarnings'), 'disputed_balance']];
  return <div className="min-h-screen bg-gray-50 pb-24"><Header /><div className="flex"><Sidebar /><main className="min-w-0 flex-1 space-y-6 p-5 lg:p-8">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-bold text-gray-900">{t('wallet.title')}</h1><p className="mt-2 text-gray-600">{t('wallet.subtitle')}</p></div><div className="flex flex-wrap gap-3"><button onClick={() => { setError(''); setModal('fund'); }} className="rounded-lg border border-blue-700 px-5 py-3 font-medium text-blue-700">{t('wallet.addFunds')}</button><button onClick={() => { setError(''); setModal('withdraw'); }} className="rounded-lg bg-blue-700 px-5 py-3 font-medium text-white">{t('wallet.requestWithdrawal')}</button></div></header>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-700">{error}</p>}{message && <p role="status" className="rounded-lg bg-green-50 p-4 text-green-800">{message}</p>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{primaryMetrics.map(([title, key]) => <div key={key} className="rounded-xl border bg-white p-5"><p className="text-sm text-gray-500">{title}</p><p className="mt-2 text-2xl font-bold text-gray-900">{wallet ? eur(String(wallet[key])) : '…'}</p></div>)}</div>
    <p className="text-sm text-gray-600">{t('wallet.description')}</p>
    {Number(wallet?.debt_balance) > 0 && <p className="rounded-lg bg-amber-50 p-4 text-amber-900">{t('wallet.refundDebt', { amount: eur(wallet?.debt_balance) })}</p>}
    <details className="rounded-xl border bg-white p-5"><summary className="cursor-pointer font-semibold text-gray-900">{t('wallet.details')}</summary><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{details.map(([title, key]) => <div key={key}><p className="text-sm text-gray-500">{title}</p><p className="mt-1 font-semibold text-gray-900">{wallet ? eur(String(wallet[key])) : '…'}</p></div>)}</div></details>
    <section className="rounded-xl border bg-white p-5"><div className="mb-5 flex border-b"><button onClick={() => setHistory('transactions')} className={`border-b-2 px-4 py-3 text-sm font-medium ${history === 'transactions' ? 'border-blue-700 text-blue-700' : 'border-transparent text-gray-500'}`}>{t('wallet.transactionHistory')}</button><button onClick={() => setHistory('withdrawals')} className={`border-b-2 px-4 py-3 text-sm font-medium ${history === 'withdrawals' ? 'border-blue-700 text-blue-700' : 'border-transparent text-gray-500'}`}>{t('wallet.withdrawalHistory')}</button></div>
      <div className="overflow-x-auto">{history === 'transactions' ? <TransactionHistory entries={entries} page={entryPage} setPage={setEntryPage} /> : <WithdrawalHistory withdrawals={withdrawals} page={withdrawalPage} setPage={setWithdrawalPage} />}</div>
    </section>
    {modal === 'fund' && <WalletModal title={t('wallet.addFunds')} onClose={() => !busy && setModal(null)}><form onSubmit={topUp} className="space-y-5"><p className="text-sm text-gray-600">{t('wallet.addFundsHint')}</p>{error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}<label className="block text-sm font-medium">{t('wallet.amountEur')}<input autoFocus type="number" required min="5" max="100000" step=".01" value={topUpAmount} onChange={e => setTopUpAmount(e.target.value)} className="mt-1 block w-full rounded-lg border px-3 py-2" /></label><ModalActions busy={busy} onCancel={() => setModal(null)} submit={t('wallet.confirm')} /></form></WalletModal>}
    {modal === 'withdraw' && <WalletModal title={t('wallet.requestWithdrawal')} onClose={() => !busy && setModal(null)}><form onSubmit={withdraw} className="grid gap-4 sm:grid-cols-2">{error && <p role="alert" className="sm:col-span-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}{([['amount', 'wallet.amountEur'], ['account_name', 'wallet.accountName'], ['account_number', 'wallet.accountNumber'], ['bank_name', 'wallet.bankName']] as const).map(([key, translationKey]) => <label key={key} className={`block text-sm font-medium ${key === 'amount' ? 'sm:col-span-2' : ''}`}>{t(translationKey)}<input className="mt-1 block w-full rounded-lg border px-3 py-2" aria-label={t(translationKey)} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} required type={key === 'amount' ? 'number' : 'text'} min={key === 'amount' ? '10' : undefined} max={key === 'amount' ? Number(wallet?.available_balance || 0) : undefined} step={key === 'amount' ? '.01' : undefined} /></label>)}<div className="sm:col-span-2"><ModalActions busy={busy || !wallet || Number(wallet.available_balance) < 10 || Number(wallet.debt_balance) > 0} onCancel={() => setModal(null)} submit={t('wallet.submitRequest')} /></div></form></WalletModal>}
  </main></div><BottomNav /></div>;
}

function TransactionHistory({ entries, page, setPage }: { entries: Page<LedgerEntry> | null; page: number; setPage: (page: number) => void }) {
  const { t } = useLanguage();
  return <><table className="w-full text-left text-sm"><thead><tr>{['wallet.date', 'wallet.type', 'wallet.campaignReference', 'wallet.amount', 'wallet.status', 'wallet.availableAfter', 'wallet.adsReservedAfter'].map(key => <th className="border-b p-3" key={key}>{t(key)}</th>)}</tr></thead><tbody>{entries?.data.map(e => <tr key={e.id}><td className="whitespace-nowrap p-3">{new Date(e.created_at).toLocaleString()}</td><td className="capitalize p-3">{label(e.type)}</td><td className="p-3">{e.ad_campaign_id ? <Link className="text-blue-700" href={`/boost-ads/${e.ad_campaign_id}`}>{e.description || t('wallet.boostCampaign', { id: e.ad_campaign_id })}</Link> : e.store_order_id ? <Link className="text-blue-700" href={`/orders/${e.store_order_id}`}>{t('wallet.order', { id: e.store_order_id })}</Link> : e.description || t('wallet.withdrawal', { id: e.withdrawal_id ?? '' })}</td><td className="p-3">{eur(e.amount)}</td><td className="p-3">{e.status}</td><td className="p-3">{eur(e.balances_after.available_balance)}</td><td className="p-3">{eur(e.balances_after.ad_reserved_balance)}</td></tr>)}</tbody></table>{!entries?.data.length && <p className="py-4 text-gray-500">{t('wallet.noTransactions')}</p>}<Pager page={page} last={entries?.last_page || 1} change={setPage} /></>;
}
function WithdrawalHistory({ withdrawals, page, setPage }: { withdrawals: Page<Withdrawal> | null; page: number; setPage: (page: number) => void }) {
  const { t } = useLanguage();
  return <><table className="w-full text-left text-sm"><thead><tr>{['wallet.request', 'wallet.amount', 'wallet.status', 'wallet.payoutReference', 'wallet.notes'].map(key => <th className="border-b p-3" key={key}>{t(key)}</th>)}</tr></thead><tbody>{withdrawals?.data.map(w => <tr key={w.id}><td className="p-3">#{w.id}<br />{new Date(w.created_at).toLocaleDateString()}</td><td className="p-3">{eur(w.amount)}</td><td className="capitalize p-3">{label(w.status)}</td><td className="p-3">{w.payout_reference || '—'}</td><td className="p-3">{w.notes || '—'}</td></tr>)}</tbody></table>{!withdrawals?.data.length && <p className="py-4 text-gray-500">{t('wallet.noWithdrawals')}</p>}<Pager page={page} last={withdrawals?.last_page || 1} change={setPage} /></>;
}
function WalletModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const { t } = useLanguage();
  const dialog = useRef<HTMLDialogElement>(null); useEffect(() => { dialog.current?.showModal(); }, []);
  return <dialog ref={dialog} onCancel={e => { e.preventDefault(); onClose(); }} aria-labelledby="wallet-modal-title" className="seller-mobile-sheet fixed inset-x-0 bottom-0 top-auto m-0 max-h-[90dvh] w-full max-w-none overflow-y-auto rounded-t-3xl border-0 p-0 shadow-xl backdrop:bg-black/50 sm:inset-0 sm:m-auto sm:h-fit sm:w-[min(92vw,560px)] sm:rounded-2xl"><div className="p-4 sm:p-6"><span className="mx-auto mb-3 block h-1 w-10 rounded-full bg-slate-200 sm:hidden" /><div className="mb-5 flex items-center justify-between gap-4"><h2 id="wallet-modal-title" className="min-w-0 truncate text-lg font-bold sm:text-xl">{title}</h2><button type="button" aria-label={t('wallet.close')} onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100">✕</button></div>{children}</div></dialog>;
}
function ModalActions({ busy, onCancel, submit }: { busy: boolean; onCancel: () => void; submit: string }) {
  const { t } = useLanguage();
  return <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3"><button type="button" disabled={busy} onClick={onCancel} className="rounded-lg px-4 py-2 disabled:opacity-50">{t('common.cancel')}</button><button disabled={busy} className="rounded-lg bg-blue-700 px-4 py-2 text-white disabled:opacity-50">{busy ? t('wallet.submitting') : submit}</button></div>;
}
function Pager({ page, last, change }: { page: number; last: number; change: (n: number) => void }) {
  const { t } = useLanguage();
  return <div className="mt-4 flex items-center gap-4 text-sm"><button disabled={page <= 1} onClick={() => change(page - 1)} className="disabled:opacity-40">{t('common.previous')}</button><span>{t('wallet.page', { page, last })}</span><button disabled={page >= last} onClick={() => change(page + 1)} className="disabled:opacity-40">{t('common.next')}</button></div>;
}

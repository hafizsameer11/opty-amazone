'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { referralService, type ReferralCampaign, type ReferralReward, type ReferralSettings } from '@/services/referral-service';

const euro = (value: unknown) => `€${Number(value || 0).toFixed(2)}`;
type Tab = 'overview' | 'campaigns' | 'rewards' | 'audit';
type AuditLog = { id: number; action: string; reason?: string | null; created_at: string; actor?: { email?: string }; reward?: { id: number }; campaign?: { name: string } };
const errorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    return response?.data?.message || fallback;
  }
  return fallback;
};

export default function AdminReferralsPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [settings, setSettings] = useState<ReferralSettings>({});
  const [campaigns, setCampaigns] = useState<ReferralCampaign[]>([]);
  const [rewards, setRewards] = useState<ReferralReward[]>([]);
  const [audit, setAudit] = useState<AuditLog[]>([]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, c, r, a] = await Promise.all([
        referralService.settings(), referralService.campaigns(), referralService.rewards(status ? { status } : undefined), referralService.audit(),
      ]);
      setSettings(s); setCampaigns(c.data || []); setRewards(r.data || []); setAudit(a.data || []); setError('');
    } catch (e: unknown) { setError(errorMessage(e, 'Unable to load referral administration.')); }
  }, [status]);
  useEffect(() => { void load(); }, [load]);
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true);
    try { setSettings(await referralService.updateSettings(settings)); }
    catch (e: unknown) { setError(errorMessage(e, 'Could not save referral settings.')); }
    finally { setSaving(false); }
  };
  const campaignAction = async (row: ReferralCampaign, action: 'approve' | 'reject' | 'suspend' | 'archive') => {
    const reason = action === 'approve' || action === 'archive' ? undefined : window.prompt(`Reason to ${action} campaign “${row.name}”`);
    if (action !== 'approve' && action !== 'archive' && !reason) return;
    await referralService.campaignAction(row.id, action, reason || undefined); await load();
  };
  const rewardAction = async (row: ReferralReward, action: 'approve' | 'reject' | 'suspend' | 'reverse') => {
    const reason = window.prompt(`Reason to ${action} referral reward #${row.id}`); if (!reason) return;
    await referralService.rewardAction(row.id, action, reason); await load();
  };
  const exportReport = async () => {
    try {
      const blob = await referralService.exportFinancialReport();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = 'referral-financial-report.csv'; link.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) { setError(errorMessage(e, 'Could not export the referral financial report.')); }
  };
  return <AdminLayout><div className="space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-3xl font-bold">Referral Program</h1><p className="mt-2 text-gray-600">Trace acquisition, campaign funding, Buyer Wallet credits, Seller Wallet ledger entries and platform costs.</p></div><button type="button" onClick={() => void exportReport()} className="rounded-lg border px-4 py-2 text-sm">Export financial report</button></header>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-700">{error}</p>}
    <nav className="flex flex-wrap gap-2">{(['overview', 'campaigns', 'rewards', 'audit'] as Tab[]).map(item => <button key={item} onClick={() => setTab(item)} className={`rounded-lg px-4 py-2 capitalize ${tab === item ? 'bg-blue-700 text-white' : 'border bg-white'}`}>{item}</button>)}</nav>
    {tab === 'overview' && <SettingsForm settings={settings} setSettings={setSettings} save={save} saving={saving} />}
    {tab === 'campaigns' && <Campaigns rows={campaigns} action={campaignAction} />}
    {tab === 'rewards' && <Rewards rows={rewards} status={status} setStatus={setStatus} action={rewardAction} />}
    {tab === 'audit' && <section className="rounded-xl border bg-white p-5"><h2 className="font-bold">Referral audit log</h2><div className="mt-4 space-y-3">{audit.map(row => <div key={row.id} className="rounded border p-3 text-sm"><p className="font-medium">{row.action} {row.reward && `· Reward #${row.reward.id}`} {row.campaign && `· ${row.campaign.name}`}</p><p className="text-gray-600">{row.reason || 'No reason recorded'} · {row.actor?.email || 'System'} · {new Date(row.created_at).toLocaleString()}</p></div>)}{!audit.length && <p className="text-sm text-gray-500">No referral audit records yet.</p>}</div></section>}
  </div></AdminLayout>;
}

function SettingsForm({ settings, setSettings, save, saving }: { settings: ReferralSettings; setSettings: React.Dispatch<React.SetStateAction<ReferralSettings>>; save: (e: React.FormEvent) => void; saving: boolean }) {
  const bool = (key: string, label: string) => <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(settings[key])} onChange={e => setSettings(s => ({ ...s, [key]: e.target.checked }))} />{label}</label>;
  const number = (key: string, label: string, step = '1') => <label className="block text-sm font-medium">{label}<input type="number" min="0" step={step} value={String(settings[key] ?? '')} onChange={e => setSettings(s => ({ ...s, [key]: e.target.value === '' ? null : Number(e.target.value) }))} className="mt-1 block w-full rounded border p-2" /></label>;
  return <form onSubmit={save} className="space-y-6 rounded-xl border bg-white p-6"><div><h2 className="text-xl font-bold">Platform referral settings</h2><p className="mt-1 text-sm text-gray-600">These settings govern platform-funded rewards. Seller campaigns retain their own budgets and scopes.</p></div><div className="grid gap-4 md:grid-cols-2">{bool('platform_referrals_enabled', 'Enable platform referral program')}{bool('seller_referrals_require_approval', 'Require Admin approval for seller campaigns')}{bool('seller_referrals_allow_existing_buyers', 'Allow existing buyers in seller campaigns')}{bool('referral_allow_platform_stacking', 'Allow seller + platform stacking')}{bool('referral_require_email_verification', 'Require verified email before rewarding')}{bool('referral_require_phone_verification', 'Require verified phone before rewarding')}<label className="block text-sm font-medium">Platform reward type<select value={String(settings.platform_referral_reward_type || 'fixed')} onChange={e => setSettings(s => ({ ...s, platform_referral_reward_type: e.target.value }))} className="mt-1 block w-full rounded border p-2"><option value="fixed">Fixed EUR</option><option value="percentage">Percentage</option></select></label>{number('platform_referral_reward_amount', 'Platform reward amount', '0.01')}{number('platform_referral_max_reward_per_order', 'Maximum platform reward per order', '0.01')}{number('platform_referral_minimum_order_amount', 'Minimum qualifying product subtotal', '0.01')}{number('referral_attribution_days', 'Attribution period in days')}{number('referral_reward_waiting_days', 'Delivery / return protection days')}{number('platform_referral_monthly_reward_limit', 'Platform monthly reward limit')}{number('platform_referral_per_buyer_limit', 'Platform per-buyer limit')}</div><button disabled={saving} className="rounded-lg bg-blue-700 px-5 py-3 font-medium text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save referral settings'}</button></form>;
}

function Campaigns({ rows, action }: { rows: ReferralCampaign[]; action: (row: ReferralCampaign, action: 'approve' | 'reject' | 'suspend' | 'archive') => void }) {
  return <section className="space-y-4">{rows.map(row => <article key={row.id} className="rounded-xl border bg-white p-5"><div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-bold">{row.name} <span className="text-sm font-normal text-gray-500">{row.identifier}</span></h2><p className="text-sm text-gray-600">{row.store?.name} · {row.seller?.email} · {row.status} / {row.approval_status}</p></div><p className="font-semibold">{euro(row.budget_spent)} paid / {euro(row.budget_reserved)} reserved</p></div>{row.analytics && <p className="mt-3 text-sm text-gray-600">{row.analytics.clicks} clicks · {row.analytics.orders} orders · {euro(row.analytics.revenue_generated)} revenue · {euro(row.analytics.referral_commission_cost)} commission</p>}<div className="mt-4 flex flex-wrap gap-2">{row.approval_status === 'pending' && <button onClick={() => action(row, 'approve')} className="rounded bg-green-700 px-3 py-2 text-sm text-white">Approve</button>}<button onClick={() => action(row, 'suspend')} className="rounded border px-3 py-2 text-sm">Suspend</button><button onClick={() => action(row, 'reject')} className="rounded border border-red-200 px-3 py-2 text-sm text-red-700">Reject</button></div></article>)}{!rows.length && <p className="rounded-xl border bg-white p-6 text-gray-500">No seller referral campaigns.</p>}</section>;
}

function Rewards({ rows, status, setStatus, action }: { rows: ReferralReward[]; status: string; setStatus: (value: string) => void; action: (row: ReferralReward, action: 'approve' | 'reject' | 'suspend' | 'reverse') => void }) {
  return <section><label className="mb-4 block text-sm">Filter status <select value={status} onChange={e => setStatus(e.target.value)} className="ml-2 rounded border p-2"><option value="">All</option>{['pending','qualified','rewarded','rejected','suspended','reversed'].map(value => <option key={value}>{value}</option>)}</select></label><div className="space-y-4">{rows.map(row => <article key={row.id} className="rounded-xl border bg-white p-5"><div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-bold">Reward #{row.id} · {row.source} · {row.status}</h2><p className="text-sm text-gray-600">{row.referrer?.email} → {row.referred?.email} · {row.campaign?.name || 'Platform'} · Order {row.order?.order_no || '—'}</p></div><strong>{euro(row.amount)}</strong></div><p className="mt-2 text-sm text-gray-600">Eligible subtotal {euro(row.eligible_subtotal)} {row.reason ? `· ${row.reason}` : ''}</p><p className="mt-2 text-xs text-gray-500">Trace: Buyer transaction #{row.buyer_transaction?.id || '—'} · Seller ledger #{row.seller_wallet_entry?.id || '—'} · Platform ledger #{row.platform_ledger_entry?.id || '—'} {row.reversal ? `· Reversal #${row.reversal.id}` : ''}</p><div className="mt-4 flex flex-wrap gap-2">{['pending', 'suspended'].includes(row.status) && <button onClick={() => action(row, 'approve')} className="rounded bg-green-700 px-3 py-2 text-sm text-white">Manual approve</button>}{['pending','qualified','suspended'].includes(row.status) && <><button onClick={() => action(row, 'suspend')} className="rounded border px-3 py-2 text-sm">Suspend</button><button onClick={() => action(row, 'reject')} className="rounded border px-3 py-2 text-sm">Reject</button></>}{row.status === 'rewarded' && <button onClick={() => action(row, 'reverse')} className="rounded border border-red-200 px-3 py-2 text-sm text-red-700">Reverse</button>}</div></article>)}{!rows.length && <p className="rounded-xl border bg-white p-6 text-gray-500">No referral rewards for this filter.</p>}</div></section>;
}

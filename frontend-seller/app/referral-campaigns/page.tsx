'use client';

import { useCallback, useEffect, useState } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import { productService, type Category, type Product } from '@/services/product-service';
import { referralService, type ReferralCampaign, type ReferralPayload } from '@/services/referral-service';

const euro = (value: unknown) => `€${Number(value || 0).toFixed(2)}`;
const localDateTime = (date = new Date()) => new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
const toUtc = (value?: string | null) => value ? new Date(value).toISOString() : null;
const empty = (): ReferralPayload => ({
  name: '', scope_type: 'store', reward_type: 'fixed', reward_amount: 5,
  max_reward_per_order: null, budget_amount: 100, minimum_order_amount: 0,
  minimum_quantity: 1, new_customer_only: true, platform_stacking: 'exclusive',
  activation_mode: 'immediate', starts_at: localDateTime(), ends_at: null,
  product_ids: [], category_ids: [],
});

const errorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error && 'response' in error) {
    return (error as { response?: { data?: { message?: string } } }).response?.data?.message || fallback;
  }
  return fallback;
};

export default function ReferralCampaignsPage() {
  const [campaigns, setCampaigns] = useState<ReferralCampaign[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<ReferralPayload>(empty);
  const [editing, setEditing] = useState<ReferralCampaign | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [all, productRows, categoryRows] = await Promise.all([
        referralService.list(), productService.getAll({ per_page: 100 }), productService.getCategories(),
      ]);
      setCampaigns(all.data || []);
      setProducts(productRows.data || productRows || []);
      setCategories(categoryRows || []);
      setError('');
    } catch (caught: unknown) {
      setError(errorMessage(caught, 'Unable to load referral campaigns.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const edit = (campaign: ReferralCampaign) => {
    setEditing(campaign);
    setForm({
      name: campaign.name, scope_type: campaign.scope_type, reward_type: campaign.reward_type,
      reward_amount: Number(campaign.reward_amount),
      max_reward_per_order: campaign.max_reward_per_order ? Number(campaign.max_reward_per_order) : null,
      budget_amount: Number(campaign.budget_amount), minimum_order_amount: Number(campaign.minimum_order_amount),
      minimum_quantity: campaign.minimum_quantity, new_customer_only: campaign.new_customer_only,
      platform_stacking: 'exclusive', activation_mode: campaign.activation_mode || 'immediate',
      starts_at: campaign.starts_at.slice(0, 16), ends_at: campaign.ends_at?.slice(0, 16) || null,
      product_ids: campaign.products.map((product) => product.id),
      category_ids: campaign.categories.map((category) => category.id),
    });
    setOpen(true);
  };

  const toggle = (key: 'product_ids' | 'category_ids', value: number) => setForm((current) => ({
    ...current,
    [key]: current[key]?.includes(value)
      ? current[key]?.filter((id) => id !== value)
      : [...(current[key] || []), value],
  }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        starts_at: form.activation_mode === 'scheduled' ? toUtc(form.starts_at) || undefined : undefined,
        ends_at: toUtc(form.ends_at),
        max_reward_per_order: form.max_reward_per_order || null,
      };
      if (editing) await referralService.update(editing.id, payload);
      else await referralService.create(payload);
      setOpen(false);
      setEditing(null);
      setForm(empty());
      await load();
    } catch (caught: unknown) {
      setError(errorMessage(caught, 'Unable to save referral campaign.'));
    } finally {
      setSaving(false);
    }
  };

  const action = async (campaign: ReferralCampaign, value: 'pause' | 'resume' | 'archive') => {
    if (value === 'archive' && !window.confirm('Archive this campaign? Unused reserved campaign funds will be released to the Seller Wallet.')) return;
    try {
      await referralService.action(campaign.id, value);
      await load();
    } catch (caught: unknown) {
      setError(errorMessage(caught, 'Campaign action failed.'));
    }
  };

  return <div className="min-h-screen bg-gray-50 pb-24"><Header /><div className="flex"><Sidebar /><main className="min-w-0 flex-1 space-y-6 p-5 lg:p-8">
    <header className="flex flex-wrap justify-between gap-4"><div><h1 className="text-3xl font-bold">Referral Campaigns</h1><p className="mt-2 text-gray-600">Fund Buyer referral rewards from your existing Seller Wallet. Only selected store products can qualify.</p></div><button onClick={() => { setEditing(null); setForm(empty()); setOpen(true); }} className="rounded-lg bg-blue-700 px-5 py-3 font-medium text-white">Create campaign</button></header>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-700">{error}</p>}
    {loading ? <p className="text-gray-500">Loading campaigns…</p> : campaigns.length === 0 ? <div className="rounded-xl border bg-white p-10 text-center text-gray-500">No referral campaigns yet. Create one to let buyers share eligible products.</div> : <div className="grid gap-5 xl:grid-cols-2">{campaigns.map((campaign) => <CampaignCard key={campaign.id} campaign={campaign} onEdit={() => edit(campaign)} onAction={(value) => void action(campaign, value)} />)}</div>}
    {open && <CampaignForm form={form} setForm={setForm} products={products} categories={categories} toggle={toggle} saving={saving} onClose={() => setOpen(false)} onSubmit={submit} editing={!!editing} />}
  </main></div><BottomNav /></div>;
}

function CampaignCard({ campaign, onEdit, onAction }: { campaign: ReferralCampaign; onEdit: () => void; onAction: (action: 'pause' | 'resume' | 'archive') => void }) {
  const analytics = campaign.analytics;
  const activation = campaign.activation_mode === 'scheduled'
    ? `Scheduled: ${new Date(campaign.starts_at).toLocaleString()}`
    : 'Runs immediately after approval';
  return <article className="rounded-xl border bg-white p-5"><div className="flex flex-wrap justify-between gap-3"><div><h2 className="text-lg font-bold">{campaign.name}</h2><p className="mt-1 text-sm text-gray-600">{campaign.identifier} · {campaign.scope_type} · {campaign.reward_type === 'percentage' ? `${campaign.reward_amount}%` : euro(campaign.reward_amount)}</p></div><span className="h-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{campaign.status.replaceAll('_', ' ')} / {campaign.approval_status}</span></div><p className="mt-2 text-sm text-gray-600">{activation}</p><p className="mt-3 text-sm text-gray-600">Budget: {euro(campaign.budget_spent)} used · {euro(campaign.budget_reserved)} remaining</p>{analytics && <div className="mt-4 grid grid-cols-3 gap-3 text-sm"><Metric name="Clicks" value={analytics.clicks} /><Metric name="Orders" value={analytics.orders} /><Metric name="Paid" value={analytics.rewarded_conversions} /><Metric name="Revenue" value={euro(analytics.revenue_generated)} /><Metric name="Commission" value={euro(analytics.referral_commission_cost)} /><Metric name="Net revenue" value={euro(analytics.net_revenue)} /></div>}<div className="mt-5 flex flex-wrap gap-2"><button onClick={onEdit} className="rounded border px-3 py-2 text-sm">Edit</button>{['active', 'scheduled'].includes(campaign.status) ? <button onClick={() => onAction('pause')} className="rounded border px-3 py-2 text-sm">Pause</button> : campaign.status === 'paused' ? <button onClick={() => onAction('resume')} className="rounded border px-3 py-2 text-sm">Resume</button> : null}<button onClick={() => onAction('archive')} className="rounded border border-red-200 px-3 py-2 text-sm text-red-700">Archive</button></div></article>;
}

function Metric({ name, value }: { name: string; value: string | number }) { return <div className="rounded bg-gray-50 p-3"><p className="text-xs text-gray-500">{name}</p><p className="mt-1 font-semibold">{value}</p></div>; }

function CampaignForm({ form, setForm, products, categories, toggle, saving, onClose, onSubmit, editing }: { form: ReferralPayload; setForm: React.Dispatch<React.SetStateAction<ReferralPayload>>; products: Product[]; categories: Category[]; toggle: (key: 'product_ids' | 'category_ids', value: number) => void; saving: boolean; onClose: () => void; onSubmit: (event: React.FormEvent) => void; editing: boolean }) {
  const field = (key: keyof ReferralPayload, value: string | number | boolean | null) => setForm((current) => ({ ...current, [key]: value }));
  return <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4"><form onSubmit={onSubmit} className="mx-auto my-6 max-w-3xl rounded-2xl bg-white p-6 shadow-xl"><div className="flex justify-between gap-4"><div><h2 className="text-xl font-bold">{editing ? 'Edit referral campaign' : 'New referral campaign'}</h2><p className="mt-1 text-sm text-gray-600">Campaign budget is reserved from your Seller Wallet and released only on archive or rejection.</p></div><button type="button" onClick={onClose} aria-label="Close campaign form">✕</button></div>
    <div className="mt-6 grid gap-4 md:grid-cols-2"><Label name="Campaign name"><input required value={form.name} onChange={(event) => field('name', event.target.value)} /></Label><Label name="Scope"><select value={form.scope_type} onChange={(event) => field('scope_type', event.target.value as ReferralPayload['scope_type'])}><option value="store">Entire store</option><option value="products">Selected products</option><option value="categories">Selected categories</option><option value="mixed">Selected products or categories</option></select></Label><Label name="Reward"><select value={form.reward_type} onChange={(event) => field('reward_type', event.target.value as ReferralPayload['reward_type'])}><option value="fixed">Fixed EUR</option><option value="percentage">Percentage</option></select></Label><Label name={form.reward_type === 'percentage' ? 'Reward percentage' : 'Reward amount (EUR)'}><input required type="number" min="0.01" max={form.reward_type === 'percentage' ? 100 : 100000} step="0.01" value={form.reward_amount} onChange={(event) => field('reward_amount', Number(event.target.value))} /></Label><Label name="Maximum reward per order (optional)"><input type="number" min="0.01" step="0.01" value={form.max_reward_per_order ?? ''} onChange={(event) => field('max_reward_per_order', event.target.value ? Number(event.target.value) : null)} /></Label><Label name="Campaign budget (EUR)"><input required type="number" min="0.01" step="0.01" value={form.budget_amount} onChange={(event) => field('budget_amount', Number(event.target.value))} /></Label><Label name="Minimum eligible subtotal (EUR)"><input type="number" min="0" step="0.01" value={form.minimum_order_amount || 0} onChange={(event) => field('minimum_order_amount', Number(event.target.value))} /></Label><Label name="Minimum eligible quantity"><input type="number" min="1" value={form.minimum_quantity || 1} onChange={(event) => field('minimum_quantity', Number(event.target.value))} /></Label></div>
    <fieldset className="mt-5 rounded-lg border p-4"><legend className="px-1 text-sm font-semibold text-gray-800">Campaign activation</legend><label className="flex cursor-pointer items-start gap-3"><input type="radio" name="activation_mode" checked={form.activation_mode === 'immediate'} onChange={() => field('activation_mode', 'immediate')} /><span><span className="font-medium">Run now</span><span className="block text-sm text-gray-600">The campaign becomes active immediately after Admin approval.</span></span></label><label className="mt-3 flex cursor-pointer items-start gap-3"><input type="radio" name="activation_mode" checked={form.activation_mode === 'scheduled'} onChange={() => field('activation_mode', 'scheduled')} /><span><span className="font-medium">Schedule</span><span className="block text-sm text-gray-600">After approval, it remains scheduled and activates at the chosen time.</span></span></label>{form.activation_mode === 'scheduled' && <div className="mt-4 max-w-sm"><Label name="Scheduled activation time"><input required type="datetime-local" min={localDateTime()} value={form.starts_at || ''} onChange={(event) => field('starts_at', event.target.value)} /></Label></div>}</fieldset>
    <div className="mt-4 grid gap-4 md:grid-cols-2"><Label name="Ends (optional)"><input type="datetime-local" value={form.ends_at || ''} onChange={(event) => field('ends_at', event.target.value || null)} /></Label><Label name="Per-buyer limit (optional)"><input type="number" min="1" value={form.per_buyer_limit || ''} onChange={(event) => field('per_buyer_limit', event.target.value ? Number(event.target.value) : null)} /></Label><Label name="Monthly reward limit (optional)"><input type="number" min="1" value={form.monthly_reward_limit || ''} onChange={(event) => field('monthly_reward_limit', event.target.value ? Number(event.target.value) : null)} /></Label></div>
    <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={form.new_customer_only !== false} onChange={(event) => field('new_customer_only', event.target.checked)} />New customer only</label><label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={form.platform_stacking === 'allow_platform'} onChange={(event) => field('platform_stacking', event.target.checked ? 'allow_platform' : 'exclusive')} />Allow platform referral stacking when Admin has enabled it</label>
    {(form.scope_type === 'products' || form.scope_type === 'mixed') && <Picker title="Eligible products" items={products} selected={form.product_ids || []} toggle={(value) => toggle('product_ids', value)} />}{(form.scope_type === 'categories' || form.scope_type === 'mixed') && <Picker title="Eligible categories" items={categories} selected={form.category_ids || []} toggle={(value) => toggle('category_ids', value)} />}
    <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded px-4 py-2">Cancel</button><button disabled={saving} className="rounded bg-blue-700 px-4 py-2 text-white disabled:opacity-50">{saving ? 'Saving…' : editing ? 'Save campaign' : 'Reserve budget & create'}</button></div>
  </form></div>;
}

function Label({ name, children }: { name: string; children: React.ReactNode }) { return <label className="block text-sm font-medium text-gray-700">{name}<span className="mt-1 block [&_input]:w-full [&_input]:rounded [&_input]:border [&_input]:p-2 [&_select]:w-full [&_select]:rounded [&_select]:border [&_select]:p-2">{children}</span></label>; }
function Picker({ title, items, selected, toggle }: { title: string; items: { id: number; name: string }[]; selected: number[]; toggle: (id: number) => void }) { return <fieldset className="mt-5"><legend className="font-semibold">{title}</legend><div className="mt-2 grid max-h-48 grid-cols-1 gap-2 overflow-y-auto rounded border p-3 sm:grid-cols-2">{items.map((item) => <label key={item.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggle(item.id)} />{item.name}</label>)}</div></fieldset>; }

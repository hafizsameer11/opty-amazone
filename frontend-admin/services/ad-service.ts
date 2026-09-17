import apiClient from '@/lib/api-client';

export interface AdProduct { id: number; name: string; images: string[] | null; price: string | number; stock_quantity: number; is_approved: boolean; }
export interface Campaign {
  id: number; name: string; product_id: number; seller_id: number; product: AdProduct | null; seller?: { id: number; name: string };
  status: string; payment_status: string; payment_method: string; starts_at: string; ends_at: string; budget_type: 'daily' | 'total';
  budget_amount_cents: number; budget_cents: number; bid_cents: number; spent_cents: number; remaining_cents: number; released_cents: number;
  reserved_cents: number; impressions: number; unique_impressions: number; clicks: number; product_views: number; add_to_carts: number;
  conversions: number; revenue_cents: number; ctr: number; average_cpc_cents: number; conversion_rate: number; roas: number;
  placements: string[]; locations: string[]; rejection_reason: string | null; pause_source: string | null; legacy_snapshot?: Record<string, unknown>;
}
export interface Page<T> { data: T[]; current_page: number; last_page: number; total: number; }
export interface CampaignDraft { product_id: number; name: string; starts_at: string; ends_at: string; budget_type: 'daily' | 'total'; budget_amount: string; bid_type: 'cpc'; bid_amount: string; placements: string[]; locations: string[]; }
export interface AdOptions { products: Page<AdProduct>; placements: string[]; locations: { code: string; name: string }[]; ad_credit_cents: number; shopping_cents: number; review_required: boolean; }
export interface Metric { day?: string; placement?: string; location?: string; impressions: number; unique_impressions: number; clicks: number; product_views: number; add_to_carts: number; conversions: number; revenue_cents: number; spent_cents: number; }
export interface Analytics { summary: Campaign; daily: Metric[]; placements: Metric[]; locations: Metric[]; attribution_window_days: number; }
export interface BudgetTransaction { id: number; type: string; amount_cents: number; balance_after_cents: number; created_at: string; actor_id: number | null; metadata: Record<string, unknown>; }
export interface Audit { id: number; action: string; from_status: string | null; to_status: string; reason: string | null; actor_id: number | null; created_at: string; }
const base = '/admin/ad-campaigns';
export const adService = {
  async list(params: Record<string, string | number> = {}): Promise<Page<Campaign>> { return (await apiClient.get(base, { params })).data.data; },
  async options(search = '', page = 1): Promise<AdOptions> { return (await apiClient.get(base + '/options', { params: { search, page } })).data.data; },
  async create(draft: CampaignDraft, key: string): Promise<Campaign> { return (await apiClient.post(base, { ...draft, idempotency_key: key, confirm_reservation: true })).data.data; },
  async get(id: number): Promise<Campaign> { return (await apiClient.get(base + '/' + id)).data.data; },
  async action(id: number, action: string, reason?: string): Promise<Campaign> { return (await apiClient.post(base + '/' + id + '/actions', { action, reason })).data.data; },
  async analytics(id: number): Promise<Analytics> { return (await apiClient.get(base + '/' + id + '/analytics')).data.data; },
  async transactions(id: number, page = 1): Promise<Page<BudgetTransaction>> { return (await apiClient.get(base + '/' + id + '/transactions', { params: { page } })).data.data; },
  async audits(id: number, page = 1): Promise<Page<Audit>> { return (await apiClient.get(base + '/' + id + '/audits', { params: { page } })).data.data; },
  async duplicate(id: number): Promise<Partial<CampaignDraft>> { return (await apiClient.post(base + '/' + id + '/duplicate')).data.data; },
};
export const money = (cents: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(Number(cents || 0) / 100);
export const label = (value: string) => value.replaceAll('_', ' ');
export const terminal = (status: string) => ['completed', 'cancelled', 'rejected', 'terminated', 'exhausted', 'invalid'].includes(status);
export function adError(error: unknown): string {
  const data = (error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data;
  return Object.values(data?.errors || {}).flat()[0] || data?.message || (error instanceof Error ? error.message : 'Request failed. Please retry.');
}

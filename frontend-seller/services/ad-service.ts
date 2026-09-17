import apiClient from '@/lib/api-client';

export interface AdProduct { id: number; name: string; images: string[] | null; price: string | number; stock_quantity: number; is_approved: boolean; }
export interface Campaign {
  id: number; name: string; product_id: number; seller_id: number; product: AdProduct | null; seller?: { id: number; name: string };
  status: string; payment_status: string; payment_method: string; funding_source?: string; seller_wallet_id?: number | null; starts_at: string; ends_at: string; schedule_timezone?: string; budget_type: 'daily' | 'total';
  budget_amount_cents: number; budget_cents: number; bid_cents: number; spent_cents: number; remaining_cents: number; released_cents: number;
  reserved_cents: number; impressions: number; unique_impressions: number; clicks: number; product_views: number; add_to_carts: number;
  conversions: number; revenue_cents: number; ctr: number; average_cpc_cents: number; conversion_rate: number; roas: number;
  placements: string[]; locations: string[]; rejection_reason: string | null; pause_source: string | null; legacy_snapshot?: Record<string, unknown>;
}
export interface Page<T> { data: T[]; current_page: number; last_page: number; total: number; }
export interface CampaignDraft { product_id: number; name: string; starts_at: string; ends_at: string; schedule_timezone: string; launch_mode: 'run_now' | 'schedule'; budget_type: 'daily' | 'total'; budget_amount: string; bid_type: 'cpc'; bid_amount: string; placements: string[]; locations: string[]; }
export interface AdOptions { products: Page<AdProduct>; placements: string[]; locations: { code: string; name: string }[]; seller_wallet_available_cents: number; seller_wallet_ad_reserved_cents: number; review_required: boolean; }
export interface Metric { day?: string; placement?: string; location?: string; impressions: number; unique_impressions: number; clicks: number; product_views: number; add_to_carts: number; conversions: number; revenue_cents: number; spent_cents: number; }
export interface Analytics { summary: Campaign; daily: Metric[]; placements: Metric[]; locations: Metric[]; attribution_window_days: number; }
export interface BudgetTransaction { id: number; type: string; amount_cents: number; balance_after_cents: number; created_at: string; actor_id: number | null; metadata: Record<string, unknown>; }
export interface Audit { id: number; action: string; from_status: string | null; to_status: string; reason: string | null; actor_id: number | null; created_at: string; }
const base = '/seller/ad-campaigns';
export const adService = {
  async list(params: Record<string, string | number> = {}): Promise<Page<Campaign>> { return (await apiClient.get(base, { params })).data.data; },
  async options(search = '', page = 1): Promise<AdOptions> { return (await apiClient.get(base + '/options', { params: { search, page } })).data.data; },
  async create(draft: CampaignDraft, key: string): Promise<Campaign> { return (await apiClient.post(base, { ...draft, idempotency_key: key, confirm_reservation: true })).data.data; },
  async get(id: number): Promise<Campaign> { return (await apiClient.get(base + '/' + id)).data.data; },
  async action(id: number, action: string, reason?: string): Promise<Campaign> { return (await apiClient.post(base + '/' + id + '/actions', { action, reason })).data.data; },
  async destroy(id: number): Promise<void> { await apiClient.delete(base + '/' + id); },
  async analytics(id: number): Promise<Analytics> { return (await apiClient.get(base + '/' + id + '/analytics')).data.data; },
  async transactions(id: number, page = 1): Promise<Page<BudgetTransaction>> { return (await apiClient.get(base + '/' + id + '/transactions', { params: { page } })).data.data; },
  async audits(id: number, page = 1): Promise<Page<Audit>> { return (await apiClient.get(base + '/' + id + '/audits', { params: { page } })).data.data; },
  async duplicate(id: number): Promise<Partial<CampaignDraft>> { return (await apiClient.post(base + '/' + id + '/duplicate')).data.data; },
};
export const money = (cents: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(Number(cents || 0) / 100);
export const label = (value: string) => value.replaceAll('_', ' ');
export const terminal = (status: string) => ['completed', 'cancelled', 'rejected', 'terminated', 'exhausted', 'invalid'].includes(status);

// The same device-zone conversion model used by Discount Campaigns and Banners.
// We store UTC instants, but interpret a datetime-local value in the seller's
// actual browser/system timezone before sending it to Laravel.
export const browserTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
export function campaignInstant(value: string | Date): Date {
  if (value instanceof Date) return value;
  const normalized = value.trim().replace(' ', 'T');
  return new Date(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized) ? normalized : `${normalized}Z`);
}
function partsInTimezone(value: string | Date, timezone: string): Record<string, string> {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(campaignInstant(value));
  return Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
}
export function utcFromZonedInput(value: string, timezone: string): Date {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) return new Date(value);
  const [, year, month, day, hour, minute] = match;
  const wanted = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
  const actual = partsInTimezone(new Date(wanted), timezone);
  const displayed = Date.UTC(Number(actual.year), Number(actual.month) - 1, Number(actual.day), Number(actual.hour), Number(actual.minute));
  return new Date(wanted - (displayed - wanted));
}
export function formatCampaignTime(value?: string, timezone = browserTimezone()): string {
  if (!value) return '—';
  try { return `${new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone: timezone }).format(campaignInstant(value))} (${timezone})`; }
  catch { return `${campaignInstant(value).toLocaleString()} (${timezone})`; }
}
export function adError(error: unknown): string {
  const data = (error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data;
  return Object.values(data?.errors || {}).flat()[0] || data?.message || (error instanceof Error ? error.message : 'Request failed. Please retry.');
}

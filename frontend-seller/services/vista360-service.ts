import apiClient from '@/lib/api-client';

export type Vista360Feature = { feature_key?: string; key?: string; title: string; description?: string | null; value?: unknown };
export type Vista360Price = { id?: number; duration_months: 1 | 6 | 12; amount_cents: number; currency: string; version?: number };
export type Vista360Plan = { id: number; name: string; slug: string; description?: string | null; prices: Vista360Price[]; features: Vista360Feature[] };
export type Vista360Subscription = {
  id: string; status: string; source: string; plan: { id?: number; name: string; slug: string; description?: string | null };
  features: Array<{ key: string; title: string; description?: string | null; value?: unknown }>;
  price: { duration_months: number; amount_cents: number; currency: string };
  starts_at?: string | null; expires_at?: string | null; activated_at?: string | null;
  status_reason?: string | null;
  payments: Array<{ id: string; provider: string; status: string; amount_cents: number; currency: string; paid_at?: string | null; created_at?: string | null }>;
  history: Array<{ event: string; occurred_at?: string | null; data?: Record<string, unknown> }>;
};
export type Vista360Entitlement = { active: boolean; status: string; expires_at?: string | null; renewal_url?: string; features?: Array<{ key: string }> };

export const vista360Service = {
  async plans(): Promise<Vista360Plan[]> { return (await apiClient.get('/seller/vista360/plans')).data.data; },
  async subscription(): Promise<{ subscription: Vista360Subscription | null; future_subscriptions: Vista360Subscription[]; entitlement: Vista360Entitlement }> { return (await apiClient.get('/seller/vista360/subscription')).data.data; },
  async activate(data: { plan_id: number; duration_months: 1 | 6 | 12; idempotency_key?: string }) {
    return (await apiClient.post('/seller/vista360/activate', data)).data.data as {
      activation_mode: 'complimentary';
      subscription: Vista360Subscription;
    };
  },
  async cancelFuture(reason?: string) { return (await apiClient.post('/seller/vista360/cancel-future', { reason })).data.data; },
  async crmLink() { return (await apiClient.get('/seller/vista360/crm-link')).data.data as { url: string; entitlement: Vista360Entitlement }; },
};

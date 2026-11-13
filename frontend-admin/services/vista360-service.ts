import apiClient from '@/lib/api-client';

export type Vista360Duration = 1 | 6 | 12;

export interface Vista360PlanPrice {
  id?: number;
  duration_months: Vista360Duration;
  amount_cents: number;
  currency: string;
  version?: number;
  is_active: boolean;
}

export interface Vista360PlanFeature {
  id?: number;
  feature_key: string;
  title: string;
  description?: string | null;
  value?: unknown;
  is_active: boolean;
  sort_order: number;
}

export interface Vista360Plan {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  is_active: boolean;
  sort_order: number;
  display_details?: Record<string, unknown> | null;
  prices: Vista360PlanPrice[];
  features: Vista360PlanFeature[];
}

export interface Vista360PlanInput {
  name: string;
  slug: string;
  description?: string;
  is_active: boolean;
  sort_order: number;
  display_details?: Record<string, unknown>;
  prices: Vista360PlanPrice[];
  features: Vista360PlanFeature[];
}

export interface Vista360SubscriptionRow {
  id: number;
  uuid: string;
  status: string;
  source: string;
  seller_id: number;
  store_id: number;
  seller?: { id: number; name: string; email: string } | null;
  store?: { id: number; name: string } | null;
  plan?: { id: number; name: string; slug: string } | null;
  plan_snapshot?: { name?: string; slug?: string } | null;
  starts_at?: string | null;
  expires_at?: string | null;
  status_reason?: string | null;
  created_at?: string | null;
  payments?: Array<{ id: number; uuid: string; status: string; amount_cents: number; currency: string; provider: string }>;
}

/** The immutable purchase/audit information returned for one subscription. */
export interface Vista360SubscriptionDetail {
  id: string;
  status: string;
  source: string;
  plan?: { name?: string; slug?: string; description?: string | null } | null;
  features?: Array<{ key?: string; feature_key?: string; title?: string; description?: string | null; value?: unknown }> | null;
  price?: { duration_months?: number; amount_cents?: number; currency?: string } | null;
  starts_at?: string | null;
  expires_at?: string | null;
  activated_at?: string | null;
  cancelled_at?: string | null;
  suspended_at?: string | null;
  expired_at?: string | null;
  status_reason?: string | null;
  payments: Array<{ id: string; provider: string; status: string; amount_cents: number; currency: string; paid_at?: string | null; created_at?: string | null }>;
  history: Array<{ event: string; data?: Record<string, unknown>; occurred_at?: string | null }>;
}

export interface Vista360PaymentRow {
  id: number;
  uuid: string;
  provider: string;
  status: string;
  amount_cents: number;
  currency: string;
  paid_at?: string | null;
  created_at?: string | null;
  subscription?: Vista360SubscriptionRow | null;
}

export interface Paginated<T> {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
}

export const vista360AdminService = {
  async plans(): Promise<Vista360Plan[]> {
    return (await apiClient.get('/admin/vista360/plans')).data.data;
  },

  async createPlan(data: Vista360PlanInput): Promise<Vista360Plan> {
    return (await apiClient.post('/admin/vista360/plans', data)).data.data;
  },

  async updatePlan(id: number, data: Vista360PlanInput): Promise<Vista360Plan> {
    return (await apiClient.put(`/admin/vista360/plans/${id}`, data)).data.data;
  },

  async setPlanAvailability(id: number, is_active: boolean): Promise<Vista360Plan> {
    return (await apiClient.post(`/admin/vista360/plans/${id}/availability`, { is_active })).data.data;
  },

  async subscriptions(params: Record<string, string | number | undefined> = {}): Promise<Paginated<Vista360SubscriptionRow>> {
    return (await apiClient.get('/admin/vista360/subscriptions', { params })).data.data;
  },

  async subscription(uuid: string): Promise<Vista360SubscriptionDetail> {
    return (await apiClient.get(`/admin/vista360/subscriptions/${uuid}`)).data.data;
  },

  async payments(params: Record<string, string | number | undefined> = {}): Promise<Paginated<Vista360PaymentRow>> {
    return (await apiClient.get('/admin/vista360/payments', { params })).data.data;
  },

  async manualGrant(data: { seller_id: number; store_id: number; plan_id: number; duration_months: Vista360Duration; reason?: string }): Promise<unknown> {
    return (await apiClient.post('/admin/vista360/subscriptions/manual-grant', data)).data.data;
  },

  async act(uuid: string, data: { action: 'extend' | 'activate' | 'suspend' | 'cancel'; months?: Vista360Duration; reason?: string }): Promise<unknown> {
    return (await apiClient.post(`/admin/vista360/subscriptions/${uuid}/action`, data)).data.data;
  },
};

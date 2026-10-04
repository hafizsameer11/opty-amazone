import apiClient from '@/lib/api-client';

/**
 * Mirrors the backend `stores.status` enum. `pending` covers both a brand-new
 * registration and a submitted verification, and is the only state that shows
 * the Approve/Reject actions.
 */
export type StoreStatus = 'pending' | 'active' | 'suspended' | 'rejected';

export const STORE_STATUS_FILTERS = ['all', 'pending', 'approved', 'rejected', 'suspended'] as const;
export type StoreStatusFilter = (typeof STORE_STATUS_FILTERS)[number];

export interface Seller {
  id: number;
  name: string;
  slug?: string;
  description?: string | null;
  email?: string | null;
  phone?: string | null;
  logo?: string | null;
  banner?: string | null;
  theme_color?: string | null;
  status: StoreStatus;
  onboarding_status?: string | null;
  is_active: boolean;
  rejection_reason?: string | null;
  created_at?: string | null;
  user?: {
    id: number;
    name: string;
    email: string;
    phone?: string;
  } | null;
  products_count?: number;
  orders_count?: number;
}

export interface StoreStatistics {
  total_views?: number;
  total_clicks?: number;
  total_orders?: number;
  total_revenue?: number;
  total_products?: number;
  total_followers?: number;
  total_reviews?: number;
  average_rating?: number;
}

export interface StoreDetail extends Seller {
  statistics?: StoreStatistics | null;
  categories?: Array<{ id: number; name: string }>;
  social_links?: Array<{ id: number; platform?: string; url?: string }>;
  meta?: Record<string, unknown> | null;
}

export interface SellerListResponse {
  stores: Seller[];
  summary: Record<StoreStatusFilter, number>;
  filters: string[];
  statuses: StoreStatus[];
  pagination: {
    current_page: number;
    last_page: number;
    total: number;
    from: number | null;
    to: number | null;
  };
}

export interface StoreProduct {
  id: number;
  name: string;
  sku?: string | null;
  price?: number | string;
  is_active?: boolean;
  is_approved?: boolean;
  created_at?: string | null;
}

export interface StoreOrder {
  id: number;
  order_id: number;
  status: string;
  subtotal?: number | string;
  delivery_fee?: number | string;
  total?: number | string;
  created_at?: string | null;
}

export interface StoreDetailResponse {
  store: StoreDetail;
  products: StoreProduct[];
  orders: StoreOrder[];
  financial_history: {
    store_orders: number;
    wallet_entries: number;
    withdrawals: number;
    platform_ledger_entries: number;
    paid_ad_campaigns: number;
    wallet_balance: number;
  };
  deletable: boolean;
}

export interface SellerListParams {
  status?: StoreStatusFilter;
  search?: string;
  page?: number;
  per_page?: number;
}

export const sellerService = {
  async getAll(params?: SellerListParams): Promise<SellerListResponse> {
    const res = await apiClient.get('/admin/sellers', { params });
    return res.data.data;
  },

  async getOne(id: number): Promise<StoreDetailResponse> {
    const res = await apiClient.get(`/admin/sellers/${id}`);
    return res.data.data;
  },

  async approve(id: number) {
    const res = await apiClient.post(`/admin/sellers/${id}/approve`);
    return res.data.data as Seller;
  },

  async reject(id: number, reason: string) {
    const res = await apiClient.post(`/admin/sellers/${id}/reject`, { reason });
    return res.data.data as Seller;
  },

  /** Permanently deletes the store and all store-owned content. */
  async remove(id: number) {
    const res = await apiClient.delete(`/admin/sellers/${id}`);
    return res.data.data as {
      deleted_store: { id: number; name: string; slug: string };
      removed: Record<string, number>;
    };
  },
};
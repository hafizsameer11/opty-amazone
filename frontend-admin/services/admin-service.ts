import apiClient from '@/lib/api-client';

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface LoginResponse {
  user: AdminUser;
  token: string;
}

export interface DashboardStats {
  range_months: number;
  period_start: string;
  totals: {
    total_users: number;
    total_sellers: number;
    total_buyers: number;
    total_products: number;
    total_orders: number;
    total_revenue: number;
    order_revenue: number;
    ad_revenue: number;
    warehouse_revenue: number;
  };
  changes: Record<'users' | 'sellers' | 'buyers' | 'products' | 'orders' | 'revenue', number>;
  revenue_sources: Array<{ key: 'orders' | 'ads' | 'warehouse'; value: number }>;
  revenue_trend: Array<{
    month: string;
    label: string;
    order_revenue: number;
    ad_revenue: number;
    warehouse_revenue: number;
    orders: number;
    paid_orders: number;
    warehouse_orders: number;
  }>;
  order_statuses: Array<{ status: string; count: number }>;
  warehouse: {
    total_stock: number;
    low_stock: number;
    orders: number;
    trend: Array<{ month: string; label: string; orders: number; revenue: number }>;
  };
  best_selling_products: Array<{
    product_id: number | null;
    name: string;
    sku: string;
    store_name: string;
    units_sold: number;
    revenue: number;
    order_count: number;
  }>;
  recent_activity: Array<{
    kind: 'order' | 'warehouse' | 'campaign' | 'seller' | 'support';
    reference: string;
    actor: string | null;
    amount: number | null;
    status: string | null;
    occurred_at: string;
  }>;
  operations: {
    open_orders: number;
    pending_seller_approvals: number;
    pending_product_reviews: number;
    open_support_tickets: number;
  };
}

export interface AdminLiveSummary {
  notifications: number;
  orders: number;
  messages: number;
  support: number;
  sellers: number;
  stores: number;
  products: number;
  reports: number;
  banners: number;
  boost_campaigns: number;
  referrals: number;
  withdrawals: number;
  leads: number;
  categories: number;
  coupons: number;
  discount_campaigns: number;
  points: number;
  search: number;
}

export const adminService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const res = await apiClient.post('/admin/auth/login', { email, password });
    return res.data.data;
  },

  async logout(): Promise<void> {
    await apiClient.post('/admin/auth/logout');
  },

  async getDashboard(months = 9): Promise<DashboardStats> {
    const res = await apiClient.get('/admin/dashboard', { params: { months } });
    return res.data.data;
  },

  async getLiveSummary(): Promise<AdminLiveSummary> {
    const res = await apiClient.get('/admin/live-summary');
    return res.data.data;
  },

  async getAnalytics(period: 'day' | 'week' | 'month' | 'year' = 'month') {
    const res = await apiClient.get('/admin/analytics', { params: { period } });
    return res.data.data;
  },

  async getSettings() {
    const res = await apiClient.get('/admin/settings');
    return res.data.data;
  },

  async updateSettings(data: any) {
    const res = await apiClient.put('/admin/settings', data);
    return res.data.data;
  },

  async getActivityLogs(params?: any) {
    const res = await apiClient.get('/admin/activity-logs', { params });
    return res.data;
  },

  async getPointRules() {
    const res = await apiClient.get('/admin/points/rules');
    return res.data.data;
  },

  async savePointRule(data: any, id?: number) {
    const url = id ? `/admin/points/rules/${id}` : '/admin/points/rules';
    const method = id ? 'put' : 'post';
    const res = await apiClient[method](url, data);
    return res.data.data;
  },

  async getPointTransactions(params?: any) {
    const res = await apiClient.get('/admin/points/transactions', { params });
    return res.data.data;
  },
};

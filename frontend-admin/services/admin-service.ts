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
  total_users: number;
  total_sellers: number;
  total_products: number;
  total_orders: number;
  total_revenue: number;
  recent_orders: any[];
}

export const adminService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const res = await apiClient.post('/admin/auth/login', { email, password });
    return res.data.data;
  },

  async logout(): Promise<void> {
    await apiClient.post('/admin/auth/logout');
  },

  async getDashboard(): Promise<DashboardStats> {
    const res = await apiClient.get('/admin/dashboard');
    return res.data.data;
  },

  async getAnalytics() {
    const res = await apiClient.get('/admin/analytics');
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

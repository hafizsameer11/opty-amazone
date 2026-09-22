/**
 * Admin API client.
 *
 * Production: set NEXT_PUBLIC_API_URL to your API base including `/api`, e.g.
 *   https://api.example.com/api
 * If the value omits `/api`, it is appended from getApiOrigin().
 */
import axios from 'axios';
import { requestAdminRefresh } from '@/hooks/useLiveRefresh';

export function getApiOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL || 'https://api.vistaexpress.it/api';
  return raw.replace(/\/api\/?$/, '') || 'https://api.vistaexpress.it';
}

const apiClient = axios.create({
  baseURL: `${getApiOrigin()}/api`,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('admin_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => {
    // Let every mounted admin screen update after a successful mutation. The
    // affected page still owns its own query and state; this only broadcasts a
    // lightweight invalidation event and never reloads the browser.
    if (typeof window !== 'undefined' && ['post', 'put', 'patch', 'delete'].includes((response.config.method || '').toLowerCase())) {
      requestAdminRefresh({ resource: response.config.url || undefined });
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;

export function getAxiosErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const data = (error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }).response?.data;
    if (data?.errors && typeof data.errors === 'object') {
      for (const messages of Object.values(data.errors)) {
        if (Array.isArray(messages) && messages[0]) return String(messages[0]);
      }
    }
    if (typeof data?.message === 'string' && data.message.trim()) return data.message;
  }
  return error instanceof Error && error.message ? error.message : 'Something went wrong';
}

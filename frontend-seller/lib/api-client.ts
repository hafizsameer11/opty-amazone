import axios from 'axios';

/** Live API; override with NEXT_PUBLIC_API_URL for local Laravel (e.g. http://localhost:8000/api). */
const DEFAULT_PUBLIC_API = 'https://api.vistaexpress.it/api';

export function getApiOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL || DEFAULT_PUBLIC_API;
  return raw.replace(/\/api\/?$/, '') || 'https://api.vistaexpress.it';
}

const API_BASE_URL = `${getApiOrigin()}/api`;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    // For FormData, let the browser set Content-Type with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const STORE_SUSPENDED_PATH = '/auth/store-suspended';

/**
 * True when a request was refused because the seller's store is suspended or
 * inactive. The API marks this with `errors.code`, matching ResponseHelper::error.
 */
export function isStoreSuspendedError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const data = (error as { response?: { status?: number; data?: { errors?: { code?: string } } } }).response;
  return data?.status === 403 && data?.data?.errors?.code === 'store_suspended';
}

/** True when a request was refused because the session is not a seller account. */
export function isSellerRoleError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const response = (error as { response?: { status?: number; data?: { errors?: { code?: string } } } }).response;
  return response?.status === 403 && response?.data?.errors?.code !== 'store_suspended';
}

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;

    if (typeof window !== 'undefined') {
      if (status === 401) {
        // Unauthorized - clear token and redirect to login
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        window.location.href = '/auth/login';
      } else if (status === 403) {
        // A suspended store is a normal account state, not a crash: send the
        // seller to the reinstatement screen instead of leaving them on a page
        // whose data can never load.
        if (isStoreSuspendedError(error)) {
          if (!window.location.pathname.startsWith(STORE_SUSPENDED_PATH)) {
            window.location.href = STORE_SUSPENDED_PATH;
          }
        } else if (isSellerRoleError(error)) {
          // Any other 403 means this session cannot use the seller area at all,
          // so the cached credentials are stale or belong to a buyer account.
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user');
          if (!window.location.pathname.startsWith('/auth/login')) {
            window.location.href = '/auth/login';
          }
        }
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;

export function getAxiosErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const data = (error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })
      .response?.data;
    if (data?.errors && typeof data.errors === 'object') {
      for (const key of Object.keys(data.errors)) {
        const arr = data.errors[key];
        if (Array.isArray(arr) && arr[0]) {
          return String(arr[0]);
        }
      }
    }
    if (typeof data?.message === 'string' && data.message.trim()) {
      return data.message;
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Something went wrong';
}

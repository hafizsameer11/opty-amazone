import axios from 'axios';

const LIVE_API_ORIGIN = 'https://api.vistaexpress.it';
const LIVE_BUYER_API_PROXY = '/vista-service';

/** Base URL without /api (works with env as http://host or http://host/api). */
export function getApiOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL || `${LIVE_API_ORIGIN}/api`;
  const origin = raw.replace(/\/api\/?$/, '') || LIVE_API_ORIGIN;

  // NEXT_PUBLIC_* values are baked into the browser bundle at build time. A
  // production .env.production left over from local work (localhost:8000)
  // would otherwise make every buyer request target the visitor's machine.
  if (typeof window !== 'undefined') {
    try {
      const parsedOrigin = new URL(origin);
      const host = parsedOrigin.hostname;
      const isLocalApi = host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0';
      const isPublicSite = !['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname);
      const isInsecureApi = window.location.protocol === 'https:' && parsedOrigin.protocol !== 'https:';

      if (isPublicSite && (isLocalApi || isInsecureApi)) return LIVE_API_ORIGIN;
    } catch {
      return LIVE_API_ORIGIN;
    }
  }

  return origin;
}

/**
 * The public Buyer site uses a same-origin Next.js rewrite instead of making
 * browser requests directly to api.vistaexpress.it. Besides avoiding CORS
 * differences between browsers, this keeps browser privacy/ad-blocking rules
 * from blocking the API subdomain and leaving the UI in a permanent loader.
 * Local/staging development continues to use the configured API URL directly.
 */
function getApiBaseUrl(): string {
  if (
    typeof window !== 'undefined'
    && (window.location.hostname === 'buyer.vistaexpress.it'
      || window.location.hostname.endsWith('.buyer.vistaexpress.it'))
  ) {
    return LIVE_BUYER_API_PROXY;
  }

  return `${getApiOrigin()}/api`;
}

const API_BASE_URL = getApiBaseUrl();

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
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear token but don't auto-redirect on public pages
      // This allows guest browsing for public pages
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname;
        const protectedRoutes = ['/cart', '/checkout', '/profile', '/orders', '/account'];
        const isProtectedRoute = protectedRoutes.some(route => currentPath.startsWith(route));
        const isAuthPage = currentPath.startsWith('/auth/');
        
        // Clear token in all cases
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        
        // Only redirect if we're on a protected route and not already on auth page
        if (isProtectedRoute && !isAuthPage) {
          window.location.href = `/auth/login?redirect=${encodeURIComponent(currentPath)}`;
        }
        // For public routes, just clear the token silently (no redirect)
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Readable message from Laravel/axios error responses (validation `errors`, `message`, etc.).
 */
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

export default apiClient;

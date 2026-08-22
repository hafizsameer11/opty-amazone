import axios from 'axios';

/** Base URL without /api (works with env as http://host or http://host/api). */
export function getApiOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL || 'https://api.vistaexpress.it/api';
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

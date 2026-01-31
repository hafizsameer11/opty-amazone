import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

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

export default apiClient;

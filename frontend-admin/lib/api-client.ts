/**
 * Admin API client.
 *
 * Production: set NEXT_PUBLIC_API_URL to your API base including `/api`, e.g.
 *   https://api.example.com/api
 * If the value omits `/api`, it is appended from getApiOrigin().
 */
import axios from 'axios';

function getApiOrigin(): string {
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

import axios from 'axios';
import { toast } from '../context/ToastContext';

const getBaseUrl = (): string => {
  const envUrl = (import.meta.env.VITE_API_URL as string) || 'http://localhost:4000/api';
  const trimmed = envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
};

const api = axios.create({
  baseURL: getBaseUrl(),
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000, // Challenge 206: Enforce client-side timeout of 15 seconds
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle responses, 401/403 auth expiration, and network errors globally
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // 1. Network Failure
    if (!error.response || error.code === 'ERR_NETWORK') {
      const netMsg = 'Network failure: Unable to reach the server. Please check your connection.';
      toast.error(netMsg);
      const netErr = new Error(netMsg);
      (netErr as any).isNetworkError = true;
      return Promise.reject(netErr);
    }

    const status = error.response.status;
    const errorMsg = error.response.data?.error || error.response.data?.message || 'An unexpected error occurred.';

    // 2. Authentication / Authorization Failure (401 or 403 on session endpoints)
    const isAuthEndpoint = error.config?.url?.includes('/auth/login') || error.config?.url?.includes('/auth/register');
    const isSessionAuthError =
      status === 401 ||
      (status === 403 && (error.config?.url?.includes('/auth/me') || errorMsg.toLowerCase().includes('disabled') || errorMsg.toLowerCase().includes('token')));

    if (isSessionAuthError && !isAuthEndpoint) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.setItem('auth_redirect_reason', errorMsg);

      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        toast.warning(errorMsg);
        window.location.href = '/login';
      }
    }

    // Attach standardized properties for uniform error handling
    (error as any).message = errorMsg;
    (error as any).status = status;
    (error as any).requestId = error.response?.data?.requestId;
    (error as any).details = error.response?.data?.details;

    return Promise.reject(error);
  }
);

export default api;
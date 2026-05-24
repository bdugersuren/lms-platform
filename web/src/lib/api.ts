import axios from 'axios';
import { useAuthStore } from '@/store/auth.store';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false,
});

function getTenantSlugFromHost(): string | null {
  if (typeof window === 'undefined') return null;
  const hostname = window.location.hostname;
  const platformDomain = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN ?? 'platform.mn';
  const defaultTenant = process.env.NEXT_PUBLIC_DEFAULT_TENANT_SLUG ?? 'demo';
  if (hostname === 'localhost' || hostname.includes('127.0.0.1')) return defaultTenant;
  if (hostname === platformDomain || hostname === `www.${platformDomain}`) return 'www';
  if (hostname.endsWith(`.${platformDomain}`)) {
    return hostname.slice(0, -(platformDomain.length + 1)) || defaultTenant;
  }
  return `__domain__:${hostname}`;
}

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const tenantSlug = getTenantSlugFromHost();
    if (tenantSlug) {
      config.headers['x-tenant-slug'] = tenantSlug;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isPublicAuthRoute =
      error.config?.url?.includes('/auth/login') ||
      error.config?.url?.includes('/auth/register') ||
      error.config?.url?.includes('/auth/refresh');

    if (error.response?.status === 401 && !isPublicAuthRoute) {
      useAuthStore.getState().logout();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }

    const message =
      error.response?.data?.message ?? error.message ?? 'An unexpected error occurred';
    return Promise.reject(new Error(String(message)));
  },
);

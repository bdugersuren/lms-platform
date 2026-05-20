'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import type { ApiResponse, AuthTokens, ChangePasswordDto, LoginDto, RegisterDto, UserProfile } from '@/types/auth';

export interface AdminUsersParams {
  page?: number;
  limit?: number;
  role?: UserProfile['role'];
  enabled?: boolean;
}

export interface AdminUserItem {
  id: string;
  email: string;
  role: UserProfile['role'];
  isActive: boolean;
  createdAt: string;
}

export interface PaginatedUsers {
  items: AdminUserItem[];
  total: number;
  page: number;
  limit: number;
}

export function useRegister() {
  const { setTokens } = useAuthStore();
  const router = useRouter();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (dto: RegisterDto) => {
      const res = await api.post<ApiResponse<AuthTokens>>('/auth/register', dto);
      return res.data;
    },
    onSuccess: (data) => {
      setTokens(data.data.accessToken, data.data.refreshToken);
      qc.removeQueries({ queryKey: ['me'] });
      qc.removeQueries({ queryKey: ['user-profile'] });
      router.push('/dashboard');
    },
  });
}

export function useLogin() {
  const { setTokens } = useAuthStore();
  const router = useRouter();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (dto: LoginDto) => {
      const res = await api.post<ApiResponse<AuthTokens>>('/auth/login', dto);
      return res.data;
    },
    onSuccess: (data) => {
      setTokens(data.data.accessToken, data.data.refreshToken);
      qc.removeQueries({ queryKey: ['me'] });
      qc.removeQueries({ queryKey: ['user-profile'] });
      router.push('/dashboard');
    },
  });
}

export function useMe() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<UserProfile>>('/auth/me');
      return res.data.data;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLogout() {
  const { logout } = useAuthStore();
  const router = useRouter();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSettled: () => {
      logout();
      qc.clear();
      router.push('/login');
    },
  });
}

export function useLogoutAll() {
  const { logout } = useAuthStore();
  const router = useRouter();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => api.post('/auth/logout-all'),
    onSettled: () => {
      logout();
      qc.clear();
      router.push('/login');
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (dto: ChangePasswordDto) => api.patch('/auth/change-password', dto),
  });
}

export function useAdminUsers({ enabled = true, ...params }: AdminUsersParams = {}) {
  return useQuery({
    queryKey: ['admin', 'users', params],
    queryFn: async () => {
      const res = await api.get<ApiResponse<PaginatedUsers>>('/auth/users', { params });
      return res.data.data;
    },
    staleTime: 30 * 1000,
    enabled,
  });
}

export function useUpdateUserStatus() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/auth/users/${id}/status`, { isActive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}

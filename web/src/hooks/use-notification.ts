import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  Notification,
  NotificationList,
  NotificationPreference,
  UpdatePreferencesDto,
} from '@/types/notification';

interface ApiSuccess<T> {
  success: boolean;
  data: T;
  message?: string;
}

const KEYS = {
  notifications: (params?: object) => ['notifications', params] as const,
  unreadCount: () => ['notifications', 'unread-count'] as const,
  preferences: () => ['notifications', 'preferences'] as const,
};

export function useNotifications(params?: { unreadOnly?: boolean; limit?: number; offset?: number }) {
  return useQuery<NotificationList>({
    queryKey: KEYS.notifications(params),
    queryFn: async () => {
      const search = new URLSearchParams();
      if (params?.unreadOnly) search.set('unreadOnly', 'true');
      if (params?.limit) search.set('limit', String(params.limit));
      if (params?.offset) search.set('offset', String(params.offset));
      const { data } = await api.get<ApiSuccess<NotificationList>>(
        `/notifications${search.toString() ? `?${search}` : ''}`,
      );
      return data.data;
    },
    refetchInterval: 30000,
  });
}

export function useUnreadCount() {
  return useQuery<{ count: number }>({
    queryKey: KEYS.unreadCount(),
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<{ count: number }>>('/notifications/unread-count');
      return data.data;
    },
    refetchInterval: 15000,
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation<Notification, Error, string>({
    mutationFn: async (id) => {
      const { data } = await api.patch<ApiSuccess<Notification>>(`/notifications/${id}/read`);
      return data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation<{ updated: number }, Error, void>({
    mutationFn: async () => {
      const { data } = await api.patch<ApiSuccess<{ updated: number }>>('/notifications/read-all');
      return data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useDeleteNotification() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await api.delete(`/notifications/${id}`);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useNotificationPreferences() {
  return useQuery<NotificationPreference>({
    queryKey: KEYS.preferences(),
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<NotificationPreference>>('/notifications/preferences');
      return data.data;
    },
  });
}

export function useUpdatePreferences() {
  const qc = useQueryClient();
  return useMutation<NotificationPreference, Error, UpdatePreferencesDto>({
    mutationFn: async (dto) => {
      const { data } = await api.patch<ApiSuccess<NotificationPreference>>('/notifications/preferences', dto);
      return data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: KEYS.preferences() });
    },
  });
}

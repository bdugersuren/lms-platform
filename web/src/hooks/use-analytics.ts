import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  AnalyticsOverview, TimeSeriesPoint, EventsPage,
  CourseStat, UserActivityPoint, EventBreakdownItem,
} from '@/types/analytics';

interface ApiSuccess<T> { success: boolean; data: T; }

const STALE = 60_000; // 1 min

export function useAnalyticsOverview() {
  return useQuery<AnalyticsOverview>({
    queryKey: ['analytics-overview'],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<AnalyticsOverview>>('/analytics/overview');
      return data.data;
    },
    staleTime: STALE,
    refetchInterval: 30_000,
  });
}

export function useAnalyticsTimeSeries(days = 30) {
  return useQuery<TimeSeriesPoint[]>({
    queryKey: ['analytics-timeseries', days],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<TimeSeriesPoint[]>>(`/analytics/timeseries?days=${days}`);
      return data.data;
    },
    staleTime: STALE,
  });
}

export function useAnalyticsEvents(params?: { limit?: number; offset?: number; eventType?: string }) {
  return useQuery<EventsPage>({
    queryKey: ['analytics-events', params],
    queryFn: async () => {
      const q = new URLSearchParams();
      if (params?.limit) q.set('limit', String(params.limit));
      if (params?.offset) q.set('offset', String(params.offset));
      if (params?.eventType) q.set('eventType', params.eventType);
      const { data } = await api.get<ApiSuccess<EventsPage>>(`/analytics/events${q.toString() ? `?${q}` : ''}`);
      return data.data;
    },
    staleTime: STALE,
  });
}

export function useAnalyticsCourseStats() {
  return useQuery<CourseStat[]>({
    queryKey: ['analytics-courses'],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<CourseStat[]>>('/analytics/courses?limit=10');
      return data.data;
    },
    staleTime: STALE,
  });
}

export function useUserActivity(days = 30) {
  return useQuery<UserActivityPoint[]>({
    queryKey: ['analytics-user-activity', days],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<UserActivityPoint[]>>(`/analytics/user-activity?days=${days}`);
      return data.data;
    },
    staleTime: STALE,
  });
}

export function useEventBreakdown() {
  return useQuery<EventBreakdownItem[]>({
    queryKey: ['analytics-breakdown'],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<EventBreakdownItem[]>>('/analytics/event-breakdown');
      return data.data;
    },
    staleTime: STALE,
  });
}

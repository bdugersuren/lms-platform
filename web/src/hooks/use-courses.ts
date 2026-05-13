import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  Course,
  CourseDetailResponse,
  CourseListResponse,
  CreateCourseDto,
} from '@/types/course';

export interface CourseQueryParams {
  page?: number;
  limit?: number;
  status?: string;
  level?: string;
  instructorId?: string;
  search?: string;
}

export function useCourses(params: CourseQueryParams = {}) {
  return useQuery<CourseListResponse>({
    queryKey: ['courses', params],
    queryFn: async () => {
      const search = new URLSearchParams();
      if (params.page) search.set('page', String(params.page));
      if (params.limit) search.set('limit', String(params.limit));
      if (params.status) search.set('status', params.status);
      if (params.level) search.set('level', params.level);
      if (params.instructorId) search.set('instructorId', params.instructorId);
      if (params.search) search.set('search', params.search);

      const qs = search.toString();
      const { data } = await api.get<CourseListResponse>(`/courses${qs ? `?${qs}` : ''}`);
      return data;
    },
  });
}

export function useCourse(id: string) {
  return useQuery<CourseDetailResponse>({
    queryKey: ['course', id],
    queryFn: async () => {
      const { data } = await api.get<CourseDetailResponse>(`/courses/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateCourse() {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean; data: Course }, Error, CreateCourseDto>({
    mutationFn: async (dto) => {
      const { data } = await api.post('/courses', dto);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
  });
}

export function useUpdateCourse(id: string) {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean; data: Course }, Error, Partial<CreateCourseDto>>({
    mutationFn: async (dto) => {
      const { data } = await api.patch(`/courses/${id}`, dto);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['courses'] });
      void queryClient.invalidateQueries({ queryKey: ['course', id] });
    },
  });
}

export function usePublishCourse() {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean; data: Course }, Error, string>({
    mutationFn: async (id) => {
      const { data } = await api.post(`/courses/${id}/publish`);
      return data;
    },
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: ['courses'] });
      void queryClient.invalidateQueries({ queryKey: ['course', id] });
    },
  });
}

export function useArchiveCourse() {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean; data: Course }, Error, string>({
    mutationFn: async (id) => {
      const { data } = await api.post(`/courses/${id}/archive`);
      return data;
    },
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: ['courses'] });
      void queryClient.invalidateQueries({ queryKey: ['course', id] });
    },
  });
}

export function useDeleteCourse() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await api.delete(`/courses/${id}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
  });
}

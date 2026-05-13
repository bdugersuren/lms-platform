import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CourseModule, Lesson } from '@/types/course';

// ─── Modules ────────────────────────────────────────────────────────────────

export function useModules(courseId: string) {
  return useQuery<{ success: boolean; data: CourseModule[]; message: string }>({
    queryKey: ['modules', courseId],
    queryFn: async () => {
      const { data } = await api.get(`/courses/${courseId}/modules`);
      return data;
    },
    enabled: !!courseId,
  });
}

export function useCreateModule(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation<
    { success: boolean; data: CourseModule },
    Error,
    { title: string; description?: string; sortOrder?: number; unlockScore?: number | null }
  >({
    mutationFn: async (dto) => {
      const { data } = await api.post(`/courses/${courseId}/modules`, dto);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['modules', courseId] });
      void queryClient.invalidateQueries({ queryKey: ['course', courseId] });
    },
  });
}

export function useUpdateModule(courseId: string, moduleId: string) {
  const queryClient = useQueryClient();
  return useMutation<
    { success: boolean; data: CourseModule },
    Error,
    { title?: string; description?: string; sortOrder?: number; unlockScore?: number | null }
  >({
    mutationFn: async (dto) => {
      const { data } = await api.patch(`/courses/${courseId}/modules/${moduleId}`, dto);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['modules', courseId] });
      void queryClient.invalidateQueries({ queryKey: ['course', courseId] });
    },
  });
}

export function useDeleteModule(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean; data: null }, Error, string>({
    mutationFn: async (moduleId) => {
      const { data } = await api.delete(`/courses/${courseId}/modules/${moduleId}`);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['modules', courseId] });
      void queryClient.invalidateQueries({ queryKey: ['course', courseId] });
    },
  });
}

// ─── Lessons ────────────────────────────────────────────────────────────────

export function useLesson(courseId: string, moduleId: string, lessonId: string) {
  return useQuery<{ success: boolean; data: Lesson; message: string }>({
    queryKey: ['lesson', lessonId],
    queryFn: async () => {
      const { data } = await api.get(
        `/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`,
      );
      return data;
    },
    enabled: !!courseId && !!moduleId && !!lessonId,
  });
}

export function useCreateLesson(courseId: string, moduleId: string) {
  const queryClient = useQueryClient();
  return useMutation<
    { success: boolean; data: Lesson },
    Error,
    {
      title: string;
      lessonType?: string;
      sortOrder?: number;
      estimatedMinutes?: number | null;
      isPreview?: boolean;
      description?: string;
    }
  >({
    mutationFn: async (dto) => {
      const { data } = await api.post(
        `/courses/${courseId}/modules/${moduleId}/lessons`,
        dto,
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['modules', courseId] });
      void queryClient.invalidateQueries({ queryKey: ['lesson'] });
    },
  });
}

export function useUpdateLesson(courseId: string, moduleId: string, lessonId: string) {
  const queryClient = useQueryClient();
  return useMutation<
    { success: boolean; data: Lesson },
    Error,
    Partial<{
      title: string;
      description: string;
      lessonType: string;
      sortOrder: number;
      estimatedMinutes: number | null;
      isPreview: boolean;
      passingScore: number;
      unlockNextOnPass: boolean;
      contentUrl: string | null;
      rawMarkdown: string | null;
      rawText: string | null;
    }>
  >({
    mutationFn: async (dto) => {
      const { data } = await api.patch(
        `/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`,
        dto,
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['lesson', lessonId] });
      void queryClient.invalidateQueries({ queryKey: ['modules', courseId] });
    },
  });
}

export function useDeleteLesson(courseId: string, moduleId: string) {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean; data: null }, Error, string>({
    mutationFn: async (lessonId) => {
      const { data } = await api.delete(
        `/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`,
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['modules', courseId] });
    },
  });
}

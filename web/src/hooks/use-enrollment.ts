import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface LessonProgress {
  id: string;
  lessonId: string;
  status: 'LOCKED' | 'IN_PROGRESS' | 'COMPLETED';
  progressPercent: number;
  score: number | null;
  completed: boolean;
  unlockedAt: string | null;
  completedAt: string | null;
}

export interface Enrollment {
  id: string;
  courseId: string;
  studentId: string;
  progressPercent: number;
  totalScore: number;
  completed: boolean;
  enrolledAt: string;
  completedAt: string | null;
  lessonProgresses?: LessonProgress[];
  course?: {
    id: string;
    title: string;
    thumbnail: string | null;
    slug: string;
    totalLessons: number;
    totalMinutes: number;
  };
}

export function useMyEnrollments() {
  return useQuery<Enrollment[]>({
    queryKey: ['enrollments', 'my'],
    queryFn: async () => {
      const res = await api.get<{ data: Enrollment[] }>('/enrollments/my');
      return res.data.data;
    },
  });
}

export function useEnrollment(enrollmentId: string | null | undefined) {
  return useQuery<Enrollment>({
    queryKey: ['enrollments', enrollmentId],
    enabled: !!enrollmentId,
    queryFn: async () => {
      const res = await api.get<{ data: Enrollment }>(`/enrollments/${enrollmentId}`);
      return res.data.data;
    },
  });
}

export function useEnrollmentByCourse(courseId: string | null | undefined) {
  return useQuery<Enrollment>({
    queryKey: ['enrollments', 'by-course', courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const res = await api.get<{ data: Enrollment }>(`/enrollments/by-course/${courseId}`);
      return res.data.data;
    },
    retry: (failureCount, error: unknown) => {
      const err = error as { response?: { status?: number } };
      if (err?.response?.status === 404) return false;
      return failureCount < 2;
    },
  });
}

export function useCheckEnrollment(courseId: string | null | undefined) {
  return useQuery<{ enrolled: boolean }>({
    queryKey: ['enrollments', 'check', courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const res = await api.get<{ data: { enrolled: boolean } }>('/enrollments/check', {
        params: { courseId },
      });
      return res.data.data;
    },
  });
}

export function useEnroll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (courseId: string) => {
      const res = await api.post<{ data: Enrollment }>('/enrollments', { courseId });
      return res.data.data;
    },
    onSuccess: (_data, courseId) => {
      void qc.invalidateQueries({ queryKey: ['enrollments'] });
      void qc.invalidateQueries({ queryKey: ['enrollments', 'check', courseId] });
      void qc.invalidateQueries({ queryKey: ['enrollments', 'by-course', courseId] });
    },
  });
}

export function useUnenroll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (enrollmentId: string) => {
      await api.delete(`/enrollments/${enrollmentId}`);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['enrollments'] });
    },
  });
}

export function useCompleteLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      enrollmentId,
      lessonId,
    }: {
      enrollmentId: string;
      lessonId: string;
    }) => {
      const res = await api.post<{ data: LessonProgress }>(
        `/enrollments/${enrollmentId}/progress/${lessonId}/complete`,
      );
      return res.data.data;
    },
    onSuccess: (_data, { enrollmentId }) => {
      void qc.invalidateQueries({ queryKey: ['enrollments', enrollmentId] });
      void qc.invalidateQueries({ queryKey: ['enrollments', 'my'] });
      void qc.invalidateQueries({ queryKey: ['certificates'] });
    },
  });
}

export function useUpdateLessonProgress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      enrollmentId,
      lessonId,
      progressPercent,
      score,
    }: {
      enrollmentId: string;
      lessonId: string;
      progressPercent?: number;
      score?: number;
    }) => {
      const res = await api.patch<{ data: LessonProgress }>(
        `/enrollments/${enrollmentId}/progress/${lessonId}`,
        { progressPercent, score },
      );
      return res.data.data;
    },
    onSuccess: (_data, { enrollmentId }) => {
      void qc.invalidateQueries({ queryKey: ['enrollments', enrollmentId] });
    },
  });
}

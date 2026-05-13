import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Quiz, QuizAttempt, CreateQuizDto, SubmitAttemptDto } from '@/types/quiz';

interface ApiSuccess<T> {
  success: boolean;
  data: T;
  message?: string;
}

export function useQuizzesByCourse(courseId: string) {
  return useQuery<Quiz[]>({
    queryKey: ['quizzes', { courseId }],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<Quiz[]>>(`/quizzes?courseId=${courseId}`);
      return data.data;
    },
    enabled: !!courseId,
  });
}

export function useQuiz(id: string) {
  return useQuery<Quiz>({
    queryKey: ['quiz', id],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<Quiz>>(`/quizzes/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useCreateQuiz() {
  const qc = useQueryClient();
  return useMutation<Quiz, Error, CreateQuizDto>({
    mutationFn: async (dto) => {
      const { data } = await api.post<ApiSuccess<Quiz>>('/quizzes', dto);
      return data.data;
    },
    onSuccess: (quiz) => {
      void qc.invalidateQueries({ queryKey: ['quizzes', { courseId: quiz.courseId }] });
    },
  });
}

export function usePublishQuiz() {
  const qc = useQueryClient();
  return useMutation<Quiz, Error, string>({
    mutationFn: async (id) => {
      const { data } = await api.post<ApiSuccess<Quiz>>(`/quizzes/${id}/publish`);
      return data.data;
    },
    onSuccess: (_data, id) => {
      void qc.invalidateQueries({ queryKey: ['quiz', id] });
    },
  });
}

export function useMyAttempts(quizId: string) {
  return useQuery<QuizAttempt[]>({
    queryKey: ['quiz-attempts', quizId, 'my'],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<QuizAttempt[]>>(`/quizzes/${quizId}/attempts/my`);
      return data.data;
    },
    enabled: !!quizId,
  });
}

export function useStartAttempt() {
  const qc = useQueryClient();
  return useMutation<QuizAttempt, Error, string>({
    mutationFn: async (quizId) => {
      const { data } = await api.post<ApiSuccess<QuizAttempt>>(`/quizzes/${quizId}/attempts`);
      return data.data;
    },
    onSuccess: (_data, quizId) => {
      void qc.invalidateQueries({ queryKey: ['quiz-attempts', quizId] });
    },
  });
}

export function useSubmitAttempt() {
  const qc = useQueryClient();
  return useMutation<
    QuizAttempt,
    Error,
    { quizId: string; attemptId: string; dto: SubmitAttemptDto }
  >({
    mutationFn: async ({ quizId, attemptId, dto }) => {
      const { data } = await api.post<ApiSuccess<QuizAttempt>>(
        `/quizzes/${quizId}/attempts/${attemptId}/submit`,
        dto,
      );
      return data.data;
    },
    onSuccess: (_data, { quizId }) => {
      void qc.invalidateQueries({ queryKey: ['quiz-attempts', quizId] });
    },
  });
}

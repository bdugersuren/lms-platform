import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  Assignment,
  Submission,
  Grade,
  CreateAssignmentDto,
  CreateSubmissionDto,
  CreateGradeDto,
} from '@/types/assignment';

interface ApiSuccess<T> {
  success: boolean;
  data: T;
  message?: string;
}

export function useAssignmentsByCourse(courseId: string) {
  return useQuery<Assignment[]>({
    queryKey: ['assignments', { courseId }],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<Assignment[]>>(`/assignments?courseId=${courseId}`);
      return data.data;
    },
    enabled: !!courseId,
  });
}

export function useAssignment(id: string) {
  return useQuery<Assignment>({
    queryKey: ['assignment', id],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<Assignment>>(`/assignments/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useCreateAssignment() {
  const qc = useQueryClient();
  return useMutation<Assignment, Error, CreateAssignmentDto>({
    mutationFn: async (dto) => {
      const { data } = await api.post<ApiSuccess<Assignment>>('/assignments', dto);
      return data.data;
    },
    onSuccess: (a) => {
      void qc.invalidateQueries({ queryKey: ['assignments', { courseId: a.courseId }] });
    },
  });
}

export function usePublishAssignment() {
  const qc = useQueryClient();
  return useMutation<Assignment, Error, string>({
    mutationFn: async (id) => {
      const { data } = await api.post<ApiSuccess<Assignment>>(`/assignments/${id}/publish`);
      return data.data;
    },
    onSuccess: (_d, id) => {
      void qc.invalidateQueries({ queryKey: ['assignment', id] });
    },
  });
}

export function useMySubmission(assignmentId: string) {
  return useQuery<Submission>({
    queryKey: ['submission', assignmentId, 'my'],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<Submission>>(
        `/assignments/${assignmentId}/submissions/my`,
      );
      return data.data;
    },
    enabled: !!assignmentId,
    retry: false,
  });
}

export function useAssignmentSubmissions(assignmentId: string) {
  return useQuery<Submission[]>({
    queryKey: ['submissions', assignmentId],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<Submission[]>>(
        `/assignments/${assignmentId}/submissions`,
      );
      return data.data;
    },
    enabled: !!assignmentId,
  });
}

export function useSaveDraft(assignmentId: string) {
  const qc = useQueryClient();
  return useMutation<Submission, Error, CreateSubmissionDto>({
    mutationFn: async (dto) => {
      const { data } = await api.post<ApiSuccess<Submission>>(
        `/assignments/${assignmentId}/submissions/draft`,
        dto,
      );
      return data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['submission', assignmentId] });
    },
  });
}

export function useSubmitAssignment(assignmentId: string) {
  const qc = useQueryClient();
  return useMutation<Submission, Error, void>({
    mutationFn: async () => {
      const { data } = await api.post<ApiSuccess<Submission>>(
        `/assignments/${assignmentId}/submissions/submit`,
      );
      return data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['submission', assignmentId] });
    },
  });
}

export function useGradeSubmission() {
  const qc = useQueryClient();
  return useMutation<Grade, Error, { submissionId: string; dto: CreateGradeDto }>({
    mutationFn: async ({ submissionId, dto }) => {
      const { data } = await api.post<ApiSuccess<Grade>>(
        `/submissions/${submissionId}/grade`,
        dto,
      );
      return data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['submissions'] });
    },
  });
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Certificate, CertificateList, VerifyResult, CreateCertificateDto } from '@/types/certificate';

interface ApiSuccess<T> { success: boolean; data: T; message?: string; }

export function useCertificates(params?: {
  search?: string;
  limit?: number;
  offset?: number;
  enabled?: boolean;
  includeRevoked?: boolean;
}) {
  return useQuery<CertificateList>({
    queryKey: ['certificates', params],
    queryFn: async () => {
      const q = new URLSearchParams();
      if (params?.search) q.set('search', params.search);
      if (params?.limit) q.set('limit', String(params.limit));
      if (params?.offset) q.set('offset', String(params.offset));
      if (params?.includeRevoked) q.set('includeRevoked', 'true');
      const { data } = await api.get<ApiSuccess<CertificateList>>(`/certificates${q.toString() ? `?${q}` : ''}`);
      return data.data;
    },
    enabled: params?.enabled ?? true,
  });
}

export function useCertificate(id: string) {
  return useQuery<Certificate>({
    queryKey: ['certificate', id],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<Certificate>>(`/certificates/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useVerifyCertificate(code: string) {
  return useQuery<VerifyResult>({
    queryKey: ['certificate-verify', code],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<VerifyResult>>(`/certificates/verify/${code}`);
      return data.data;
    },
    enabled: !!code,
    retry: false,
  });
}

export function useIssueCertificate() {
  const qc = useQueryClient();
  return useMutation<Certificate, Error, CreateCertificateDto>({
    mutationFn: async (dto) => {
      const { data } = await api.post<ApiSuccess<Certificate>>('/certificates', dto);
      return data.data;
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['certificates'] }); },
  });
}

export function useConfirmCertificate() {
  const qc = useQueryClient();
  return useMutation<Certificate, Error, string>({
    mutationFn: async (id) => {
      const { data } = await api.patch<ApiSuccess<Certificate>>(`/certificates/${id}/confirm`);
      return data.data;
    },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['certificates'] }); },
  });
}

export function useRevokeCertificate() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => { await api.delete(`/certificates/${id}`); },
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['certificates'] }); },
  });
}

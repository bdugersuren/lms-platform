import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { TenantConfig, TenantBranding, TenantSeo, FooterConfig } from '@/types/tenant';

export interface UpdateTenantDto {
  name?: string;
  nameMn?: string;
  tagline?: string;
  taglineMn?: string;
  branding?: Partial<TenantBranding>;
  seo?: Partial<TenantSeo>;
  footer?: Partial<FooterConfig>;
}

export function useTenantSettings() {
  return useQuery<TenantConfig>({
    queryKey: ['tenant', 'settings'],
    queryFn: async () => {
      const res = await api.get<{ data: TenantConfig }>('/tenants/me');
      return res.data.data;
    },
    staleTime: 60 * 1000,
  });
}

export function useUpdateTenantSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: UpdateTenantDto) => {
      const res = await api.patch<{ data: TenantConfig }>('/tenants/me', dto);
      return res.data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tenant'] });
    },
  });
}

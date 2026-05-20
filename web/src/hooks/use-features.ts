import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { TenantFeatures } from '@/types/tenant';

export function useUpdateFeatures() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (features: Partial<TenantFeatures>) => {
      const res = await api.patch<{ data: TenantFeatures }>('/tenants/me/features', { features });
      return res.data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tenant'] });
    },
  });
}

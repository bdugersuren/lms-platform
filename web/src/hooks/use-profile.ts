import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import type { ApiResponse, UserProfile } from '@/types/auth';
import type { PublicProfile, UpdateProfileDto, UserServiceProfile } from '@/types/user';
import { computeCompletion, type CompletionResult } from '@/lib/profile-completion';
import type { UserRole } from '@/lib/rbac';

export function useMyProfile() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery({
    queryKey: ['user-profile', 'me'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<UserServiceProfile>>('/users/me');
      return res.data.data;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (dto: UpdateProfileDto) => {
      const res = await api.patch<ApiResponse<UserServiceProfile>>('/users/me', dto);
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-profile', 'me'] });
    },
  });
}

// me comes from useMe() in the calling component — preserves auth/profile domain separation.
// React Query deduplicates the underlying ['me'] query so there is no extra network request.
export function useProfileCompletion(
  me: Pick<UserProfile, 'role' | 'email'> | undefined,
): CompletionResult | null {
  const { data: profile } = useMyProfile();
  if (!profile || !me) return null;
  return computeCompletion(profile, me.role as UserRole, me.email);
}

export function usePublicProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-profile', userId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<PublicProfile>>(`/users/${userId}`);
      return res.data.data;
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000,
  });
}

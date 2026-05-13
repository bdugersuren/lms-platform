import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  Wallet,
  Transaction,
  RevenueShare,
  RevenueSummary,
  Payout,
  Paginated,
  CreatePayoutDto,
} from '@/types/wallet';

interface ApiSuccess<T> { success: boolean; data: T; message?: string }

export function useMyWallet() {
  return useQuery<Wallet>({
    queryKey: ['wallet', 'me'],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<Wallet>>('/wallet/me');
      return data.data;
    },
  });
}

export function useInitWallet() {
  const qc = useQueryClient();
  return useMutation<Wallet, Error, void>({
    mutationFn: async () => {
      const { data } = await api.post<ApiSuccess<Wallet>>('/wallet/me/init');
      return data.data;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['wallet', 'me'] }),
  });
}

export function useTransactions(page = 1, limit = 20) {
  return useQuery<Paginated<Transaction>>({
    queryKey: ['wallet', 'transactions', page, limit],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<Paginated<Transaction>>>(
        `/wallet/transactions?page=${page}&limit=${limit}`,
      );
      return data.data;
    },
  });
}

export function useRevenueSummary() {
  return useQuery<RevenueSummary>({
    queryKey: ['wallet', 'revenue', 'summary'],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<RevenueSummary>>('/wallet/revenue/summary');
      return data.data;
    },
  });
}

export function useRevenueHistory(page = 1, limit = 20) {
  return useQuery<Paginated<RevenueShare>>({
    queryKey: ['wallet', 'revenue', page, limit],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<Paginated<RevenueShare>>>(
        `/wallet/revenue?page=${page}&limit=${limit}`,
      );
      return data.data;
    },
  });
}

export function useMyPayouts(page = 1, limit = 20) {
  return useQuery<Paginated<Payout>>({
    queryKey: ['wallet', 'payouts', page, limit],
    queryFn: async () => {
      const { data } = await api.get<ApiSuccess<Paginated<Payout>>>(
        `/wallet/payouts?page=${page}&limit=${limit}`,
      );
      return data.data;
    },
  });
}

export function useRequestPayout() {
  const qc = useQueryClient();
  return useMutation<Payout, Error, CreatePayoutDto>({
    mutationFn: async (dto) => {
      const { data } = await api.post<ApiSuccess<Payout>>('/wallet/payouts', dto);
      return data.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['wallet'] });
    },
  });
}

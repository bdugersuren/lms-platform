import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CreatePaymentDto, Paginated, Payment, PaymentStatus } from '@/types/payment';

const PAYMENTS_KEY = 'payments';

// ── Queries ───────────────────────────────────────────────────────────────────

export function useMyPayments(page = 1, status?: PaymentStatus) {
  return useQuery<Paginated<Payment>>({
    queryKey: [PAYMENTS_KEY, 'me', page, status],
    queryFn: () =>
      api
        .get('payments/me', { params: { page, limit: 10, ...(status ? { status } : {}) } })
        .then((r) => r.data.data),
  });
}

export function usePayment(id: string | null) {
  return useQuery<Payment>({
    queryKey: [PAYMENTS_KEY, id],
    queryFn: () =>
      api.get(`payments/${id}`).then((r) => r.data.data),
    enabled: !!id,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreatePayment() {
  const qc = useQueryClient();
  return useMutation<Payment, Error, CreatePaymentDto>({
    mutationFn: (dto) =>
      api.post('payments', dto).then((r) => r.data.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [PAYMENTS_KEY] });
    },
  });
}

export function useCheckPayment() {
  const qc = useQueryClient();
  return useMutation<Payment, Error, string>({
    mutationFn: (id) =>
      api.post(`payments/${id}/check`, {}).then((r) => r.data.data),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: [PAYMENTS_KEY, data.id] });
      void qc.invalidateQueries({ queryKey: [PAYMENTS_KEY, 'me'] });
    },
  });
}

export function useSimulatePayment() {
  const qc = useQueryClient();
  return useMutation<{ received: boolean }, Error, string>({
    mutationFn: (id) =>
      api.post(`webhooks/simulate/${id}`, {}).then((r) => r.data.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [PAYMENTS_KEY] });
    },
  });
}

export function useMockPay() {
  const qc = useQueryClient();
  return useMutation<{ received: boolean }, Error, string>({
    mutationFn: (id) =>
      api.post(`webhooks/mock-pay/${id}`, {}).then((r) => r.data.data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [PAYMENTS_KEY] });
    },
  });
}

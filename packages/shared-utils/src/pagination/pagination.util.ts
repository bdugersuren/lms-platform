import { PaginationMeta, PaginationQuery } from '@lms/shared-types';

export function buildPaginationMeta(
  query: PaginationQuery,
  total: number,
): PaginationMeta {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(100, Math.max(1, query.limit ?? 20));
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

export function buildPrismaSkipTake(query: PaginationQuery): {
  skip: number;
  take: number;
} {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(100, Math.max(1, query.limit ?? 20));
  return {
    skip: (page - 1) * limit,
    take: limit,
  };
}

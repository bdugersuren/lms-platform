export interface TenantContext {
  tenantId: string;
  slug?: string;
  host?: string;
  currency?: string;
  platformFeePercent?: string;
}

export interface TenantHeaders {
  'x-tenant-id'?: string | string[];
  'x-tenant-slug'?: string | string[];
  'x-tenant-host'?: string | string[];
  'x-tenant-currency'?: string | string[];
  'x-tenant-platform-fee-percent'?: string | string[];
}

export function firstHeader(value?: string | string[]): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function tenantFromHeaders(headers: TenantHeaders): TenantContext | null {
  const tenantId = firstHeader(headers['x-tenant-id']);
  if (!tenantId) return null;

  return {
    tenantId,
    slug: firstHeader(headers['x-tenant-slug']),
    host: firstHeader(headers['x-tenant-host']),
    currency: firstHeader(headers['x-tenant-currency']),
    platformFeePercent: firstHeader(headers['x-tenant-platform-fee-percent']),
  };
}

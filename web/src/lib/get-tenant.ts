import { cache } from 'react';
import { headers } from 'next/headers';
import { fetchTenantConfig, fetchTenantByDomain } from './tenant-api';
import { DEFAULT_TENANT } from './default-tenant';
import type { TenantConfig } from '@/types/tenant';

export const getRequestTenant = cache(async (): Promise<TenantConfig> => {
  const h = headers();
  const slug = h.get('x-tenant-slug') ?? 'demo';

  let config: TenantConfig | null = null;

  if (slug.startsWith('__domain__:')) {
    const domain = slug.replace('__domain__:', '');
    config = await fetchTenantByDomain(domain);
  } else {
    config = await fetchTenantConfig(slug);
  }

  return config ?? DEFAULT_TENANT;
});

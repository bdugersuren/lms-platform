import type { TenantConfig } from '@/types/tenant';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api';

export async function fetchTenantConfig(slug: string): Promise<TenantConfig | null> {
  try {
    const res = await fetch(`${API_URL}/tenants/${slug}/config`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return res.json() as Promise<TenantConfig>;
  } catch {
    return null;
  }
}

export async function fetchTenantByDomain(domain: string): Promise<TenantConfig | null> {
  try {
    const res = await fetch(
      `${API_URL}/tenants/by-domain?domain=${encodeURIComponent(domain)}`,
      { next: { revalidate: 60 } },
    );
    if (!res.ok) return null;
    return res.json() as Promise<TenantConfig>;
  } catch {
    return null;
  }
}

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { FastifyRequest } from 'fastify';
import { lastValueFrom } from 'rxjs';

interface TenantConfigResponse {
  id: string;
  slug: string;
  defaultCurrency?: string;
  platformFeePercent?: string;
}

interface CacheEntry {
  value: TenantConfigResponse;
  expiresAt: number;
}

@Injectable()
export class TenantResolverService {
  private readonly logger = new Logger(TenantResolverService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly ttlMs = Number(process.env.TENANT_CACHE_TTL_MS ?? 60000);

  constructor(private readonly http: HttpService) {}

  async buildForwardHeaders(req: FastifyRequest): Promise<Record<string, string>> {
    const tenant = await this.resolve(req);
    if (!tenant) return {};

    return {
      'x-tenant-id': tenant.slug,
      'x-tenant-slug': tenant.slug,
      'x-tenant-host': this.getHost(req),
      'x-tenant-currency': tenant.defaultCurrency ?? 'MNT',
      'x-tenant-platform-fee-percent': tenant.platformFeePercent ?? '20',
    };
  }

  private async resolve(req: FastifyRequest): Promise<TenantConfigResponse | null> {
    const service = (req.params as Record<string, string> | undefined)?.['service'];
    const slug = this.getTenantSlug(req);

    if (!slug) return null;

    const cacheKey = slug;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    const baseUrl = process.env.TENANT_SERVICE_URL;
    if (!baseUrl) {
      if (process.env.NODE_ENV === 'production') {
        throw new NotFoundException('Tenant service is not configured');
      }
      return null;
    }

    try {
      const url = slug.startsWith('__domain__:')
        ? `${baseUrl}/api/tenants/by-domain?domain=${encodeURIComponent(slug.replace('__domain__:', ''))}`
        : `${baseUrl}/api/tenants/${encodeURIComponent(slug)}/config`;

      const response = await lastValueFrom(
        this.http.get<TenantConfigResponse>(url, { timeout: 3000 }),
      );
      this.cache.set(cacheKey, { value: response.data, expiresAt: Date.now() + this.ttlMs });
      return response.data;
    } catch (err) {
      this.logger.warn(
        `Tenant resolution failed for slug=${slug} service=${service ?? 'unknown'}: ${(err as Error).message}`,
      );
      if (process.env.NODE_ENV === 'production') {
        throw new NotFoundException('Tenant not found');
      }
      return null;
    }
  }

  private getTenantSlug(req: FastifyRequest): string | null {
    const explicit = req.headers['x-tenant-slug'];
    if (typeof explicit === 'string' && explicit.trim()) return explicit.trim();

    const host = this.getHost(req);
    const platformDomain =
      process.env.PLATFORM_DOMAIN ?? process.env.NEXT_PUBLIC_PLATFORM_DOMAIN ?? 'platform.mn';
    const defaultTenant =
      process.env.DEFAULT_TENANT_SLUG ?? process.env.NEXT_PUBLIC_DEFAULT_TENANT_SLUG ?? 'demo';

    if (!host || host.startsWith('localhost') || host.startsWith('127.0.0.1')) return defaultTenant;
    if (host === platformDomain || host === `www.${platformDomain}`) return defaultTenant;
    if (host.endsWith(`.${platformDomain}`)) {
      return host.slice(0, -(platformDomain.length + 1)) || defaultTenant;
    }
    return `__domain__:${host}`;
  }

  private getHost(req: FastifyRequest): string {
    const forwarded = req.headers['x-forwarded-host'];
    const host = (Array.isArray(forwarded) ? forwarded[0] : forwarded) ?? req.headers.host ?? '';
    return String(host).toLowerCase().replace(/:\d+$/, '');
  }
}

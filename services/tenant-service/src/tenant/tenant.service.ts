import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TenantStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateTenantDto } from './dto/update-tenant.dto';

type TenantWithConfig = Prisma.TenantGetPayload<{
  include: {
    domains: true;
    branding: true;
  };
}>;

const DEFAULT_FEATURES = {
  aiTutor: true,
  wallet: true,
  certificates: true,
  gamification: true,
  liveClasses: false,
};

const DEFAULT_NAVIGATION = [
  {
    id: 'courses',
    label: 'Courses',
    labelMn: 'Хичээлүүд',
    href: '/courses',
    visible: true,
    order: 1,
  },
];

const DEFAULT_HOMEPAGE_SECTIONS = [
  { id: 'hero', type: 'hero', enabled: true, order: 1, config: {} },
];

const DEFAULT_FOOTER = {
  socialLinks: [],
  policyLinks: [],
};

@Injectable()
export class TenantService {
  constructor(private readonly prisma: PrismaService) {}

  async getConfigBySlug(slug: string) {
    const tenant = await this.findActiveTenant({ slug });
    return this.serializeConfig(tenant);
  }

  async getConfigByDomain(domain: string) {
    const normalized = this.normalizeDomain(domain);
    const domainRecord = await this.prisma.tenantDomain.findUnique({
      where: { domain: normalized },
      include: { tenant: { include: { domains: true, branding: true } } },
    });

    if (!domainRecord || domainRecord.tenant.status !== TenantStatus.ACTIVE) {
      throw new NotFoundException('Tenant not found');
    }

    return this.serializeConfig(domainRecord.tenant);
  }

  async getById(tenantId: string) {
    const tenant = await this.findActiveTenant({ id: tenantId });
    return this.serializeConfig(tenant);
  }

  async getMemberships(userId: string) {
    return this.prisma.tenantMembership.findMany({
      where: { userId, isActive: true, tenant: { status: TenantStatus.ACTIVE } },
      include: { tenant: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateTenant(tenantId: string, dto: UpdateTenantDto) {
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        name: dto.name,
        nameMn: dto.nameMn,
        tagline: dto.tagline,
        taglineMn: dto.taglineMn,
        locale: dto.locale,
      },
    });

    if (dto.branding || dto.seo || dto.footer) {
      const current = await this.prisma.tenantBranding.findUnique({ where: { tenantId } });
      if (!current) throw new NotFoundException('Tenant branding not found');

      await this.prisma.tenantBranding.update({
        where: { tenantId },
        data: {
          ...(dto.branding ? this.mapBranding(dto.branding) : {}),
          ...(dto.seo ? this.mapSeo(dto.seo) : {}),
          ...(dto.footer ? { footer: dto.footer as Prisma.InputJsonValue } : {}),
        },
      });
    }

    return this.getById(tenantId);
  }

  async updateFeatures(tenantId: string, features: Record<string, boolean>) {
    await this.prisma.tenantBranding.update({
      where: { tenantId },
      data: { features },
    });
    const config = await this.getById(tenantId);
    return config.features;
  }

  private async findActiveTenant(where: Prisma.TenantWhereUniqueInput): Promise<TenantWithConfig> {
    const tenant = await this.prisma.tenant.findUnique({
      where,
      include: { domains: true, branding: true },
    });

    if (!tenant || tenant.status !== TenantStatus.ACTIVE) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant;
  }

  private serializeConfig(tenant: TenantWithConfig) {
    const branding = tenant.branding;
    const primaryDomain = tenant.domains.find((domain) => domain.isPrimary) ?? tenant.domains[0];

    return {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      nameMn: tenant.nameMn ?? undefined,
      tagline: tenant.tagline ?? undefined,
      taglineMn: tenant.taglineMn ?? undefined,
      domain: primaryDomain?.domain,
      subdomain: tenant.slug,
      locale: tenant.locale,
      defaultCurrency: tenant.defaultCurrency,
      platformFeePercent: tenant.platformFeePercent.toString(),
      branding: {
        logo: branding?.logo ?? undefined,
        logoDark: branding?.logoDark ?? undefined,
        favicon: branding?.favicon ?? undefined,
        primaryColor: branding?.primaryColor ?? '#6366f1',
        secondaryColor: branding?.secondaryColor ?? '#8b5cf6',
        accentColor: branding?.accentColor ?? '#06b6d4',
        fontFamily: branding?.fontFamily ?? undefined,
        darkModeEnabled: branding?.darkModeEnabled ?? false,
        buttonStyle: branding?.buttonStyle ?? 'rounded',
        cardStyle: branding?.cardStyle ?? 'shadow',
      },
      seo: {
        title: branding?.seoTitle ?? tenant.name,
        description: branding?.seoDescription ?? tenant.tagline ?? tenant.name,
        keywords: branding?.seoKeywords ?? undefined,
        ogImage: branding?.ogImage ?? undefined,
      },
      features: this.asRecord(branding?.features) ?? DEFAULT_FEATURES,
      navigation: this.asArray(branding?.navigation) ?? DEFAULT_NAVIGATION,
      homepageSections: this.asArray(branding?.homepageSections) ?? DEFAULT_HOMEPAGE_SECTIONS,
      footer: this.asRecord(branding?.footer) ?? DEFAULT_FOOTER,
    };
  }

  private normalizeDomain(domain: string): string {
    return domain.trim().toLowerCase().replace(/:\d+$/, '');
  }

  private asRecord(value: unknown): Record<string, unknown> | undefined {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return undefined;
  }

  private asArray(value: unknown): unknown[] | undefined {
    return Array.isArray(value) ? value : undefined;
  }

  private mapBranding(branding: Record<string, unknown>): Prisma.TenantBrandingUpdateInput {
    return {
      logo: this.optionalString(branding.logo),
      logoDark: this.optionalString(branding.logoDark),
      favicon: this.optionalString(branding.favicon),
      primaryColor: this.optionalString(branding.primaryColor),
      secondaryColor: this.optionalString(branding.secondaryColor),
      accentColor: this.optionalString(branding.accentColor),
      fontFamily: this.optionalString(branding.fontFamily),
      darkModeEnabled:
        typeof branding.darkModeEnabled === 'boolean' ? branding.darkModeEnabled : undefined,
      buttonStyle: this.optionalString(branding.buttonStyle),
      cardStyle: this.optionalString(branding.cardStyle),
    };
  }

  private mapSeo(seo: Record<string, unknown>): Prisma.TenantBrandingUpdateInput {
    return {
      seoTitle: this.optionalString(seo.title),
      seoDescription: this.optionalString(seo.description),
      seoKeywords: this.optionalString(seo.keywords),
      ogImage: this.optionalString(seo.ogImage),
    };
  }

  private optionalString(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
  }
}

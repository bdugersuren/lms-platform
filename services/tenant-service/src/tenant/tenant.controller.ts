import {
  Body,
  Controller,
  Get,
  Headers,
  Patch,
  Query,
  UnauthorizedException,
  UseGuards,
  Param,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtPayload } from '@lms/shared-types';
import { ApiResponseBuilder } from '@lms/shared-utils';
import { CurrentUser, JwtAuthGuard } from '@lms/shared-auth';
import { TenantService } from './tenant.service';
import { UpdateTenantDto, UpdateTenantFeaturesDto } from './dto/update-tenant.dto';

@ApiTags('Tenants')
@Controller('tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Get('by-domain')
  @ApiOperation({ summary: 'Resolve tenant config by custom domain' })
  @ApiQuery({ name: 'domain', required: true })
  async byDomain(@Query('domain') domain: string) {
    const config = await this.tenantService.getConfigByDomain(domain);
    return config;
  }

  @Get(':slug/config')
  @ApiOperation({ summary: 'Resolve tenant config by slug/subdomain' })
  async bySlug(@Param('slug') slug: string) {
    const config = await this.tenantService.getConfigBySlug(slug);
    return config;
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get the active tenant from x-tenant-id' })
  async me(@Headers('x-tenant-id') tenantId: string, @CurrentUser() user: JwtPayload) {
    this.requireTenant(tenantId);
    const [config, memberships] = await Promise.all([
      this.tenantService.getById(tenantId),
      this.tenantService.getMemberships(user.sub),
    ]);
    return ApiResponseBuilder.success({ ...config, memberships }, 'Tenant retrieved');
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update active tenant settings' })
  async updateMe(@Headers('x-tenant-id') tenantId: string, @Body() dto: UpdateTenantDto) {
    this.requireTenant(tenantId);
    const config = await this.tenantService.updateTenant(tenantId, dto);
    return ApiResponseBuilder.success(config, 'Tenant updated');
  }

  @Patch('me/features')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update active tenant feature flags' })
  async updateFeatures(
    @Headers('x-tenant-id') tenantId: string,
    @Body() dto: UpdateTenantFeaturesDto,
  ) {
    this.requireTenant(tenantId);
    const features = await this.tenantService.updateFeatures(tenantId, dto.features);
    return ApiResponseBuilder.success(features, 'Tenant features updated');
  }

  private requireTenant(tenantId?: string): void {
    if (!tenantId) throw new UnauthorizedException('Tenant context is required');
  }
}

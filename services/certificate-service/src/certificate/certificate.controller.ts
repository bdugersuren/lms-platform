import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtPayload, UserRole } from '@lms/shared-types';
import { ApiResponseBuilder } from '@lms/shared-utils';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '@lms/shared-auth';
import { CertificateService } from './certificate.service';
import { CreateCertificateDto } from './dto/create-certificate.dto';
import { QueryCertificateDto } from './dto/query-certificate.dto';

@ApiTags('Certificates')
@Controller('certificates')
export class CertificateController {
  constructor(private readonly service: CertificateService) {}

  // ── Public verification (no auth) ─────────────────────────────────────────

  @Get('verify/:code')
  @ApiOperation({ summary: 'Publicly verify a certificate by QR code' })
  async verify(@Param('code') code: string) {
    const data = await this.service.verifyByCode(code);
    return ApiResponseBuilder.success(
      data,
      data.valid ? 'Certificate is valid' : 'Certificate is revoked',
    );
  }

  // ── Protected routes ──────────────────────────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.INSTRUCTOR)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Issue a new certificate (admin/instructor)' })
  async issue(@Body() dto: CreateCertificateDto, @Headers('x-tenant-id') tenantId = 'demo') {
    const data = await this.service.issue(dto, tenantId);
    return ApiResponseBuilder.success(data, 'Certificate issued successfully');
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: "List the current user's certificates" })
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: QueryCertificateDto,
    @Headers('x-tenant-id') tenantId = 'demo',
  ) {
    const data = await this.service.findAll(user.sub, query, tenantId);
    return ApiResponseBuilder.success(data);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get a certificate by ID' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Headers('x-tenant-id') tenantId = 'demo',
  ) {
    const isAdmin = [UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(user.role as UserRole);
    const data = await this.service.findOne(id, user.sub, isAdmin, tenantId);
    return ApiResponseBuilder.success(data);
  }

  @Patch(':id/confirm')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Сурагч өөрийн PENDING гэрчилгээг баталгаажуулна → ISSUED болно' })
  async confirm(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Headers('x-tenant-id') tenantId = 'demo',
  ) {
    const data = await this.service.confirm(id, user.sub, tenantId);
    return ApiResponseBuilder.success(data, 'Гэрчилгээ амжилттай баталгаажлаа');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Revoke a certificate (admin only)' })
  async revoke(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-tenant-id') tenantId = 'demo',
  ): Promise<void> {
    await this.service.revoke(id, tenantId);
  }
}

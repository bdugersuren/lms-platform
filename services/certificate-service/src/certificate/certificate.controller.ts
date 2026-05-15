import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, ParseUUIDPipe, Post, Query, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtPayload, UserRole } from '@lms/shared-types';
import { ApiResponseBuilder } from '@lms/shared-utils';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
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
    return ApiResponseBuilder.success(data, data.valid ? 'Certificate is valid' : 'Certificate is revoked');
  }

  // ── Protected routes ──────────────────────────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Issue a new certificate (admin/instructor)' })
  async issue(@Body() dto: CreateCertificateDto, @CurrentUser() user: JwtPayload) {
    const allowedRoles: string[] = [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.INSTRUCTOR];
    if (!allowedRoles.includes(user.role)) {
      return ApiResponseBuilder.success(null, 'Forbidden');
    }
    const data = await this.service.issue(dto);
    return ApiResponseBuilder.success(data, 'Certificate issued successfully');
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: "List the current user's certificates" })
  async findAll(@CurrentUser() user: JwtPayload, @Query() query: QueryCertificateDto) {
    const data = await this.service.findAll(user.sub, query);
    return ApiResponseBuilder.success(data);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get a certificate by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    const isAdmin = [UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(user.role as UserRole);
    const data = await this.service.findOne(id, user.sub, isAdmin);
    return ApiResponseBuilder.success(data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Revoke a certificate (admin only)' })
  async revoke(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload): Promise<void> {
    const allowedRoles: string[] = [UserRole.ADMIN, UserRole.SUPER_ADMIN];
    if (!allowedRoles.includes(user.role)) return;
    await this.service.revoke(id);
  }
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateTenantDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  nameMn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
  tagline?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(240)
  taglineMn?: string;

  @ApiPropertyOptional({ enum: ['mn', 'en', 'both'] })
  @IsOptional()
  @IsIn(['mn', 'en', 'both'])
  locale?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  branding?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  seo?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  footer?: Record<string, unknown>;
}

export class UpdateTenantFeaturesDto {
  @ApiPropertyOptional()
  @IsObject()
  features!: Record<string, boolean>;
}

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiResponseBuilder } from '@lms/shared-utils';
import { JwtPayload, UserRole } from '@lms/shared-types';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '@lms/shared-auth';
import { RubricService, CreateRubricDto } from './rubric.service';

@ApiTags('Essay Rubrics')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('ai/rubrics')
export class RubricController {
  constructor(private readonly rubrics: RubricService) {}

  @Post()
  @ApiOperation({ summary: 'Create a custom essay rubric' })
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateRubricDto) {
    const data = await this.rubrics.create(user.sub, dto);
    return ApiResponseBuilder.success(data, 'Rubric created');
  }

  @Get()
  @ApiOperation({ summary: 'List my rubrics' })
  async findAll(@CurrentUser() user: JwtPayload) {
    const data = await this.rubrics.findAll(user.sub);
    return ApiResponseBuilder.success(data);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get rubric details' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.rubrics.findOne(id);
    return ApiResponseBuilder.success(data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a rubric' })
  async remove(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.rubrics.remove(user.sub, id);
  }
}

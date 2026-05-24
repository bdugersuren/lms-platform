import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, CurrentUser } from '@lms/shared-auth';
import { JwtPayload } from '@lms/shared-types';
import { ModuleService } from './module.service';
import { CreateModuleDto } from './dto/create-module.dto';

@ApiTags('Modules')
@Controller('courses/:courseId/modules')
export class ModuleController {
  constructor(private readonly moduleService: ModuleService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Add a module to a course' })
  create(
    @Param('courseId') courseId: string,
    @Body() dto: CreateModuleDto,
    @CurrentUser() user: JwtPayload,
    @Headers('x-tenant-id') tenantId = 'demo',
  ) {
    return this.moduleService.create(courseId, dto, user, tenantId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all modules for a course' })
  findAll(@Param('courseId') courseId: string, @Headers('x-tenant-id') tenantId = 'demo') {
    return this.moduleService.findByCourse(courseId, tenantId);
  }

  @Patch(':moduleId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update a module' })
  update(
    @Param('courseId') courseId: string,
    @Param('moduleId') moduleId: string,
    @Body() dto: Partial<CreateModuleDto>,
    @CurrentUser() user: JwtPayload,
    @Headers('x-tenant-id') tenantId = 'demo',
  ) {
    return this.moduleService.update(courseId, moduleId, dto, user, tenantId);
  }

  @Delete(':moduleId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete a module' })
  remove(
    @Param('courseId') courseId: string,
    @Param('moduleId') moduleId: string,
    @CurrentUser() user: JwtPayload,
    @Headers('x-tenant-id') tenantId = 'demo',
  ) {
    return this.moduleService.remove(courseId, moduleId, user, tenantId);
  }
}

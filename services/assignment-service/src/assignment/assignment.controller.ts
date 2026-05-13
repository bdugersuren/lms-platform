import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ApiResponseBuilder } from '@lms/shared-utils';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AssignmentService } from './assignment.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';

@ApiTags('Assignments')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('assignments')
export class AssignmentController {
  constructor(private readonly assignmentService: AssignmentService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new assignment' })
  async create(@Body() dto: CreateAssignmentDto) {
    const data = await this.assignmentService.create(dto);
    return ApiResponseBuilder.success(data, 'Assignment created');
  }

  @Get()
  @ApiOperation({ summary: 'List assignments (filter by courseId or lessonId)' })
  @ApiQuery({ name: 'courseId', required: false })
  @ApiQuery({ name: 'lessonId', required: false })
  async findAll(
    @Query('courseId') courseId?: string,
    @Query('lessonId') lessonId?: string,
  ) {
    const data = await this.assignmentService.findAll(courseId, lessonId);
    return ApiResponseBuilder.success(data);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get assignment by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.assignmentService.findOne(id);
    return ApiResponseBuilder.success(data);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update assignment' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAssignmentDto,
  ) {
    const data = await this.assignmentService.update(id, dto);
    return ApiResponseBuilder.success(data, 'Assignment updated');
  }

  @Post(':id/publish')
  @ApiOperation({ summary: 'Publish assignment' })
  async publish(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.assignmentService.publish(id);
    return ApiResponseBuilder.success(data, 'Assignment published');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete assignment' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.assignmentService.remove(id);
  }
}

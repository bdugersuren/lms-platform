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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ApiResponseBuilder } from '@lms/shared-utils';
import { JwtAuthGuard, CurrentUser } from '@lms/shared-auth';
import { QuizService } from './quiz.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';

interface JwtUser {
  sub: string;
  email: string;
  role: string;
}

@ApiTags('Quizzes')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('quizzes')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new quiz' })
  async create(@CurrentUser() user: JwtUser, @Body() dto: CreateQuizDto) {
    const data = await this.quizService.create(dto, user.sub);
    return ApiResponseBuilder.success(data, 'Quiz created');
  }

  @Get()
  @ApiOperation({ summary: 'List quizzes (filter by courseId or lessonId)' })
  @ApiQuery({ name: 'courseId', required: false })
  @ApiQuery({ name: 'lessonId', required: false })
  async findAll(
    @Query('courseId') courseId?: string,
    @Query('lessonId') lessonId?: string,
  ) {
    const data = await this.quizService.findAll(courseId, lessonId);
    return ApiResponseBuilder.success(data);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get quiz by ID (includes questions and options)' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.quizService.findOne(id);
    return ApiResponseBuilder.success(data);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update quiz' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateQuizDto,
  ) {
    const data = await this.quizService.update(id, dto);
    return ApiResponseBuilder.success(data, 'Quiz updated');
  }

  @Post(':id/publish')
  @ApiOperation({ summary: 'Publish quiz' })
  async publish(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.quizService.publish(id);
    return ApiResponseBuilder.success(data, 'Quiz published');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete quiz' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.quizService.remove(id);
  }
}

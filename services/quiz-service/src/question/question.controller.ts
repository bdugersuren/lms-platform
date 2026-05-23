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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiResponseBuilder } from '@lms/shared-utils';
import { JwtAuthGuard } from '@lms/shared-auth';
import { QuestionService } from './question.service';
import { CreateQuestionDto } from './dto/create-question.dto';

@ApiTags('Questions')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('quizzes/:quizId/questions')
export class QuestionController {
  constructor(private readonly questionService: QuestionService) {}

  @Post()
  @ApiOperation({ summary: 'Add a question to a quiz' })
  async create(
    @Param('quizId', ParseUUIDPipe) quizId: string,
    @Body() dto: CreateQuestionDto,
  ) {
    const data = await this.questionService.create(quizId, dto);
    return ApiResponseBuilder.success(data, 'Question created');
  }

  @Get()
  @ApiOperation({ summary: 'List questions of a quiz' })
  async findAll(@Param('quizId', ParseUUIDPipe) quizId: string) {
    const data = await this.questionService.findAllByQuiz(quizId);
    return ApiResponseBuilder.success(data);
  }

  @Get(':questionId')
  @ApiOperation({ summary: 'Get a question by ID' })
  async findOne(
    @Param('quizId', ParseUUIDPipe) quizId: string,
    @Param('questionId', ParseUUIDPipe) questionId: string,
  ) {
    const data = await this.questionService.findOne(quizId, questionId);
    return ApiResponseBuilder.success(data);
  }

  @Patch(':questionId')
  @ApiOperation({ summary: 'Update a question' })
  async update(
    @Param('quizId', ParseUUIDPipe) quizId: string,
    @Param('questionId', ParseUUIDPipe) questionId: string,
    @Body() dto: Partial<CreateQuestionDto>,
  ) {
    const data = await this.questionService.update(quizId, questionId, dto);
    return ApiResponseBuilder.success(data, 'Question updated');
  }

  @Delete(':questionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a question' })
  async remove(
    @Param('quizId', ParseUUIDPipe) quizId: string,
    @Param('questionId', ParseUUIDPipe) questionId: string,
  ): Promise<void> {
    await this.questionService.remove(quizId, questionId);
  }
}

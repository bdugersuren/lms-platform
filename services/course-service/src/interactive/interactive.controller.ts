import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '@lms/shared-auth';
import { JwtPayload, UserRole } from '@lms/shared-types';
import { InteractiveService } from './interactive.service';
import { CreateInteractiveBlockDto } from './dto/create-interactive-block.dto';
import { UpdateInteractiveBlockDto } from './dto/update-interactive-block.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { CreateOptionDto } from './dto/create-option.dto';

@ApiTags('Interactive Blocks')
@Controller('courses')
export class InteractiveController {
  constructor(private readonly interactiveService: InteractiveService) {}

  // ─── Blocks ───────────────────────────────────────────────────────────────

  @Post('lessons/:lessonId/blocks')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create an interactive block in a lesson' })
  createBlock(
    @Param('lessonId') lessonId: string,
    @Body() dto: CreateInteractiveBlockDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.interactiveService.createBlock(lessonId, dto, user);
  }

  @Get('lessons/:lessonId/blocks')
  @ApiOperation({ summary: 'List interactive blocks for a lesson' })
  findBlocksByLesson(@Param('lessonId') lessonId: string) {
    return this.interactiveService.findBlocksByLesson(lessonId);
  }

  @Get('blocks/:blockId')
  @ApiOperation({ summary: 'Get a single interactive block with questions and options' })
  findBlock(@Param('blockId') blockId: string) {
    return this.interactiveService.findBlock(blockId);
  }

  @Patch('blocks/:blockId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update an interactive block' })
  updateBlock(
    @Param('blockId') blockId: string,
    @Body() dto: UpdateInteractiveBlockDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.interactiveService.updateBlock(blockId, dto, user);
  }

  @Delete('blocks/:blockId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete an interactive block' })
  deleteBlock(
    @Param('blockId') blockId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.interactiveService.deleteBlock(blockId, user);
  }

  // ─── Questions ────────────────────────────────────────────────────────────

  @Post('blocks/:blockId/questions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Add a question to an interactive block' })
  createQuestion(
    @Param('blockId') blockId: string,
    @Body() dto: CreateQuestionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.interactiveService.createQuestion(blockId, dto, user);
  }

  @Patch('questions/:questionId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update a question' })
  updateQuestion(
    @Param('questionId') questionId: string,
    @Body() dto: UpdateQuestionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.interactiveService.updateQuestion(questionId, dto, user);
  }

  @Delete('questions/:questionId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete a question' })
  deleteQuestion(
    @Param('questionId') questionId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.interactiveService.deleteQuestion(questionId, user);
  }

  // ─── Options ──────────────────────────────────────────────────────────────

  @Post('questions/:questionId/options')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Add an option to a question' })
  createOption(
    @Param('questionId') questionId: string,
    @Body() dto: CreateOptionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.interactiveService.createOption(questionId, dto, user);
  }

  @Patch('options/:optionId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update an option' })
  updateOption(
    @Param('optionId') optionId: string,
    @Body() dto: Partial<CreateOptionDto>,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.interactiveService.updateOption(optionId, dto, user);
  }

  @Delete('options/:optionId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete an option' })
  deleteOption(
    @Param('optionId') optionId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.interactiveService.deleteOption(optionId, user);
  }
}

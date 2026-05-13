import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '@lms/shared-auth';
import { JwtPayload, UserRole } from '@lms/shared-types';
import { SkillService } from './skill.service';
import { CreateSkillDto } from './dto/create-skill.dto';

@ApiTags('Skills')
@Controller()
export class SkillController {
  constructor(private readonly skillService: SkillService) {}

  @Get('skills')
  @ApiOperation({ summary: 'List all skills' })
  findAll() {
    return this.skillService.findAll();
  }

  @Post('skills')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create a new skill (admin only)' })
  create(@Body() dto: CreateSkillDto) {
    return this.skillService.create(dto);
  }

  @Delete('skills/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete a skill (admin only)' })
  remove(@Param('id') id: string) {
    return this.skillService.remove(id);
  }

  @Post('courses/lessons/:lessonId/skills/:skillId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Attach a skill to a lesson' })
  attachSkill(
    @Param('lessonId') lessonId: string,
    @Param('skillId') skillId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.skillService.attachSkillToLesson(lessonId, skillId, user);
  }

  @Delete('courses/lessons/:lessonId/skills/:skillId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Detach a skill from a lesson' })
  detachSkill(
    @Param('lessonId') lessonId: string,
    @Param('skillId') skillId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.skillService.detachSkillFromLesson(lessonId, skillId, user);
  }
}

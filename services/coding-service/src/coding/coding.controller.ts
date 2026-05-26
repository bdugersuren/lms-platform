import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '@lms/shared-auth';
import { JwtPayload, UserRole } from '@lms/shared-types';
import { CodingService } from './coding.service';
import { CreateBindingDto } from './dto/create-binding.dto';
import { UpdateBindingDto } from './dto/update-binding.dto';

@ApiTags('Coding')
@ApiBearerAuth('access-token')
@Controller('coding')
export class CodingController {
  constructor(private readonly coding: CodingService) {}

  @Get('assignments/:assignmentId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get DMOJ problem info and allowed languages for an assignment' })
  async getProblemInfo(@Param('assignmentId') assignmentId: string) {
    const binding = await this.coding.getBinding(assignmentId);
    return {
      assignmentId: binding.assignmentId,
      dmojProblemCode: binding.dmojProblemCode,
      allowedLanguages: this.coding.getLanguages(binding),
      maxScore: binding.maxScore,
      passingScore: binding.passingScore,
      isActive: binding.isActive,
    };
  }

  @Get('languages')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List all supported DMOJ language codes' })
  getSupportedLanguages() {
    return {
      languages: ['CPP17', 'CPP14', 'CPP11', 'PY3', 'PY2', 'JAVA', 'RUBY', 'CS'],
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user DMOJ account link status' })
  async getMyDmojStatus(@CurrentUser() user: JwtPayload) {
    const link = await this.coding.getDmojUserLink(user.sub, user.activeTenantId ?? 'demo');
    return { linked: !!link, dmojUsername: link?.dmojUsername ?? null, status: link?.status ?? 'NOT_LINKED' };
  }

  @Post('assignments/:assignmentId/binding')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiOperation({ summary: '[Instructor] Bind assignment to DMOJ problem' })
  async createBinding(
    @Param('assignmentId') assignmentId: string,
    @Body() dto: CreateBindingDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.coding.createBinding(assignmentId, dto, user.activeTenantId ?? 'demo');
  }

  @Patch('assignments/:assignmentId/binding')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.INSTRUCTOR, UserRole.ADMIN)
  @ApiOperation({ summary: '[Instructor] Update DMOJ problem binding' })
  async updateBinding(
    @Param('assignmentId') assignmentId: string,
    @Body() dto: UpdateBindingDto,
  ) {
    return this.coding.updateBinding(assignmentId, dto);
  }
}

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ApiResponseBuilder } from '@lms/shared-utils';
import { JwtPayload } from '@lms/shared-types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserService } from './user.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get own full profile' })
  @ApiResponse({ status: 200, description: 'Profile returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Profile not yet created' })
  async getMe(@CurrentUser() user: JwtPayload) {
    const profile = await this.userService.findMe(user.sub);
    return ApiResponseBuilder.success(profile, 'Profile retrieved');
  }

  @Patch('me')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update own profile' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async updateMe(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateProfileDto,
  ) {
    const profile = await this.userService.updateMe(user.sub, dto);
    return ApiResponseBuilder.success(profile, 'Profile updated');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get public profile by user ID' })
  @ApiParam({ name: 'id', description: 'User UUID (same as auth-service user ID)' })
  @ApiResponse({ status: 200, description: 'Public profile returned' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  async getPublic(@Param('id', ParseUUIDPipe) id: string) {
    const profile = await this.userService.findPublic(id);
    return ApiResponseBuilder.success(profile, 'Profile retrieved');
  }
}

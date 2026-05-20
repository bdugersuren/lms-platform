import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { IAuthTokens, JwtPayload, JwtRefreshPayload, UserRole } from '@lms/shared-types';
import { ApiResponseBuilder } from '@lms/shared-utils';
import { JwtAuthGuard, RolesGuard, CurrentUser, Roles } from '@lms/shared-auth';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiTags('Auth')
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiBody({
    type: RegisterDto,
    examples: {
      student: {
        summary: 'Register a student account',
        value: {
          email: 'student1@know.mn',
          password: 'Student!1234',
          role: 'STUDENT',
        },
      },
      instructor: {
        summary: 'Register an instructor account',
        value: {
          email: 'instructor1@know.mn',
          password: 'Admin!1234',
          role: 'INSTRUCTOR',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async register(@Body() dto: RegisterDto) {
    const tokens = await this.authService.register(dto);
    return ApiResponseBuilder.created(tokens, 'Registration successful');
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiTags('Auth')
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({
    type: LoginDto,
    examples: {
      student: {
        summary: 'Student login',
        value: { email: 'student1@know.mn', password: 'Student!1234' },
      },
      admin: {
        summary: 'Admin login',
        value: { email: 'admin@know.mn', password: 'Admin!1234' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto) {
    const tokens = await this.authService.login(dto);
    return ApiResponseBuilder.success(tokens, 'Login successful');
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt-refresh'))
  @ApiTags('Auth')
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiBody({
    type: RefreshTokenDto,
    examples: {
      refresh: {
        summary: 'Refresh token request',
        value: { refreshToken: 'paste-refresh-token-from-login-response' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Tokens refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request & { user: JwtRefreshPayload },
  ) {
    const tokens = await this.authService.refreshTokens(dto.refreshToken, req.user);
    return ApiResponseBuilder.success(tokens, 'Token refreshed successfully');
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiTags('Auth')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Logout current session (revokes current access token)' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(@Req() req: Request & { user: JwtPayload }) {
    const accessToken = (req.headers.authorization ?? '').replace('Bearer ', '');
    await this.authService.logout(req.user.sub, req.user.jti, accessToken);
    return ApiResponseBuilder.success(null, 'Logged out successfully');
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiTags('Auth')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Logout from all sessions (revokes all tokens)' })
  @ApiResponse({ status: 200, description: 'Logged out from all sessions' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logoutAll(@CurrentUser() user: JwtPayload) {
    await this.authService.logoutAll(user.sub);
    return ApiResponseBuilder.success(null, 'Logged out from all sessions');
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiTags('Auth')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiResponse({ status: 200, description: 'User profile returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMe(@CurrentUser() user: JwtPayload) {
    const profile = await this.authService.getMe(user);
    return ApiResponseBuilder.success(profile, 'Profile retrieved');
  }

  @Patch('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiTags('Auth')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Change password (revokes all sessions after change)' })
  @ApiBody({
    type: ChangePasswordDto,
    examples: {
      changePassword: {
        summary: 'Change current user password',
        value: {
          currentPassword: 'Student!1234',
          newPassword: 'NewStudent!1234',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized or wrong current password' })
  async changePassword(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(user.sub, dto);
    return ApiResponseBuilder.success(null, 'Password changed successfully');
  }

  // ─── Admin endpoints ─────────────────────────────────────────────────────────

  @Get('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiTags('Users')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '[Admin] List all users with pagination' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'role', required: false, enum: UserRole })
  @ApiResponse({ status: 200, description: 'Users listed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async listUsers(@Query() query: UserQueryDto) {
    const result = await this.authService.listUsers(query);
    return ApiResponseBuilder.success(result, 'Users retrieved');
  }

  @Patch('users/:id/status')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiTags('Users')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '[Admin] Activate or deactivate a user account' })
  @ApiParam({ name: 'id', description: 'Target user UUID' })
  @ApiBody({
    type: UpdateUserStatusDto,
    examples: {
      deactivate: {
        summary: 'Deactivate user',
        value: { isActive: false },
      },
      activate: {
        summary: 'Activate user',
        value: { isActive: true },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'User status updated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async updateUserStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    await this.authService.updateUserStatus(id, dto.isActive);
    return ApiResponseBuilder.success(
      null,
      dto.isActive ? 'User activated' : 'User deactivated',
    );
  }
}

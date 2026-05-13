import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  IAuthTokens,
  JwtPayload,
  JwtRefreshPayload,
  UserRole,
  AuthEventPatterns,
} from '@lms/shared-types';
import { buildPaginationMeta } from '@lms/shared-utils';
import { hashPassword, comparePassword } from '@lms/shared-utils';
import { PrismaService } from '../prisma/prisma.service';
import { MessagingService } from '../messaging/messaging.service';
import { TokenService } from './token.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UserQueryDto } from './dto/user-query.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    private readonly messaging: MessagingService,
  ) {}

  // ─── Registration ────────────────────────────────────────────────────────────

  async register(dto: RegisterDto): Promise<IAuthTokens> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    const passwordHash = await hashPassword(dto.password);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        role: dto.role ?? UserRole.STUDENT,
      },
    });

    this.logger.log(`User registered: ${user.id}`);

    this.messaging.publishEvent(AuthEventPatterns.USER_REGISTERED, {
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return this.tokenService.generateTokenPair(user.id, user.email, user.role as UserRole);
  }

  // ─── Login ───────────────────────────────────────────────────────────────────

  async login(dto: LoginDto): Promise<IAuthTokens> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await comparePassword(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    this.logger.log(`User logged in: ${user.id}`);

    this.messaging.publishEvent(AuthEventPatterns.USER_LOGGED_IN, {
      userId: user.id,
      email: user.email,
    });

    return this.tokenService.generateTokenPair(user.id, user.email, user.role as UserRole);
  }

  // ─── Token refresh ────────────────────────────────────────────────────────────

  async refreshTokens(
    oldRefreshToken: string,
    payload: JwtRefreshPayload,
  ): Promise<IAuthTokens> {
    return this.tokenService.rotateRefreshToken(oldRefreshToken, payload);
  }

  // ─── Logout (current session) ─────────────────────────────────────────────────

  async logout(userId: string, jti: string | undefined, accessToken: string): Promise<void> {
    await Promise.all([
      jti ? this.tokenService.revokeAccessToken(jti, accessToken) : Promise.resolve(),
      this.prisma.refreshToken.deleteMany({ where: { userId } }),
    ]);

    this.messaging.publishEvent(AuthEventPatterns.USER_LOGGED_OUT, { userId });
    this.logger.log(`User logged out: ${userId}`);
  }

  // ─── Logout all sessions ──────────────────────────────────────────────────────

  async logoutAll(userId: string): Promise<void> {
    await this.tokenService.revokeAllUserTokens(userId);
    this.messaging.publishEvent(AuthEventPatterns.USER_LOGGED_OUT, { userId });
    this.logger.log(`User logged out from all sessions: ${userId}`);
  }

  // ─── Change password ──────────────────────────────────────────────────────────

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found');
    }

    const isValid = await comparePassword(dto.currentPassword, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const newHash = await hashPassword(dto.newPassword);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash, updatedAt: new Date() },
    });

    // Revoke all sessions — force re-login with new password
    await this.tokenService.revokeAllUserTokens(userId);

    this.logger.log(`Password changed for user: ${userId}`);
  }

  // ─── Get current user profile ─────────────────────────────────────────────────

  async getMe(payload: JwtPayload): Promise<{
    id: string;
    email: string;
    role: string;
    isActive: boolean;
    mfaEnabled: boolean;
    createdAt: Date;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        mfaEnabled: true,
        createdAt: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or deactivated');
    }

    return user;
  }

  // ─── Admin: list users ────────────────────────────────────────────────────────

  async listUsers(query: UserQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const where = query.role ? { role: query.role } : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
          mfaEnabled: true,
          createdAt: true,
          updatedAt: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: users,
      meta: buildPaginationMeta({ page, limit }, total),
    };
  }

  // ─── Admin: update user status ────────────────────────────────────────────────

  async updateUserStatus(targetUserId: string, isActive: boolean): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: targetUserId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.update({
      where: { id: targetUserId },
      data: { isActive, updatedAt: new Date() },
    });

    if (!isActive) {
      await this.tokenService.revokeAllUserTokens(targetUserId);
      this.logger.log(`User deactivated and sessions revoked: ${targetUserId}`);
    }
  }
}

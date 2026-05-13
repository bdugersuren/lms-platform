import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { IAuthTokens, JwtPayload, JwtRefreshPayload, UserRole } from '@lms/shared-types';
import { comparePassword, hashPassword } from '@lms/shared-utils';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async generateTokenPair(
    userId: string,
    email: string,
    role: UserRole,
  ): Promise<IAuthTokens> {
    const jti = uuidv4();
    const tokenId = uuidv4();

    const accessPayload: JwtPayload = { sub: userId, email, role, jti };
    const refreshPayload: JwtRefreshPayload = { sub: userId, tokenId };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(accessPayload, {
        secret: this.config.get<string>('jwt.secret'),
        expiresIn: this.config.get<string>('jwt.expiresIn', '15m'),
      }),
      this.jwt.signAsync(refreshPayload, {
        secret: this.config.get<string>('jwt.refreshSecret'),
        expiresIn: this.config.get<string>('jwt.refreshExpiresIn', '7d'),
      }),
    ]);

    const tokenHash = await hashPassword(refreshToken);
    const expiresAt = this.computeRefreshExpiry();

    await this.prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    });

    const expiresIn = this.parseExpiresIn(
      this.config.get<string>('jwt.expiresIn', '15m'),
    );

    return { accessToken, refreshToken, expiresIn, tokenType: 'Bearer' };
  }

  async rotateRefreshToken(
    oldRefreshToken: string,
    payload: JwtRefreshPayload,
  ): Promise<IAuthTokens> {
    const stored = await this.prisma.refreshToken.findMany({
      where: {
        userId: payload.sub,
        expiresAt: { gt: new Date() },
      },
    });

    let matchedRecord: { id: string } | null = null;
    for (const record of stored) {
      const matches = await comparePassword(oldRefreshToken, record.tokenHash);
      if (matches) {
        matchedRecord = record;
        break;
      }
    }

    if (!matchedRecord) {
      await this.prisma.refreshToken.deleteMany({ where: { userId: payload.sub } });
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.prisma.refreshToken.delete({ where: { id: matchedRecord.id } });

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User account is disabled');
    }

    return this.generateTokenPair(user.id, user.email, user.role as UserRole);
  }

  async revokeAccessToken(jti: string, accessToken: string): Promise<void> {
    try {
      const decoded = this.jwt.decode(accessToken) as { exp?: number; jti?: string } | null;
      const effectiveJti = decoded?.jti ?? jti;
      if (decoded?.exp && effectiveJti) {
        const remainingTtl = decoded.exp - Math.floor(Date.now() / 1000);
        if (remainingTtl > 0) {
          const key = this.redis.buildBlacklistKey(effectiveJti);
          await this.redis.set(key, '1', remainingTtl);
        }
      }
    } catch (err) {
      this.logger.warn(`Failed to blacklist access token jti=${jti}`, err);
    }
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
    const jwtTtl = this.parseExpiresIn(
      this.config.get<string>('jwt.expiresIn', '15m'),
    );
    const key = this.redis.buildUserBlacklistKey(userId);
    // Store the revocation timestamp so only tokens issued BEFORE this time are rejected.
    // Tokens issued after (e.g. after a new login) will have iat > this value and are accepted.
    await this.redis.set(key, String(Math.floor(Date.now() / 1000)), jwtTtl);
  }

  private computeRefreshExpiry(): Date {
    const raw = this.config.get<string>('jwt.refreshExpiresIn', '7d');
    const seconds = this.parseExpiresIn(raw);
    return new Date(Date.now() + seconds * 1000);
  }

  parseExpiresIn(raw: string): number {
    const match = /^(\d+)([smhd])$/.exec(raw);
    if (!match) return 900;
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    return value * (multipliers[unit] ?? 1);
  }
}

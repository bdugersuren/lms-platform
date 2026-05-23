import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { IAuthTokens, JwtPayload, JwtRefreshPayload, UserRole } from '@lms/shared-types';
import { comparePassword, hashPassword } from '@lms/shared-utils';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

export interface SessionMeta {
  ipAddress?: string;
  userAgent?: string;
}

export interface SessionView {
  id: string;
  deviceName: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  lastUsedAt: Date | null;
  createdAt: Date;
}

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
    meta?: SessionMeta,
  ): Promise<IAuthTokens> {
    const jti = uuidv4();
    const tokenId = uuidv4();

    const accessPayload: JwtPayload = { sub: userId, email, role, jti };
    const refreshPayload: JwtRefreshPayload = { sub: userId, tokenId };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(accessPayload, {
        secret: this.config.getOrThrow<string>('jwt.secret'),
        expiresIn: this.config.get<string>('jwt.expiresIn', '15m'),
      }),
      this.jwt.signAsync(refreshPayload, {
        secret: this.config.getOrThrow<string>('jwt.refreshSecret'),
        expiresIn: this.config.get<string>('jwt.refreshExpiresIn', '7d'),
      }),
    ]);

    const tokenHash = await hashPassword(refreshToken);
    const expiresAt = this.computeRefreshExpiry();

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenId,
        tokenHash,
        expiresAt,
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
        deviceName: meta ? this.parseDeviceName(meta.userAgent) : null,
      },
    });

    const expiresIn = this.parseExpiresIn(
      this.config.get<string>('jwt.expiresIn', '15m'),
    );

    return { accessToken, refreshToken, expiresIn, tokenType: 'Bearer' };
  }

  async rotateRefreshToken(
    oldRefreshToken: string,
    payload: JwtRefreshPayload,
    meta?: SessionMeta,
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

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User account is disabled');
    }

    // Issue new tokens
    const jti = uuidv4();
    const newTokenId = uuidv4();
    const accessPayload: JwtPayload = { sub: user.id, email: user.email, role: user.role as UserRole, jti };
    const refreshPayload: JwtRefreshPayload = { sub: user.id, tokenId: newTokenId };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(accessPayload, {
        secret: this.config.getOrThrow<string>('jwt.secret'),
        expiresIn: this.config.get<string>('jwt.expiresIn', '15m'),
      }),
      this.jwt.signAsync(refreshPayload, {
        secret: this.config.getOrThrow<string>('jwt.refreshSecret'),
        expiresIn: this.config.get<string>('jwt.refreshExpiresIn', '7d'),
      }),
    ]);

    const newTokenHash = await hashPassword(refreshToken);
    const expiresAt = this.computeRefreshExpiry();

    // Update the existing session record — keeps session id stable, updates lastUsedAt
    await this.prisma.refreshToken.update({
      where: { id: matchedRecord.id },
      data: {
        tokenId: newTokenId,
        tokenHash: newTokenHash,
        expiresAt,
        lastUsedAt: new Date(),
        ...(meta?.ipAddress && { ipAddress: meta.ipAddress }),
        ...(meta?.userAgent && {
          userAgent: meta.userAgent,
          deviceName: this.parseDeviceName(meta.userAgent),
        }),
      },
    });

    const expiresIn = this.parseExpiresIn(
      this.config.get<string>('jwt.expiresIn', '15m'),
    );

    return { accessToken, refreshToken, expiresIn, tokenType: 'Bearer' };
  }

  async listSessions(userId: string): Promise<SessionView[]> {
    return this.prisma.refreshToken.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      select: {
        id: true,
        deviceName: true,
        ipAddress: true,
        userAgent: true,
        lastUsedAt: true,
        createdAt: true,
      },
      orderBy: { lastUsedAt: { sort: 'desc', nulls: 'last' } },
    });
  }

  async revokeSession(sessionId: string, userId: string): Promise<boolean> {
    const result = await this.prisma.refreshToken.deleteMany({
      where: { id: sessionId, userId },
    });
    return result.count > 0;
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
    await this.redis.set(key, String(Math.floor(Date.now() / 1000)), jwtTtl);
  }

  private parseDeviceName(userAgent?: string): string | null {
    if (!userAgent) return null;
    if (/postman/i.test(userAgent)) return 'Postman';
    if (/insomnia/i.test(userAgent)) return 'Insomnia';
    if (/iPhone/i.test(userAgent)) return 'iPhone';
    if (/iPad/i.test(userAgent)) return 'iPad';
    if (/Android/i.test(userAgent)) return 'Android';
    const os = /Windows NT/i.test(userAgent) ? 'Windows'
      : /Mac OS X/i.test(userAgent) ? 'Mac'
      : /Linux/i.test(userAgent) ? 'Linux'
      : null;
    const browser = /Edg\//i.test(userAgent) ? 'Edge'
      : /Chrome\//i.test(userAgent) ? 'Chrome'
      : /Firefox\//i.test(userAgent) ? 'Firefox'
      : /Safari\//i.test(userAgent) ? 'Safari'
      : null;
    if (browser && os) return `${browser} on ${os}`;
    return browser ?? os ?? 'Unknown device';
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

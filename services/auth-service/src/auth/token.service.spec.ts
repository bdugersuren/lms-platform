import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TokenService } from './token.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

jest.mock('@lms/shared-utils', () => ({
  hashPassword: jest.fn().mockResolvedValue('$hashed$'),
  comparePassword: jest.fn(),
}));
import { comparePassword } from '@lms/shared-utils';
const mockCompare = comparePassword as jest.MockedFunction<typeof comparePassword>;

describe('TokenService', () => {
  let service: TokenService;

  const mockJwt = {
    signAsync: jest.fn().mockResolvedValue('signed-token'),
    decode: jest.fn(),
  };

  const mockConfig = {
    getOrThrow: jest.fn().mockReturnValue('secret'),
    get: jest.fn().mockImplementation((key: string, def?: string) => {
      const map: Record<string, string> = {
        'jwt.secret': 'test-secret',
        'jwt.refreshSecret': 'test-refresh-secret',
        'jwt.expiresIn': '15m',
        'jwt.refreshExpiresIn': '7d',
      };
      return map[key] ?? def;
    }),
  };

  const mockPrisma = {
    refreshToken: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  const mockRedis = {
    buildBlacklistKey: jest.fn().mockReturnValue('jti:some-jti'),
    buildUserBlacklistKey: jest.fn().mockReturnValue('user:user-1:blacklist'),
    set: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<TokenService>(TokenService);
    jest.clearAllMocks();
    mockJwt.signAsync.mockResolvedValue('signed-token');
    mockConfig.get.mockImplementation((key: string, def?: string) => {
      const map: Record<string, string> = {
        'jwt.secret': 'test-secret',
        'jwt.refreshSecret': 'test-refresh-secret',
        'jwt.expiresIn': '15m',
        'jwt.refreshExpiresIn': '7d',
      };
      return map[key] ?? def;
    });
    mockConfig.getOrThrow.mockReturnValue('test-secret');
    mockRedis.buildBlacklistKey.mockReturnValue('jti:some-jti');
    mockRedis.buildUserBlacklistKey.mockReturnValue('user:user-1:blacklist');
    mockRedis.set.mockResolvedValue(undefined);
  });

  // ── parseExpiresIn ────────────────────────────────────────────────────────────

  describe('parseExpiresIn()', () => {
    it.each([
      ['15m', 900],
      ['7d', 604800],
      ['1h', 3600],
      ['30s', 30],
      ['1d', 86400],
    ])('parses "%s" → %d seconds', (input, expected) => {
      expect(service.parseExpiresIn(input)).toBe(expected);
    });

    it('returns 900 for unrecognised format', () => {
      expect(service.parseExpiresIn('invalid')).toBe(900);
    });
  });

  // ── generateTokenPair ─────────────────────────────────────────────────────────

  describe('generateTokenPair()', () => {
    it('creates two JWT tokens and persists refresh token record', async () => {
      mockPrisma.refreshToken.create.mockResolvedValue({ id: 'rt-1' });

      const result = await service.generateTokenPair('user-1', 'test@example.com', 'STUDENT' as any, undefined, 'demo');

      expect(mockJwt.signAsync).toHaveBeenCalledTimes(2);
      expect(mockPrisma.refreshToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            tokenHash: '$hashed$',
          }),
        }),
      );
      expect(result.tokenType).toBe('Bearer');
      expect(result.expiresIn).toBe(900); // 15m
    });

    it('parses device name from userAgent', async () => {
      mockPrisma.refreshToken.create.mockResolvedValue({ id: 'rt-1' });

      await service.generateTokenPair(
        'user-1',
        'test@example.com',
        'STUDENT' as any,
        { userAgent: 'PostmanRuntime/7.32.0', ipAddress: '127.0.0.1' },
      );

      expect(mockPrisma.refreshToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ deviceName: 'Postman', ipAddress: '127.0.0.1' }),
        }),
      );
    });

    it('sets deviceName=null when no userAgent provided', async () => {
      mockPrisma.refreshToken.create.mockResolvedValue({ id: 'rt-1' });

      await service.generateTokenPair('user-1', 'test@example.com', 'STUDENT' as any);

      expect(mockPrisma.refreshToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ deviceName: null }),
        }),
      );
    });
  });

  // ── rotateRefreshToken ────────────────────────────────────────────────────────

  describe('rotateRefreshToken()', () => {
    it('throws UnauthorizedException and purges tokens when no match found', async () => {
      mockPrisma.refreshToken.findMany.mockResolvedValue([
        { id: 'rt-1', userId: 'user-1', tokenHash: '$other-hash$', expiresAt: new Date(Date.now() + 86400000) },
      ]);
      mockCompare.mockResolvedValue(false);
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

      await expect(
        service.rotateRefreshToken('invalid-token', { sub: 'user-1', tokenId: 'tid-1' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });

    it('returns new tokens when refresh token matches', async () => {
      mockPrisma.refreshToken.findMany.mockResolvedValue([
        { id: 'rt-1', userId: 'user-1', tokenHash: '$hashed$', expiresAt: new Date(Date.now() + 86400000) },
      ]);
      mockCompare.mockResolvedValue(true);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1', tenantId: 'demo', email: 'test@example.com', role: 'STUDENT', isActive: true,
      });
      mockJwt.signAsync.mockResolvedValue('new-signed-token');
      mockPrisma.refreshToken.update.mockResolvedValue({ id: 'rt-1' });

      const result = await service.rotateRefreshToken('valid-token', { sub: 'user-1', tokenId: 'tid-1' });

      expect(mockPrisma.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'rt-1' } }),
      );
      expect(result.accessToken).toBe('new-signed-token');
    });

    it('throws UnauthorizedException for inactive user', async () => {
      mockPrisma.refreshToken.findMany.mockResolvedValue([
        { id: 'rt-1', userId: 'user-1', tokenHash: '$hashed$', expiresAt: new Date(Date.now() + 86400000) },
      ]);
      mockCompare.mockResolvedValue(true);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1', email: 'test@example.com', isActive: false,
      });

      await expect(
        service.rotateRefreshToken('valid-token', { sub: 'user-1', tokenId: 'tid-1' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── revokeAccessToken ─────────────────────────────────────────────────────────

  describe('revokeAccessToken()', () => {
    it('stores jti in Redis with remaining TTL', async () => {
      const futureExp = Math.floor(Date.now() / 1000) + 500;
      mockJwt.decode.mockReturnValue({ jti: 'some-jti', exp: futureExp });

      await service.revokeAccessToken('some-jti', 'raw-access-token');

      expect(mockRedis.set).toHaveBeenCalledWith('jti:some-jti', '1', expect.any(Number));
      const ttlArg = (mockRedis.set as jest.Mock).mock.calls[0][2] as number;
      expect(ttlArg).toBeGreaterThan(0);
      expect(ttlArg).toBeLessThanOrEqual(500);
    });

    it('does not call Redis when token is already expired', async () => {
      const pastExp = Math.floor(Date.now() / 1000) - 100;
      mockJwt.decode.mockReturnValue({ jti: 'some-jti', exp: pastExp });

      await service.revokeAccessToken('some-jti', 'raw-token');

      expect(mockRedis.set).not.toHaveBeenCalled();
    });
  });

  // ── revokeAllUserTokens ───────────────────────────────────────────────────────

  describe('revokeAllUserTokens()', () => {
    it('deletes all refresh tokens and sets user-level Redis blacklist', async () => {
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 3 });

      await service.revokeAllUserTokens('user-1');

      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
      expect(mockRedis.set).toHaveBeenCalledWith(
        'user:user-1:blacklist',
        expect.any(String),
        900, // 15m in seconds
      );
    });
  });
});

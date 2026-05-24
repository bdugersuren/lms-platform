import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@lms/shared-types';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { MessagingService } from '../messaging/messaging.service';
import { TokenService } from './token.service';

// ── Helpers ───────────────────────────────────────────────────────────────────

// Mock bcrypt comparison so tests don't need to hash real passwords
jest.mock('@lms/shared-utils', () => ({
  hashPassword: jest.fn().mockResolvedValue('$hashed$'),
  comparePassword: jest.fn(),
  buildPaginationMeta: jest.fn().mockReturnValue({ page: 1, limit: 20, total: 0, totalPages: 0 }),
}));

import { comparePassword } from '@lms/shared-utils';
const mockCompare = comparePassword as jest.MockedFunction<typeof comparePassword>;

const mockTokens = { accessToken: 'access', refreshToken: 'refresh', expiresIn: 900, tokenType: 'Bearer' };

const makeUser = (overrides: Record<string, unknown> = {}) => ({
  id: 'user-1',
  tenantId: 'demo',
  email: 'test@example.com',
  passwordHash: '$hashed$',
  role: UserRole.STUDENT,
  isActive: true,
  mfaEnabled: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// ── Test suite ────────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    refreshToken: {
      deleteMany: jest.fn(),
    },
  };

  const mockToken = {
    generateTokenPair: jest.fn().mockResolvedValue(mockTokens),
    rotateRefreshToken: jest.fn().mockResolvedValue(mockTokens),
    revokeAccessToken: jest.fn().mockResolvedValue(undefined),
    revokeAllUserTokens: jest.fn().mockResolvedValue(undefined),
    revokeSession: jest.fn().mockResolvedValue(true),
    listSessions: jest.fn().mockResolvedValue([]),
  };

  const mockMessaging = { publishEvent: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: TokenService, useValue: mockToken },
        { provide: MessagingService, useValue: mockMessaging },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
    mockToken.generateTokenPair.mockResolvedValue(mockTokens);
  });

  // ── register ─────────────────────────────────────────────────────────────────

  describe('register()', () => {
    it('throws ConflictException if email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(makeUser());

      await expect(
        service.register({ email: 'test@example.com', password: 'Pass123!' }),
      ).rejects.toThrow(ConflictException);

      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it('creates user and returns token pair on success', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(makeUser());

      const result = await service.register({ email: 'new@example.com', password: 'Pass123!' });

      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'new@example.com',
            passwordHash: '$hashed$',
          }),
        }),
      );
      expect(result.accessToken).toBe('access');
    });

    it('publishes USER_REGISTERED event after successful registration', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(makeUser());

      await service.register({ email: 'new@example.com', password: 'Pass123!' });

      expect(mockMessaging.publishEvent).toHaveBeenCalledWith(
        'auth.user.registered',
        expect.objectContaining({ email: 'test@example.com' }),
      );
    });

    it('defaults role to STUDENT when not provided', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(makeUser());

      await service.register({ email: 'new@example.com', password: 'Pass123!' });

      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ role: UserRole.STUDENT }),
        }),
      );
    });
  });

  // ── login ─────────────────────────────────────────────────────────────────────

  describe('login()', () => {
    it('throws UnauthorizedException when user not found', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@example.com', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when user is inactive', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(makeUser({ isActive: false }));

      await expect(service.login({ email: 'test@example.com', password: 'pass' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when password is wrong', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(makeUser());
      mockCompare.mockResolvedValueOnce(false);

      await expect(
        service.login({ email: 'test@example.com', password: 'WrongPass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('returns token pair on correct credentials', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(makeUser());
      mockCompare.mockResolvedValueOnce(true);

      const result = await service.login({ email: 'test@example.com', password: 'Pass123!' });

      expect(result.accessToken).toBe('access');
      expect(result.refreshToken).toBe('refresh');
    });

    it('publishes USER_LOGGED_IN event on success', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(makeUser());
      mockCompare.mockResolvedValueOnce(true);

      await service.login({ email: 'test@example.com', password: 'Pass123!' });

      expect(mockMessaging.publishEvent).toHaveBeenCalledWith(
        'auth.user.logged_in',
        expect.objectContaining({ userId: 'user-1' }),
      );
    });
  });

  // ── refreshTokens ─────────────────────────────────────────────────────────────

  describe('refreshTokens()', () => {
    it('delegates to TokenService.rotateRefreshToken', async () => {
      const payload = { sub: 'user-1', tokenId: 'token-id-1' };

      const result = await service.refreshTokens('old-refresh-token', payload);

      expect(mockToken.rotateRefreshToken).toHaveBeenCalledWith('old-refresh-token', payload, undefined);
      expect(result.accessToken).toBe('access');
    });
  });

  // ── logout ────────────────────────────────────────────────────────────────────

  describe('logout()', () => {
    it('revokes access token and deletes refresh tokens', async () => {
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

      await service.logout('user-1', 'jti-123', 'access-token-raw');

      expect(mockToken.revokeAccessToken).toHaveBeenCalledWith('jti-123', 'access-token-raw');
      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });

    it('skips revokeAccessToken when jti is undefined', async () => {
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

      await service.logout('user-1', undefined, 'access-token-raw');

      expect(mockToken.revokeAccessToken).not.toHaveBeenCalled();
    });

    it('publishes USER_LOGGED_OUT event', async () => {
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 0 });

      await service.logout('user-1', 'jti-123', 'access-token');

      expect(mockMessaging.publishEvent).toHaveBeenCalledWith(
        'auth.user.logged_out',
        expect.objectContaining({ userId: 'user-1' }),
      );
    });
  });

  // ── changePassword ────────────────────────────────────────────────────────────

  describe('changePassword()', () => {
    it('throws UnauthorizedException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.changePassword('user-1', { currentPassword: 'old', newPassword: 'New123!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when current password is wrong', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(makeUser());
      mockCompare.mockResolvedValueOnce(false);

      await expect(
        service.changePassword('user-1', { currentPassword: 'wrong', newPassword: 'New123!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('updates password hash and revokes all tokens on success', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(makeUser());
      mockCompare.mockResolvedValueOnce(true);
      mockPrisma.user.update.mockResolvedValue(makeUser());

      await service.changePassword('user-1', { currentPassword: 'Pass123!', newPassword: 'New456!' });

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ passwordHash: '$hashed$' }),
        }),
      );
      expect(mockToken.revokeAllUserTokens).toHaveBeenCalledWith('user-1');
    });
  });

  // ── revokeSession ─────────────────────────────────────────────────────────────

  describe('revokeSession()', () => {
    it('throws NotFoundException when session not found', async () => {
      mockToken.revokeSession.mockResolvedValue(false);

      await expect(service.revokeSession('session-x', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('succeeds when session exists', async () => {
      mockToken.revokeSession.mockResolvedValue(true);

      await expect(service.revokeSession('session-1', 'user-1')).resolves.not.toThrow();
    });
  });

  // ── updateUserStatus ──────────────────────────────────────────────────────────

  describe('updateUserStatus()', () => {
    it('throws NotFoundException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.updateUserStatus('user-x', false)).rejects.toThrow(NotFoundException);
    });

    it('revokes all tokens when deactivating user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(makeUser());
      mockPrisma.user.update.mockResolvedValue(makeUser({ isActive: false }));

      await service.updateUserStatus('user-1', false);

      expect(mockToken.revokeAllUserTokens).toHaveBeenCalledWith('user-1');
    });

    it('does NOT revoke tokens when reactivating user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(makeUser({ isActive: false }));
      mockPrisma.user.update.mockResolvedValue(makeUser({ isActive: true }));

      await service.updateUserStatus('user-1', true);

      expect(mockToken.revokeAllUserTokens).not.toHaveBeenCalled();
    });
  });
});

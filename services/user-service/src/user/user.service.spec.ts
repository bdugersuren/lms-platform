import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';
import { PrismaService } from '../prisma/prisma.service';

const mockProfile = {
  id: 'user-uuid-1',
  tenantId: null,
  displayName: 'testuser',
  firstName: null,
  lastName: null,
  avatarUrl: null,
  bio: null,
  locale: 'mn',
  timezone: 'Asia/Ulaanbaatar',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPrisma = {
  userProfile: {
    upsert:     jest.fn(),
    findUnique: jest.fn(),
    update:     jest.fn(),
  },
};

describe('UserService', () => {
  let service: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    jest.clearAllMocks();
  });

  // ── bootstrap ──────────────────────────────────────────────────────────────

  describe('bootstrap', () => {
    it('creates a profile with displayName derived from email prefix', async () => {
      mockPrisma.userProfile.upsert.mockResolvedValue(mockProfile);

      await service.bootstrap('user-uuid-1', 'testuser@example.com');

      expect(mockPrisma.userProfile.upsert).toHaveBeenCalledWith({
        where:  { id: 'user-uuid-1' },
        update: {},
        create: {
          id:          'user-uuid-1',
          displayName: 'testuser',
          locale:      'mn',
          timezone:    'Asia/Ulaanbaatar',
        },
      });
    });

    it('is idempotent: update is always empty so existing profiles are not overwritten', async () => {
      mockPrisma.userProfile.upsert.mockResolvedValue(mockProfile);

      await service.bootstrap('user-uuid-1', 'testuser@example.com');

      const call = mockPrisma.userProfile.upsert.mock.calls[0][0];
      expect(call.update).toEqual({});
    });
  });

  // ── findMe ─────────────────────────────────────────────────────────────────

  describe('findMe', () => {
    it('returns the profile when it exists', async () => {
      mockPrisma.userProfile.findUnique.mockResolvedValue(mockProfile);

      const result = await service.findMe('user-uuid-1');

      expect(result).toEqual(mockProfile);
    });

    it('throws NotFoundException when profile does not exist', async () => {
      mockPrisma.userProfile.findUnique.mockResolvedValue(null);

      await expect(service.findMe('missing-uuid')).rejects.toThrow(NotFoundException);
    });
  });

  // ── updateMe ───────────────────────────────────────────────────────────────

  describe('updateMe', () => {
    it('upserts then updates and returns the updated profile', async () => {
      const updated = { ...mockProfile, displayName: 'New Name' };
      mockPrisma.userProfile.upsert.mockResolvedValue(mockProfile);
      mockPrisma.userProfile.update.mockResolvedValue(updated);

      const result = await service.updateMe('user-uuid-1', 'test@example.com', { displayName: 'New Name' });

      expect(mockPrisma.userProfile.update).toHaveBeenCalledWith({
        where: { id: 'user-uuid-1' },
        data:  { displayName: 'New Name' },
      });
      expect(result.displayName).toBe('New Name');
    });
  });

  // ── findPublic ─────────────────────────────────────────────────────────────

  describe('findPublic', () => {
    it('returns only the public fields', async () => {
      const publicProfile = {
        id:          mockProfile.id,
        displayName: mockProfile.displayName,
        firstName:   mockProfile.firstName,
        lastName:    mockProfile.lastName,
        avatarUrl:   mockProfile.avatarUrl,
        bio:         mockProfile.bio,
      };
      mockPrisma.userProfile.findUnique.mockResolvedValue(publicProfile);

      const result = await service.findPublic('user-uuid-1');

      expect(result).not.toHaveProperty('locale');
      expect(result).not.toHaveProperty('timezone');
      expect(result).toHaveProperty('displayName');
    });

    it('throws NotFoundException when profile does not exist', async () => {
      mockPrisma.userProfile.findUnique.mockResolvedValue(null);

      await expect(service.findPublic('missing-uuid')).rejects.toThrow(NotFoundException);
    });
  });
});

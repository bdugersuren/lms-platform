import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { UserProfile } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Bootstrap ────────────────────────────────────────────────────────────
  // Called by the event listener when auth.user.registered is received.
  // Idempotent: safe to replay; update:{} means existing profiles are untouched.

  async bootstrap(userId: string, email: string): Promise<void> {
    const displayName = email.split('@')[0];
    await this.prisma.userProfile.upsert({
      where:  { id: userId },
      update: {},
      create: { id: userId, displayName, locale: 'mn', timezone: 'Asia/Ulaanbaatar' },
    });
    this.logger.log(`Profile bootstrapped: userId=${userId}`);
  }

  // ─── Own profile ──────────────────────────────────────────────────────────

  async findMe(userId: string): Promise<UserProfile> {
    const profile = await this.prisma.userProfile.findUnique({ where: { id: userId } });
    if (!profile) {
      throw new NotFoundException('User profile not found');
    }
    return profile;
  }

  async updateMe(userId: string, dto: UpdateProfileDto): Promise<UserProfile> {
    await this.findMe(userId);
    return this.prisma.userProfile.update({
      where: { id: userId },
      data:  dto,
    });
  }

  // ─── Public profile ───────────────────────────────────────────────────────
  // Returns limited fields suitable for display in course listings and certificates.

  async findPublic(userId: string): Promise<{
    id: string;
    displayName: string;
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
    bio: string | null;
    headline: string | null;
    expertise: string[];
  }> {
    const profile = await this.prisma.userProfile.findUnique({
      where:  { id: userId },
      select: {
        id: true, displayName: true, firstName: true, lastName: true,
        avatarUrl: true, bio: true, headline: true, expertise: true,
      },
    });
    if (!profile) {
      throw new NotFoundException('User profile not found');
    }
    return profile;
  }
}

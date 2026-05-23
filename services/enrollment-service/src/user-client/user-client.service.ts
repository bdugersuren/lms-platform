import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface UserProfile {
  id: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
}

@Injectable()
export class UserClientService {
  private readonly logger = new Logger(UserClientService.name);
  private readonly baseUrl: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.get<string>('USER_SERVICE_URL', 'http://user-service:3014');
  }

  async getProfile(userId: string): Promise<UserProfile | null> {
    try {
      const resp = await firstValueFrom(
        this.http.get<{ data: UserProfile }>(`${this.baseUrl}/api/users/${userId}/profile`),
      );
      return resp.data.data;
    } catch (err: any) {
      this.logger.warn(`Could not fetch profile for userId=${userId}: ${err?.message}`);
      return null;
    }
  }

  getDisplayName(profile: UserProfile | null): string {
    if (!profile) return 'Student';
    if (profile.displayName) return profile.displayName;
    const parts = [profile.firstName, profile.lastName].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : 'Student';
  }
}

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '@lms/shared-types';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly redis: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('jwt.secret'),
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    if (!payload.sub || !payload.email) {
      throw new UnauthorizedException('Invalid token');
    }

    // Check user-level blacklist (logout-all / password change).
    // Value is the Unix timestamp of when all prior tokens were revoked.
    // Only reject if the token's iat is before that timestamp.
    const userKey = this.redis.buildUserBlacklistKey(payload.sub);
    const revokedAt = await this.redis.get(userKey);
    if (revokedAt && payload.iat !== undefined && payload.iat < parseInt(revokedAt, 10)) {
      throw new UnauthorizedException('Token has been revoked');
    }

    // Check token-level blacklist (single-session logout)
    if (payload.jti) {
      const tokenKey = this.redis.buildBlacklistKey(payload.jti);
      if (await this.redis.exists(tokenKey)) {
        throw new UnauthorizedException('Token has been revoked');
      }
    }

    return payload;
  }
}

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy, StrategyOptions } from 'passport-jwt';
import { JwtPayload } from '@lms/shared-types';

const MIN_SECRET_LENGTH = 32;

@Injectable()
export abstract class BaseJwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(options: Partial<StrategyOptions> & { secret: string }) {
    if (!options.secret || options.secret.length < MIN_SECRET_LENGTH) {
      throw new Error(
        `JWT_SECRET must be at least ${MIN_SECRET_LENGTH} characters long ` +
          `(got ${options.secret?.length ?? 0}). Set a strong secret in your .env file.`,
      );
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: options.secret,
      ...options,
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    if (!payload.sub || !payload.email) {
      throw new UnauthorizedException('Invalid token payload');
    }
    return payload;
  }
}

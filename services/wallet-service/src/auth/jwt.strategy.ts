import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseJwtStrategy } from '@lms/shared-auth';

@Injectable()
export class JwtStrategy extends BaseJwtStrategy {
  constructor(config: ConfigService) {
    super({ secret: config.getOrThrow<string>('jwt.secret') });
  }
}


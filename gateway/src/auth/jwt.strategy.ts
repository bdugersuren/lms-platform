import { Injectable } from '@nestjs/common';
import { BaseJwtStrategy } from '@lms/shared-auth';

@Injectable()
export class GatewayJwtStrategy extends BaseJwtStrategy {
  constructor() {
    super({ secret: process.env.JWT_SECRET ?? 'secret' });
  }
}

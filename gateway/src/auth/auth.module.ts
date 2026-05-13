import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { GatewayJwtStrategy } from './jwt.strategy';

@Module({
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  providers: [GatewayJwtStrategy],
  exports: [PassportModule],
})
export class GatewayAuthModule {}

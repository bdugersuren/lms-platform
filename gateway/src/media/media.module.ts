import { Module } from '@nestjs/common';
import { GatewayAuthModule } from '../auth/auth.module';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';

@Module({
  imports: [GatewayAuthModule],
  controllers: [MediaController],
  providers: [MediaService],
})
export class MediaModule {}

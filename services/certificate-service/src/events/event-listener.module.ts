import { Module } from '@nestjs/common';
import { CertificateModule } from '../certificate/certificate.module';
import { EventListenerService } from './event-listener.service';

@Module({
  imports: [CertificateModule],
  providers: [EventListenerService],
})
export class EventListenerModule {}

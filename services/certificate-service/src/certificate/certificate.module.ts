import { Module } from '@nestjs/common';
import { RolesGuard } from '@lms/shared-auth';
import { GeneratorModule } from '../generator/generator.module';
import { CertificateController } from './certificate.controller';
import { CertificateService } from './certificate.service';

@Module({
  imports: [GeneratorModule],
  controllers: [CertificateController],
  providers: [CertificateService, RolesGuard],
  exports: [CertificateService],
})
export class CertificateModule {}

import { Module } from '@nestjs/common';
import { FeePolicyService } from './fee-policy.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [FeePolicyService],
  exports: [FeePolicyService],
})
export class FeePolicyModule {}

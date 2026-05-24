import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TenantResolverService } from './tenant-resolver.service';

@Module({
  imports: [HttpModule],
  providers: [TenantResolverService],
  exports: [TenantResolverService],
})
export class TenantModule {}

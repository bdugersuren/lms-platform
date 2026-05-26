import { Global, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DmojHttpService } from './dmoj-http.service';

@Global()
@Module({
  imports: [HttpModule],
  providers: [DmojHttpService],
  exports: [DmojHttpService],
})
export class DmojModule {}

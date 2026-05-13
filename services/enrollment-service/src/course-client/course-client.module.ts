import { Global, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CourseClientService } from './course-client.service';

@Global()
@Module({
  imports: [HttpModule],
  providers: [CourseClientService],
  exports: [CourseClientService],
})
export class CourseClientModule {}

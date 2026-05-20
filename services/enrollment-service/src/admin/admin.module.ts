import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { MigrationService } from './migration.service';
import { CourseProjectionModule } from '../course-projection/course-projection.module';

@Module({
  imports: [CourseProjectionModule],
  controllers: [AdminController],
  providers: [MigrationService],
  exports: [MigrationService],
})
export class AdminModule {}

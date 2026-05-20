import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ProxyController } from './proxy.controller';
import { CourseEnrollmentController } from './course-enrollment.controller';
import { CorrelationIdMiddleware } from '../common/middleware/correlation-id.middleware';

@Module({
  imports: [HttpModule],
  // CourseEnrollmentController must be listed BEFORE ProxyController so NestJS/Fastify
  // registers its more-specific routes first and they take precedence over the wildcard.
  controllers: [CourseEnrollmentController, ProxyController],
})
export class ProxyModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}

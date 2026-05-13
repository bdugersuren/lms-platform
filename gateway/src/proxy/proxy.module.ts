import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ProxyController } from './proxy.controller';
import { CorrelationIdMiddleware } from '../common/middleware/correlation-id.middleware';

@Module({
  imports: [HttpModule],
  controllers: [ProxyController],
})
export class ProxyModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}

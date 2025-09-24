import { Module } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { JwtService } from '@nestjs/jwt';
import { MetricsInterceptor } from './metrics.interceptor';
import { MetricsMiddleware } from './metrics.middleware';

@Module({
  providers: [
    MetricsService,
    JwtService,
    MetricsInterceptor,
    MetricsMiddleware,
  ],
  exports: [MetricsInterceptor, MetricsMiddleware],
})
export class MetricsModule {}

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from './metrics.service';
import { Request } from 'express';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const start = process.hrtime.bigint();
    const user = request.user as { clientId: string; email: string };
    const tenantId = user ? user.clientId : undefined;
    return next.handle().pipe(
      tap(() => {
        const end = process.hrtime.bigint();
        const duration = Number(end - start) / 1_000_000_000; // duration in seconds
        const response = context.switchToHttp().getResponse();

        const method = request.method;
        const route = request.route ? request.route.path : request.originalUrl;
        const statusCode = response.statusCode;
        const email = user?.email || 'unknown';
        console.log('user in intenrceptor', email);

        this.metricsService.countHttpRequest(
          method,
          route,
          statusCode,
          tenantId,
          email,
        );
        this.metricsService.observeHttpRequestDuration(
          method,
          route,
          statusCode,
          tenantId ?? 'unknown',
          duration,
          email,
        );
      }),
    );
  }
}

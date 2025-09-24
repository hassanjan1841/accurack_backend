import { Injectable, NestMiddleware } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  constructor(private readonly metricsService: MetricsService) {}

  use(req: any, res: any, next: () => void) {
    const startTime = Date.now();
    const userData: { email: string } = { email: 'unknown' };

    try {
      const cookieHeader = req.headers.cookie;
      let token = null;

      if (cookieHeader) {
        const cookies = cookieHeader.split(';');
        for (const cookie of cookies) {
          const [key, value] = cookie.trim().split('=');
          if (key === 'accessToken') {
            token = value;
            break;
          }
        }
      }

      if (token) {
        const decoded: any = jwt.decode(token);
        userData.email = decoded.email;
      }
    } catch (err) {
      console.error('Token decode failed:', err.message);
    }

    // Capture the tenant_id from the request (assuming it's available in req.user)
    const tenantId = req.user?.tenant_id || 'unknown';

    // Capture the HTTP method and route
    const method = req.method;
    const route = req.originalUrl || 'unknown';
    const email = userData?.email || 'unknown';

    // Listen for the response 'finish' event to calculate duration and status
    res.on('finish', () => {
      const durationSeconds = (Date.now() - startTime) / 1000;
      const status = res.statusCode;

      // Increment the HTTP request counter
      this.metricsService.countHttpRequest(
        method,
        route,
        status,
        tenantId,
        email,
      );

      // Observe the duration of the HTTP request
      this.metricsService.observeHttpRequestDuration(
        method,
        route,
        status,
        tenantId,
        durationSeconds,
        email,
      );
    });

    next();
  }
}

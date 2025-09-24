import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  Registry,
  collectDefaultMetrics,
  Counter,
  Histogram,
} from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly register = new Registry();
  private readonly httpRequestCounter: Counter<string>;
  private readonly httpRequestDurationHistogram: Histogram<string>;

  constructor() {
    // Collect default Node.js metrics (CPU, memory, event loop, etc.)
    collectDefaultMetrics({ register: this.register });

    // HTTP Request Counter with tenant_id
    this.httpRequestCounter = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status', 'tenant_id', 'email'],
      registers: [this.register],
    });

    // HTTP Request Duration Histogram with tenant_id
    this.httpRequestDurationHistogram = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status', 'tenant_id', 'email'],
      buckets: [0.01, 0.05, 0.1, 0.2, 0.5, 1, 2, 5], // Define your desired buckets
      registers: [this.register],
    });
  }

  onModuleInit() {
    console.log('Prometheus metrics service initialized.');
  }

  /**
   * Increments the HTTP request counter.
   * @param method HTTP method (GET, POST, etc.)
   * @param route The API route
   * @param status HTTP status code
   * @param tenantId The tenant ID extracted from JWT
   * @param email The email of the user making the request
   */
  public countHttpRequest(
    method: string,
    route: string,
    status: number,
    tenantId?: string,
    email?: string,
  ) {
    this.httpRequestCounter
      .labels(
        method,
        route,
        status.toString(),
        tenantId || 'unknown',
        email || 'unknown',
      )
      .inc();
  }

  /**
   * Observes the duration of an HTTP request.
   * @param method HTTP method
   * @param route The API route
   * @param status HTTP status code
   * @param tenantId The tenant ID
   * @param durationSeconds The duration of the request in seconds
   */
  public observeHttpRequestDuration(
    method: string,
    route: string,
    status: number,
    tenantId: string,
    durationSeconds: number,
    email?: string,
  ) {
    this.httpRequestDurationHistogram
      .labels(
        method,
        route,
        status.toString(),
        tenantId || 'unknown',
        email || 'unknown',
      )
      .observe(durationSeconds);
  }

  public getMetrics() {
    return this.register.metrics();
  }

  public getContentType() {
    return this.register.contentType;
  }
}

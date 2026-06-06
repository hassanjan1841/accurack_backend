
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { StoreModule } from './store/store.module';
import { CommonModule } from './common/common.module';
import { SupplierModule } from './supplier/supplier.module';
import { PermissionsModule } from './permissions/permissions.module';
import { ProductModule } from './product/product.module';
import { TenantModule } from './tenant/tenant.module';
import { DatabaseModule } from './database/database.module';
import { EmployeeModule } from './employee/employee.module';
import { UsersModule } from './users/users.module';
import { TenantContextInterceptor } from './tenant/tenant-context.interceptor';
import { SalesModule } from './sales/sales.module';
import { TaxModule } from './tax/tax.module';
import { InvoiceModule } from './invoice/invoice.module';
import { HealthController } from './health/health.controller';
import { DriverModule } from './driver/driver.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { CustomerModule } from './customer/customer.module';
import {ExpenseModule} from './expense/expense.module';

import { MetricsService } from './metrics/metrics.service';
import { MetricsInterceptor } from './metrics/metrics.interceptor';

import * as jwt from 'jsonwebtoken';
import { MetricsMiddleware } from './metrics/metrics.middleware';

const isProduction = process.env.NODE_ENV === 'production';
const transportConfig = isProduction
  ? {
      target: 'pino-loki',
      options: {
        host: process.env.LOKI_HOST ?? 'http://localhost:3100', // Use environment variable for Loki host
        labels: {
          app: 'accurack-software-api',
          environment: process.env.NODE_ENV,
        },
      },
    }
  : { target: 'pino-pretty' };

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        transport: transportConfig,
        serializers: {
          req: (req) => {
            let tenantId = null;
            let userId = null;
            let email = null;

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
                // console.log('decoded', decoded);
                tenantId = decoded?.clientId;
                userId = decoded?.id;
                email = decoded?.email;
              }
            } catch (err) {
              console.error('Token decode failed:', err.message);
            }

            return {
              id: req.id,
              method: req.method,
              url: req.url,
              tenantId,
              userId,
              email,
            };
          },
          res: (res) => ({
            statusCode: res.statusCode,
          }),
        },
      },
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 10_000, // 10 seconds in milliseconds
          limit: 30, // max 100 requests per 60 seconds per IP
        },
      ],
    }),
    SalesModule,
    CommonModule,
    AuthModule,
    PrismaModule,
    StoreModule,
    ProductModule,
    SupplierModule,
    PermissionsModule,
    TenantModule,
    DatabaseModule,
    CustomerModule,
    InvoiceModule,
    EmployeeModule,
    UsersModule,
    TaxModule,
    // ValidatorModule,
    DriverModule,
    DashboardModule,
    ExpenseModule
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantContextInterceptor,
    },
    MetricsService,
  ],
  exports: [MetricsService],
  controllers: [HealthController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(MetricsMiddleware).forRoutes('*'); // Apply to all routes
  }
}

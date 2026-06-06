import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { VersioningType } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { INestApplication } from '@nestjs/common';
import { EnvValidation } from './utils/env-validation';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import { ResponseInterceptor, GlobalExceptionFilter } from './common';
import * as basicAuth from 'express-basic-auth';
import { Response, Request } from 'express';
import * as fs from 'fs';
import * as path from 'path';

import { Logger } from 'nestjs-pino'; // Or your chosen logger
import { MetricsService } from './metrics/metrics.service';

import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function bootstrap() {
  // Validate critical environment variables before starting the app
  EnvValidation.validateCriticalEnvVars();

  // Validate optional configurations
  EnvValidation.validateEmailConfig();
  EnvValidation.validateGoogleOAuthConfig();

  const app = await NestFactory.create<INestApplication>(AppModule, {
    bufferLogs: true, // Buffer logs until logger is ready
  });
  app.useLogger(app.get(Logger));

  // Add cookie parser middleware
  app.use(cookieParser());
  // Apply global filters and interceptors
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor(app.get(Reflector)));

  app.setGlobalPrefix('api'); // Ensure /api prefix
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  // app.use(helmet());
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['Set-Cookie'],
  });
  // Protect Swagger UI with basic auth using env variables
  const metricsService = app.get(MetricsService);
  app.getHttpAdapter().get('/metrics', async (req: Request, res: Response) => {
    res.set('Content-Type', metricsService.getContentType());
    res.send(await metricsService.getMetrics());
  });
  app.use(
    ['/api/v1/swagger'],
    basicAuth({
      challenge: true,
      users: {
        [process.env.SWAGGER_USER || '']: process.env.SWAGGER_PASSWORD || '',
      },
      unauthorizedResponse: (req) => 'Unauthorized',
    }),
  );

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('Accurack Software API')
    .setDescription(
      'Comprehensive API documentation for Accurack Software Backend',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter your JWT token (without "Bearer " prefix)',
        in: 'header',
      },
      'JWT-auth', // This is the key name used in @ApiBearerAuth('JWT-auth')
    )
    .addOAuth2(
      {
        type: 'oauth2',
        flows: {
          authorizationCode: {
            authorizationUrl: 'https://accounts.google.com/o/oauth2/auth',
            tokenUrl: 'https://oauth2.googleapis.com/token',
            scopes: {
              openid: 'OpenID Connect',
              profile: 'User profile information',
              email: 'User email address',
            },
          },
        },
      },
      'google-oauth',
    )
    .addTag('Authentication', 'User authentication and authorization endpoints')
    .addTag('Stores', 'Store management endpoints')
    .addTag('Tenant', 'Multi-tenant database management endpoints')
    .addTag('Products', 'Product management endpoints')
    .addTag('Suppliers', 'Supplier management endpoints')
    .addTag('Permissions', 'Permission and role management endpoints')
    .addTag('employees', 'Employee management endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // ✅ Write swagger.json to disk on startup
  const swaggerPath = path.resolve(__dirname, '..', 'swagger.json');
  fs.writeFileSync(swaggerPath, JSON.stringify(document, null, 2), 'utf8');
  console.log(`📄 Swagger JSON generated at: ${swaggerPath}`);
  console.log(`✅ Loki host`, process.env.LOKI_HOST);

  SwaggerModule.setup('api/v1/swagger', app, document, {
    customSiteTitle: 'Accurack Software API Documentation',
    customfavIcon: '/favicon.ico',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info .title { color: #2d3748; }
    `,
    jsonDocumentUrl: 'swagger/json',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
    },
  });

  await app.listen(process.env.PORT ?? 4000);

}
bootstrap();

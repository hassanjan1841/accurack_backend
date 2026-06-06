import { Module } from '@nestjs/common';
import { DriverController } from './driver.controller';
import { DriverService } from './driver.service';
import { ResponseService } from '../common/services/response.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { MultiTenantService } from '../database/multi-tenant.service';
import { PrismaService } from '../prisma/prisma.service';
import { PassportModule } from '@nestjs/passport';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionsModule } from 'src/permissions/permissions.module';
import { CommonModule, PermissionsService } from 'src/common';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '15m' },
    }),
    PrismaModule,
    PermissionsModule,
    CommonModule,
  ],
  controllers: [DriverController],
  providers: [
    DriverService,
    ResponseService, // Required by BaseDriverController
    TenantContextService, // Add tenant context
    MultiTenantService, // Required by TenantContextService
    PrismaService, // Required by TenantContextService
    PermissionsService,
    JwtService,
  ],
})
export class DriverModule {}

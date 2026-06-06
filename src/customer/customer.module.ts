import { Module } from '@nestjs/common';
import { CustomerController } from './customer.controller';
import { CustomerService } from './customer.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { CommonModule } from '../common/common.module';
import { TenantContextService } from 'src/tenant/tenant-context.service';
import { MultiTenantService } from 'src/database/multi-tenant.service';
import { PassportModule } from '@nestjs/passport';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { InvoiceService } from 'src/invoice/invoice.service';
import { PermissionsService, ResponseService } from 'src/common';
import { InvoiceModule } from 'src/invoice/invoice.module';

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
    InvoiceModule,
  ],
  controllers: [CustomerController],
  providers: [
    CustomerService,
    TenantContextService, // Add tenant context
    MultiTenantService, // Required by TenantContextService
    PrismaService,
    JwtService,
    PermissionsService,
    ResponseService,
    InvoiceService,
  ],
})
export class CustomerModule {}

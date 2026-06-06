import { Module } from '@nestjs/common';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { SaleValidationService } from './sale-validation.service';
import { SaleInventoryService } from './sale-inventory.service';
import { SalePricingService } from './sale-pricing.service';
import { SaleReturnService } from './sale-return.service';
import { CustomerBalanceService } from './customer-balance.service';
import { SaleHistoryService } from './sale-history.service';
import { StatusManagementService } from './status-management.service';
import { OrderProcessingService } from './order-processing.service';
import { CommonModule } from '../common';
import { TenantModule } from '../tenant/tenant.module';
import { PermissionsService } from 'src/common';
import { TenantContextService } from 'src/tenant/tenant-context.service';
import { MultiTenantService } from 'src/database/multi-tenant.service';
import { JwtStrategy } from 'src/strategies/jwt.strategy';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { SaleDraftService } from './sale-draft.service';

@Module({
  imports: [
      PassportModule.register({ defaultStrategy: 'jwt' }),
      JwtModule.register({
        secret: process.env.JWT_SECRET,
        signOptions: { expiresIn: '15m' },
      }),
      PrismaModule,
      TenantModule
    ],
  controllers: [SalesController],
  providers: [
    SalesService,
    SaleValidationService,
    SaleInventoryService,
    SalePricingService,
    JwtStrategy,
    SaleReturnService,
    PermissionsService,
    CustomerBalanceService,
    SaleHistoryService,
    StatusManagementService,
    OrderProcessingService,
    SaleDraftService,
  ],
  exports: [SalesService, SaleHistoryService, StatusManagementService, OrderProcessingService],
})
export class SalesModule {}

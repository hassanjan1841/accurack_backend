import { Module } from '@nestjs/common';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';
import { PermissionsInitializationService } from './permissions.initialization.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CommonModule } from '../common/common.module';
import { DatabaseModule } from 'src/database/database.module';
import { TenantContextService } from 'src/tenant/tenant-context.service';
import { MultiTenantService } from 'src/database/multi-tenant.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  imports: [PrismaModule, CommonModule, DatabaseModule],
  controllers: [PermissionsController],
  providers: [
    PermissionsService,
    PermissionsInitializationService,
    TenantContextService,
    MultiTenantService,
    PrismaService,
  ],
  exports: [PermissionsService],
})
export class PermissionsModule {}

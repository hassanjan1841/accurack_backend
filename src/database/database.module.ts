import { Module } from '@nestjs/common';
import { DatabaseController } from './database.controller';
import { MultiTenantService } from './multi-tenant.service';
import { PrismaService } from '../prisma/prisma.service';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [CommonModule],
  controllers: [DatabaseController],
  providers: [MultiTenantService, PrismaService],
  exports: [MultiTenantService],
})
export class DatabaseModule {}

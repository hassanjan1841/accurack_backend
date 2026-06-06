import { Module } from '@nestjs/common';
import { StoreService } from './store.service';
import { StoreController } from './store.controller';
import { JwtStrategy } from '../strategies/jwt.strategy';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { PermissionsModule } from '../permissions/permissions.module';
import { TenantModule } from '../tenant/tenant.module';
import { PrismaModule } from '../prisma/prisma.module';
import { MultiTenantService } from '../database/multi-tenant.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '15m' },
    }),
    PermissionsModule,
    TenantModule, // Import TenantModule to get TenantContextService
    PrismaModule, // Import PrismaModule for JwtStrategy (uses master DB)
  ],
  controllers: [StoreController],
  providers: [StoreService, JwtStrategy, MultiTenantService], // JwtStrategy needs PrismaService from PrismaModule
})
export class StoreModule {}

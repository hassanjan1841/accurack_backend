import { Module } from '@nestjs/common';
import { ExpenseDirectoryController } from './controllers/expense-directory.controller';
import { ExpenseSheetController } from './controllers/expense-sheet.controller';
import { ExpenseDirectoryService } from './expense-directory.service';
import { ExpenseSheetService } from './expense-sheet.service';
import { ExpenseExportService } from './expense-export.service';
import { TenantModule } from '../tenant/tenant.module';
import { PermissionsService } from 'src/common';
import { JwtStrategy } from 'src/strategies/jwt.strategy';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '15m' },
    }),
    PrismaModule,
    TenantModule,
  ],
  controllers: [
    ExpenseDirectoryController,
    ExpenseSheetController,
  ],
  providers: [
    ExpenseDirectoryService,
    ExpenseSheetService,
    ExpenseExportService,
    JwtStrategy,
    PermissionsService,
    PrismaService
  ],
  exports: [
    ExpenseDirectoryService,
    ExpenseSheetService,
    ExpenseExportService,
    PrismaService
  ],
})
export class ExpenseModule {}
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DriverType, SaleStatus } from '@prisma/client';

export class ChangeSaleStatusDto {
  @ApiProperty({
    enum: SaleStatus,
    description: 'New status for the sale',
    example: SaleStatus.CONFIRMED
  })
  @IsEnum(SaleStatus)
  status: SaleStatus;

  @ApiPropertyOptional({
    description: 'Optional reason for status change',
    example: 'Customer confirmed order via phone'
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Driver ID for SHIPPED status',
    example: 'uuid-driver-id'
  })
  @IsOptional()
  @IsString()
  driverId?: string;

  @ApiPropertyOptional({
    description: 'Driver name for SHIPPED status',
    example: 'John Driver'
  })
  @IsOptional()
  @IsString()
  driverName?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata for status change',
    example: { previousStatus: 'PENDING', timestamp: '2025-07-25T10:30:00Z' }
  })
  @IsOptional()
  metadata?: any;

  @ApiPropertyOptional({ enum: DriverType, description: 'Driver used' })
  @IsOptional()
  @IsEnum(DriverType)
  driverType?: DriverType;
}

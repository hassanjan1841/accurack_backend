import { IsEnum, IsOptional, IsString, IsNumber, Min, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';

export enum OrderProcessingStatus {
  SENT_FOR_VALIDATION = 'SENT_FOR_VALIDATION',
  PENDING_VALIDATION = 'PENDING_VALIDATION',
  VALIDATED = 'VALIDATED',
  PICKED = 'PICKED',
  PACKED = 'PACKED',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export class UpdateOrderProcessingDto {
  @ApiPropertyOptional({
    enum: OrderProcessingStatus,
    description: 'Updated order processing status',
    example: OrderProcessingStatus.PICKED
  })
  @IsOptional()
  @IsEnum(OrderProcessingStatus)
  status?: OrderProcessingStatus;

  @ApiPropertyOptional({
    description: 'Updated payment amount',
    example: 150.75,
    minimum: 0
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  paymentAmount?: number;


  @ApiPropertyOptional({
    description: 'Store id',
    example: "uuid",
  })
  @IsUUID()
  storeId?: string;

  @ApiPropertyOptional({
    enum: PaymentMethod,
    description: 'Updated payment type',
    example: PaymentMethod.CASH
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentType?: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Driver notes or updates',
    example: 'Package delivered to front door'
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Location or delivery details',
    example: 'Building 5, Apartment 3B'
  })
  @IsOptional()
  @IsString()
  deliveryDetails?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata for the update',
    example: { gpsLocation: { lat: 40.7128, lng: -74.0060 }, timestamp: '2025-07-25T10:30:00Z' }
  })
  @IsOptional()
  metadata?: any;
}

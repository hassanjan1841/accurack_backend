import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsDateString,
  IsBoolean,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { OrderProcessingStatus } from './update-order-processing.dto';
import { PaymentMethod } from '@prisma/client';

export class QueryOrderProcessingDto {
  @ApiPropertyOptional({
    description: 'Store ID to filter order processing records',
    example: 'store-123'
  })
  @IsOptional()
  @IsString()
  storeId?: string;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    default: 1,
    minimum: 1
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of records per page',
    default: 20,
    minimum: 1,
    maximum: 100
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 20;

  @ApiPropertyOptional({
    enum: OrderProcessingStatus,
    description: 'Filter by order processing status',
    example: OrderProcessingStatus.DELIVERED
  })
  @IsOptional()
  @IsEnum(OrderProcessingStatus)
  status?: OrderProcessingStatus;

  @ApiPropertyOptional({
    enum: PaymentMethod,
    description: 'Filter by payment method',
    example: PaymentMethod.CASH
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Search query to find orders by customer name or driver name',
    example: 'John Doe'
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter orders from this date (ISO string)',
    example: '2024-01-01T00:00:00.000Z'
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter orders to this date (ISO string)',
    example: '2024-12-31T23:59:59.999Z'
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({
    description: 'Filter by customer ID',
    example: 'customer-123'
  })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({
    description: 'Filter by driver ID',
    example: 'driver-123'
  })
  @IsOptional()
  @IsString()
  driverId?: string;

  @ApiPropertyOptional({
    description: 'Filter by validator ID',
    example: 'validator-123'
  })
  @IsOptional()
  @IsString()
  validatorId?: string;

  // @ApiPropertyOptional({
  //   description: 'Filter by validation status',
  //   example: true
  // })
  // @IsOptional()
  // @Type(() => Boolean)
  // isValidated?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by validation status',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' ? true : value === 'false' ? false : undefined)
  isValidated?: boolean;

}

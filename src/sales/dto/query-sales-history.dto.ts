import { IsOptional, IsString, IsEnum, IsDateString, IsInt, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum SaleHistoryAction {
  SALE_CREATED = 'SALE_CREATED',
  SALE_UPDATED = 'SALE_UPDATED',
  SALE_CANCELLED = 'SALE_CANCELLED',
  SALE_COMPLETED = 'SALE_COMPLETED',
  SALE_RETURNED = 'SALE_RETURNED',
  SALE_PARTIAL_RETURN = 'SALE_PARTIAL_RETURN',
  INVENTORY_UPDATED = 'INVENTORY_UPDATED',
  PAYMENT_PROCESSED = 'PAYMENT_PROCESSED',
  PAYMENT_REFUNDED = 'PAYMENT_REFUNDED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  ORDER_PROCESSED = 'ORDER_PROCESSED',
  ITEM_ADDED = 'ITEM_ADDED',
  ITEM_REMOVED = 'ITEM_REMOVED',
  CUSTOMER_UPDATED = 'CUSTOMER_UPDATED',
  NOTE_ADDED = 'NOTE_ADDED',
}

export class QuerySalesHistoryDto {
  @ApiPropertyOptional({ 
    description: 'Page number for pagination (starts from 1)',
    minimum: 1,
    default: 1 
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ 
    description: 'Number of records per page',
    minimum: 1,
    maximum: 100,
    default: 20 
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ 
    description: 'Search term for sale ID, customer name, or action description',
    example: 'payment' 
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  search?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by specific sale ID',
    example: 'uuid-here' 
  })
  @IsOptional()
  @IsString()
  saleId?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by specific store ID',
    example: 'uuid-here' 
  })
  @IsOptional()
  @IsString()
  storeId?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by specific user ID who performed the action',
    example: 'uuid-here' 
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by specific action type',
    enum: SaleHistoryAction,
    example: SaleHistoryAction.PAYMENT_PROCESSED 
  })
  @IsOptional()
  @IsEnum(SaleHistoryAction)
  action?: SaleHistoryAction;

  @ApiPropertyOptional({ 
    description: 'Start date for filtering (ISO string)',
    example: '2024-01-01T00:00:00Z' 
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ 
    description: 'End date for filtering (ISO string)',
    example: '2024-12-31T23:59:59Z' 
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ 
    description: 'Sort field for results',
    enum: ['createdAt', 'action', 'saleId'],
    default: 'createdAt' 
  })
  @IsOptional()
  @IsString()
  sortBy?: 'createdAt' | 'action' | 'saleId' = 'createdAt';

  @ApiPropertyOptional({ 
    description: 'Sort order for results',
    enum: ['asc', 'desc'],
    default: 'desc' 
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}

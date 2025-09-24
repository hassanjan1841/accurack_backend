import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsArray,
  ValidateNested,
  Min
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PackType, ReturnCategory } from '@prisma/client';

export class ReturnItemDto {
  @ApiProperty({ description: 'Product ID being returned' })
  @IsString()
  productId: string;

  @ApiPropertyOptional({ description: 'Product or variant PLU/UPC code' })
  @IsOptional()
  @IsString()
  pluUpc?: string;

  @ApiProperty({ description: 'Quantity being returned', minimum: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ enum: PackType, description: 'Type of pack being returned' })
  @IsEnum(PackType)
  packType: PackType;

  @ApiPropertyOptional({ description: 'Pack ID when returning packs' })
  @IsOptional()
  @IsString()
  packId?: string;

  @ApiProperty({ description: 'Whether items are physically returned' })
  @IsBoolean()
  isProductReturned: boolean;

  @ApiProperty({ enum: ReturnCategory, description: 'Category of returned items' })
  @IsEnum(ReturnCategory)
  returnCategory: ReturnCategory;

  @ApiPropertyOptional({ description: 'Reason for return' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiProperty({ description: 'Refund amount for this item', minimum: 0 })
  @IsNumber()
  @Min(0)
  refundAmount: number;

  @ApiProperty({ description: 'Refund amount type for this item' })
  @IsString()
  refundAmountType: string;
}

export class CreateSaleReturnDto {
  @ApiProperty({ description: 'Sale ID being returned' })
  @IsString()
  saleId: string;

  @ApiProperty({ description: 'Store ID to verify sale ownership' })
  @IsString()
  storeId: string;

  @ApiProperty({ type: [ReturnItemDto], description: 'Items being returned' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReturnItemDto)
  returnItems: ReturnItemDto[];
}

export class QueryReturnSalesDto {
  @ApiProperty({ description: 'Store ID to filter returns' })
  @IsString()
  storeId: string;

  @ApiPropertyOptional({ description: 'Page number for pagination', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ description: 'Number of items per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;

  @ApiPropertyOptional({ enum: ReturnCategory, description: 'Category of returned items' })
  @IsOptional()
  @IsEnum(ReturnCategory)
  returnCategory?: ReturnCategory;
}

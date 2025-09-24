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
import { PaymentMethod, SaleStatus, PackType } from '@prisma/client';

export class SaleItemDto {
  @ApiProperty({ description: 'Product ID' })
  @IsString()
  productId: string;

  @ApiPropertyOptional({ description: 'Product or variant PLU/UPC code' })
  @IsOptional()
  @IsString()
  pluUpc?: string;

  @ApiProperty({ description: 'Quantity to sell', minimum: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ enum: PackType, description: 'Type of pack - ITEM for single items, BOX for packs' })
  @IsEnum(PackType)
  packType: PackType;

  @ApiPropertyOptional({ description: 'Pack ID when packType is BOX' })
  @IsOptional()
  @IsString()
  packId?: string;
}

export class UpdateSaleDto {
  @ApiPropertyOptional({ enum: PaymentMethod, description: 'Updated payment method' })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ description: 'Updated total amount', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalAmount?: number;

  @ApiPropertyOptional({ description: 'Updated tax amount', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  tax?: number;

  @ApiPropertyOptional({ description: 'Updated allowance/discount', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  allowance?: number;

  @ApiPropertyOptional({ type: [SaleItemDto], description: 'Updated sale items' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  saleItems?: SaleItemDto[];

  @ApiPropertyOptional({ enum: SaleStatus, description: 'Updated sale status' })
  @IsOptional()
  @IsEnum(SaleStatus)
  status?: SaleStatus;

  @ApiPropertyOptional({ description: 'Updated cashier name' })
  @IsOptional()
  @IsString()
  cashierName?: string;
}

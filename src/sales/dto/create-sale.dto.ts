import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PackType, PaymentMethod, InvoiceSource } from '@prisma/client';

export { PackType, PaymentMethod, InvoiceSource } from '@prisma/client';

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

  @ApiPropertyOptional({
    description: 'allowance per sale item',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  allowance?: number;

  @ApiProperty({
    enum: PackType,
    description: 'Type of pack - ITEM for single items, BOX for packs',
  })
  @IsEnum(PackType)
  packType: PackType;

  @ApiPropertyOptional({ description: 'Pack ID when packType is BOX' })
  @IsOptional()
  @IsString()
  packId?: string;


  @ApiPropertyOptional({ description: 'Items in Pack when packType is BOX' })
  @IsOptional()
  @IsNumber()
  packOf?: number;
}

export class CreateSaleDto {
  @ApiPropertyOptional({ description: 'Customer phone number for identification' })
  @IsOptional()
  @IsString()
  customerPhoneNumber?: string;

  @ApiPropertyOptional({ description: 'Customer name (for new customers)' })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional({ description: 'Sale Draft Id' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional({ description: 'Customer e-mail (for new customers)' })
  @IsOptional()
  @IsString()
  customerMail?: string;

  @ApiPropertyOptional({ description: 'Customer address (for new customers)' })
  @IsOptional()
  @IsString()
  customerAddress?: string;

  @ApiPropertyOptional({ description: 'Customer country (for new customers)' })
  @IsOptional()
  @IsString()
  customerCountry?: string;

  @ApiPropertyOptional({ description: 'Customer city (for new customers)' })
  @IsOptional()
  @IsString()
  customerCity?: string;

  @ApiPropertyOptional({ description: 'Customer State (for new customers)' })
  @IsOptional()
  @IsString()
  customerState?: string;

  @ApiPropertyOptional({
    description: 'Customer postal code (for new customers)',
  })
  @IsOptional()
  @IsString()
  customerZipCode?: string;

  @ApiPropertyOptional({
    description: 'Customer street address (for new customers)',
  })
  @IsOptional()
  @IsString()
  customerStreet?: string;

  @ApiProperty({ description: 'Store ID where sale occurs' })
  @IsString()
  storeId: string;

  @ApiProperty({ description: 'Client ID owning the store' })
  @IsString()
  clientId: string;

  @ApiProperty({ type: [SaleItemDto], description: 'List of items being sold' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  saleItems: SaleItemDto[];

  @ApiProperty({ enum: PaymentMethod, description: 'Payment method used' })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiProperty({ enum: InvoiceSource, description: 'Source of the sale' })
  @IsEnum(InvoiceSource)
  source: InvoiceSource;

  @ApiProperty({ description: 'Total amount of the sale', minimum: 0 })
  @IsNumber()
  @Min(0)
  totalAmount: number;

  @ApiPropertyOptional({ description: 'Sub total amount of the sale', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  subTotalAmount: number;
  
  @ApiPropertyOptional({ description: 'Tax amount', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  tax?: number;

  @ApiPropertyOptional({
    description: 'Discount/allowance on total sale',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @ApiPropertyOptional({
    description: 'Whether to generate invoice',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  generateInvoice?: boolean;

  @ApiPropertyOptional({ description: 'Include business info in invoice' })
  @IsOptional()
  @IsBoolean()
  businessInfo?: boolean;

  @ApiPropertyOptional({ description: 'Cashier name' })
  @IsOptional()
  @IsString()
  cashierName?: string;

  // Shipping Address Fields
  @ApiPropertyOptional({ description: 'Shipping address line' })
  @IsOptional()
  @IsString()
  shippingAddress?: string;

  @ApiPropertyOptional({ description: 'Shipping country' })
  @IsOptional()
  @IsString()
  shippingCountry?: string;

  @ApiPropertyOptional({ description: 'Shipping city' })
  @IsOptional()
  @IsString()
  shippingCity?: string;

  @ApiPropertyOptional({ description: 'Shipping state' })
  @IsOptional()
  @IsString()
  shippingState?: string;

  @ApiPropertyOptional({ description: 'Shipping zip/postal code' })
  @IsOptional()
  @IsString()
  shippingZipCode?: string;

  @ApiPropertyOptional({ description: 'Shipping street address' })
  @IsOptional()
  @IsString()
  shippingStreet?: string;

  // Driver Assignment Fields
  @ApiPropertyOptional({
    description: 'Assign driver to this sale for immediate delivery',
  })
  @IsOptional()
  @IsString()
  assignedDriverId?: string;

  @ApiPropertyOptional({ description: 'Assigned driver name' })
  @IsOptional()
  @IsString()
  assignedDriverName?: string;

  @ApiPropertyOptional({
    description: 'Use customer address as shipping address',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  useCustomerAddress?: boolean;
}

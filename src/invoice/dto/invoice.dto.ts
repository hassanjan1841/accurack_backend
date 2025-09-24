

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CustomFieldDto {
  @ApiProperty({ example: 'VAT Number', description: 'Custom field name' })
  @IsString()
  name: string;

  @ApiProperty({ example: '123456789', description: 'Custom field value' })
  @IsString()
  value: string;
}

export class CreateInvoiceDto {
  @ApiProperty({ example: 'sale-uuid-123', description: 'Sale ID for which to generate the invoice' })
  @IsString()
  saleId: string;

  //adding invoincenumbe dto
  @ApiProperty({ example: 'INV-2025-001', description: 'Invoice number' })
  @IsString()
  invoiceNumber: string;

  // Business Name
  @ApiPropertyOptional({ example: 'ABC Corp', description: 'Business name' })
  @IsOptional()
  @IsString()
  businessName?: string;

  // Business address
  @ApiPropertyOptional({ example: '123 Main St, Springfield', description: 'Business address' })
  @IsOptional()
  @IsString()
  businessAddress?: string;

  // Business Contact dto
  @ApiPropertyOptional({ example: '555-1234', description: 'Business contact number' })
  @IsOptional()
  @IsString()
  businessContact?: string;

  // Business website dto
  @ApiPropertyOptional({ example: 'https://abc.com', description: 'Business website' })
  @IsOptional()
  @IsString()
  businessWebsite?: string;

  // Logo url
  @ApiPropertyOptional({ example: 'https://abc.com/logo.png', description: 'Business logo URL' })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  // Customer Name
  @ApiPropertyOptional({ example: 'ABC Corp', description: 'Customer name' })
  @IsOptional()
  @IsString()
  customerName?: string;

  // Customer address
  @ApiPropertyOptional({ example: '123 Main St, Springfield', description: 'Customer address' })
  @IsOptional()
  @IsString()
  customerAddress?: string;

  // Customer Contact dto
  @ApiPropertyOptional({ example: '555-1234', description: 'Customer contact number' })
  @IsOptional()
  @IsString()
  customerPhone?: string;

  // Customer email dto
  @ApiPropertyOptional({ example: 'customer@email.com', description: 'Customer email' })
  @IsOptional()
  @IsString()
  customerMail?: string;

  @ApiPropertyOptional({
    type: [CustomFieldDto],
    description: 'Optional custom fields for the invoice',
    example: [
      { name: 'VAT Number', value: '123456789' },
      { name: 'PO Number', value: 'PO-2025-001' },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomFieldDto)
  customFields?: CustomFieldDto[];
}

export class businessInfoDto {
  @ApiProperty({ example: 'abcaas', description: 'Business name for the invoice' })
  @IsString()
  businessName: string;

  @ApiProperty({ example: '56788989', description: 'Business contactNo' })
  @IsString()
  contactNo: string;

  @ApiProperty({ example: 'abcaas', description: 'Business website' })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiProperty({ example: 'abcaas', description: 'Business address' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'https://example.com/logo.png', description: 'Optional logo URL for the invoice' })
  @IsOptional()
  @IsString()
  logoUrl?: string;
}

export class UpdateBusinessInfoDto {
  @ApiPropertyOptional({ example: 'Updated Business Name', description: 'Updated business name' })
  @IsOptional()
  @IsString()
  businessName?: string;

  @ApiPropertyOptional({ example: '987654321', description: 'Updated business contact number' })
  @IsOptional()
  @IsString()
  contactNo?: string;

  @ApiPropertyOptional({ example: 'https://updated-website.com', description: 'Updated business website' })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional({ example: '456 New Street, Updated City', description: 'Updated business address' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'https://example.com/new-logo.png', description: 'Updated logo URL for the business' })
  @IsOptional()
  @IsString()
  logoUrl?: string;
}

export class UpdateInvoiceDto {
  @ApiPropertyOptional({ example: 'John Doe', description: 'Customer name' })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional({ example: '+1234567890', description: 'Customer phone' })
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiPropertyOptional({ example: 'customer@email.com', description: 'Customer email' })
  @IsOptional()
  @IsString()
  customerMail?: string;

  @ApiPropertyOptional({ example: 'https://customer.com', description: 'Customer website' })
  @IsOptional()
  @IsString()
  customerWebsite?: string;

  @ApiPropertyOptional({ example: '123 Main St', description: 'Customer address' })
  @IsOptional()
  @IsString()
  customerAddress?: string;

  @ApiPropertyOptional({ example: 'Acme Corp', description: 'Business name' })
  @IsOptional()
  @IsString()
  businessName?: string;

  @ApiPropertyOptional({ example: '+1987654321', description: 'Business contact' })
  @IsOptional()
  @IsString()
  businessContact?: string;

  @ApiPropertyOptional({ example: 'https://business.com', description: 'Business website' })
  @IsOptional()
  @IsString()
  businessWebsite?: string;

  @ApiPropertyOptional({ example: '456 Business Rd', description: 'Business address' })
  @IsOptional()
  @IsString()
  businessAddress?: string;

  @ApiPropertyOptional({ example: 'https://business.com/logo.png', description: 'Business logo URL' })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional({ example: '789 Shipping Ln', description: 'Shipping address' })
  @IsOptional()
  @IsString()
  shippingAddress?: string;
}
import {
  IsUUID,
  IsString,
  IsNumber,
  IsOptional,
  IsEmail,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';


export enum SaleStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_RETURNED = 'PARTIALLY_RETURNED',
  CONFIRMED = 'CONFIRMED',
  SHIPPED = 'SHIPPED',
}


export enum PaymentStatus {
  PAID = 'PAID',
  PARTIAL = 'PARTIAL',
  UNPAID = 'UNPAID',
  OVERDUE = 'OVERDUE',
}

export class CreateCustomerDto {
  @ApiProperty({ description: 'Customer name' })
  @IsString()
  customerName: string;

  @ApiProperty({ description: 'Customer Street address' })
  @IsOptional()
  @IsString()
  customerStreetAddress: string;

  @ApiProperty({ description: 'Customer County' })
  @IsOptional()
  @IsString()
  country: string;

  @ApiProperty({ description: 'Customer State' })
  @IsOptional()
  @IsString()
  state: string;

  @ApiProperty({ description: 'Customer City' })
  @IsOptional()
  @IsString()
  city: string;

  @ApiProperty({ description: 'Customer Zip Code' })
  @IsOptional()
  @IsString()
  zipCode: string;

  @ApiProperty({ description: 'Phone number' })
  @IsString()
  phoneNumber: string;

  @ApiPropertyOptional({ description: 'Telephone number' })
  @IsOptional()
  @IsString()
  telephoneNumber?: string;

  @ApiPropertyOptional({ description: 'Customer email' })
  @IsOptional()
  @IsEmail()
  customerMail?: string;

  @ApiProperty({ description: 'Store ID' })
  @IsUUID()
  storeId: string;

  @ApiProperty({ description: 'Client ID' })
  @IsUUID()
  clientId: string;
}

export class UpdateCustomerDto {
  @ApiPropertyOptional({ description: 'Customer name' })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional({ description: 'Customer street address' })
  @IsOptional()
  @IsString()
  customerStreetAddress?: string;

  @ApiPropertyOptional({ description: 'Country' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ description: 'State' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ description: 'City' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'Zip code' })
  @IsOptional()
  @IsString()
  zipCode?: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional({ description: 'Telephone number' })
  @IsOptional()
  @IsString()
  telephoneNumber?: string;

  @ApiPropertyOptional({ description: 'Customer email' })
  @IsOptional()
  @IsEmail()
  customerMail?: string;

  @ApiPropertyOptional({ description: 'Website' })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional({ description: 'Threshold amount' })
  @IsOptional()
  @IsNumber()
  threshold?: number;
}


export class InvoiceQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsNumber()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Limit per page', default: 20 })
  @IsOptional()
  @IsNumber()
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Customer ID filter' })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Date from (ISO string)' })
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Date to (ISO string)' })
  @IsOptional()
  @IsString()
  dateTo?: string;
}

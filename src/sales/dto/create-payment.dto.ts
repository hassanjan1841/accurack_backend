import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  IsUUID,
  IsPositive,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import { Transform } from 'class-transformer';

export class CreatePaymentDto {
  @ApiProperty({ description: 'Customer ID making the payment' })
  @IsString()
  customerId: string;

  @ApiProperty({
    description: 'Store ID for making the payment in the customer store',
  })
  @IsString()
  storeId: string;

  @ApiPropertyOptional({ description: 'Sale ID being paid for (optional)' })
  @IsOptional()
  @IsString()
  saleId?: string;

  @ApiProperty({ description: 'Amount being paid', minimum: 0 })
  @IsNumber()
  @Min(0)
  amountPaid: number;

  @ApiPropertyOptional({ description: 'Payment description or notes' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: PaymentMethod, description: 'Payment method used' })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;
}


export class AddInitialBalanceDto {
  @ApiProperty({ description: 'Customer ID' })
  @IsUUID()
  customerId: string;

  @ApiProperty({
    description: 'Store ID for making the payment in the customer store',
  })
  @IsString()
  storeId: string;

  @ApiProperty({ description: 'Initial balance amount', minimum: 0 })
  @Transform(({ value }) => {
    if (value === null || value === undefined || value === '') return undefined;
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(num) ? undefined : num;
  })
  @IsNumber({}, { message: 'Initial balance must be a valid number' })
  @Min(0, { message: 'Initial balance cannot be negative' })
  initialBalance: number;

  @ApiPropertyOptional({ description: 'Payment description' })
  @IsOptional()
  @IsString()
  description?: string;
}

import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ValidateOrderProcessingDto {
  @ApiProperty({
    description: 'Whether the order is validated/approved',
    example: true
  })
  @IsBoolean()
  isValidated: boolean;

  @ApiPropertyOptional({
    description: 'Validation notes or comments',
    example: 'All items verified and inventory confirmed'
  })
  @IsOptional()
  @IsString()
  validationNotes?: string;

  @ApiPropertyOptional({
    description: 'Reason for rejection if not validated',
    example: 'Insufficient inventory for requested items'
  })
  @IsOptional()
  @IsString()
  rejectionReason?: string;

  @ApiPropertyOptional({
    description: 'Additional validation metadata',
    example: { inventoryChecked: true, paymentVerified: true, timestamp: '2025-07-25T10:30:00Z' }
  })
  @IsOptional()
  metadata?: any;
}

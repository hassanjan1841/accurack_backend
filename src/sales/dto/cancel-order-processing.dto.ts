import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CancelOrderProcessingDto {
  @ApiProperty({ example: 'Customer requested cancellation', required: false })
  @IsString()
  cancellationReason?: string;
}

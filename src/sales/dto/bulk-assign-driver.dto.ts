import { IsString, IsArray, ArrayMinSize, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DriverType } from '@prisma/client';

export class BulkAssignDriverDto {
  @ApiProperty({
    description: 'Array of sale IDs to assign to driver',
    type: [String],
    example: ['sale-uuid-1', 'sale-uuid-2', 'sale-uuid-3'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  saleIds: string[];

  @ApiProperty({
    description: 'Driver ID to assign the sales to',
    example: 'user-uuid-driver',
  })
  @IsString()
  driverId: string;

  @ApiProperty({
    description: 'Driver name for reference',
    example: 'John Smith',
  })
  @IsString()
  driverName: string;

  @ApiProperty({ enum: DriverType, description: 'Driver used' })
  @IsEnum(DriverType)
  driverType: DriverType;
}

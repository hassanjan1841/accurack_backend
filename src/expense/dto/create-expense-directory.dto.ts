import { ApiProperty,   } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional , IsUUID } from 'class-validator';

export class CreateExpenseDirectoryDto {
  @ApiProperty({
    description: 'Name of the directory',
    example: 'Root Directory',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Description of the directory',
    example: 'A root-level directory',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Parent directory ID (optional for root-level directories)',
    example: 'parent-dir-1',
    required: false,
  })
  @IsString()
  @IsOptional()
  parentId?: string;


  @ApiProperty({
    description: 'Store Id',
    example: 'uuid',
    required: true,
  })
  @IsUUID()
  storeId: string;
}
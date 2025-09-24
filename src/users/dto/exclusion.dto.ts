import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ExclusionFeatureDto {
  @ApiProperty({ example: 'product', description: 'Resource name to exclude' })
  @IsString()
  @IsNotEmpty()
  resource: string;

  @ApiProperty({ example: 'delete', description: 'Action name to exclude' })
  @IsString()
  @IsNotEmpty()
  action: string;
}

export class AddExclusionDto {
  @ApiProperty({
    type: [ExclusionFeatureDto],
    description: 'List of features to exclude',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExclusionFeatureDto)
  features: ExclusionFeatureDto[];
}

export class RemoveExclusionDto {
  @ApiProperty({
    type: [ExclusionFeatureDto],
    description: 'List of features to remove from exclusion',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExclusionFeatureDto)
  features: ExclusionFeatureDto[];
}

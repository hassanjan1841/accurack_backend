import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EntityType } from '@prisma/client';
import {
  IsEnum,
  IsString,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  IsObject,
  IsOptional,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AssignTaxDto {
  @ApiProperty({
    enum: EntityType,
    description:
      'Type of entity (PRODUCT, CATEGORY, SUPPLIER, STORE, CUSTOMER)',
    example: EntityType.PRODUCT,
  })
  @IsEnum(EntityType)
  entityType: EntityType;

  @ApiProperty({
    description: 'ID of the entity to assign tax to',
    example: 'uuid-of-entity',
  })
  @IsString()
  entityId: string;

  @ApiProperty({
    description: 'ID of the tax rate to assign',
    example: 'uuid-of-tax-rate',
  })
  @IsString()
  taxRateId: string;

  @ApiPropertyOptional({
    description: 'Full entity object (stored as JSON)',
    example: {
      name: 'Coffee Beans',
      sku: 'CB-001',
      price: 29.99,
    },
  })
  @IsOptional()
  @IsObject()
  entity?: Record<string, any>;

}

export class BulkAssignTaxDto {
  @ApiProperty({ type: [AssignTaxDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AssignTaxDto)
  assignments: AssignTaxDto[];
}

class TaxAssignmentInput {
  @ApiProperty({ enum: EntityType, description: 'Entity type (PRODUCT, CATEGORY, etc.)' })
  @IsEnum(EntityType)
  entityType: EntityType;

  @ApiProperty({ description: 'Entity ID' })
  @IsString()
  entityId: string;

  @ApiProperty({
    description: 'Optional JSON object representing the entity details',
    required: false,
  })
  @IsOptional()
  entity?: object;

  @ApiProperty({
    description: 'Date when the tax was assigned',
    required: false,
  })
  @IsOptional()
  assignedAt?: Date;
}

export class UpdateBulkTaxAssignmentsDto {
  @ApiProperty({
    description: 'Tax Rate ID for which to update all assignments',
    example: 'e8d390bd-bb94-45cc-9c9b-2f51a75c2021',
  })
  @IsString()
  taxRateId: string;

  @ApiProperty({
    description: 'List of tax assignments to replace existing ones for the tax rate',
    type: [TaxAssignmentInput],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TaxAssignmentInput)
  assignments: TaxAssignmentInput[];
}



import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsUUID, IsArray, IsBoolean, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export enum ExpenseColumnType {
  STRING = 'STRING',
  PHONE = 'PHONE',
  LABEL = 'LABEL',
  SHORT_TEXT = 'SHORT_TEXT',
  NUMBER = 'NUMBER',
  DATE = 'DATE',
  EMAIL = 'EMAIL',
  CURRENCY = 'CURRENCY',
}

export class ExpenseColumnDefinition {
  @ApiProperty({ description: 'Column name', example: 'Amount' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Column type',
    example: 'NUMBER',
    enum: ExpenseColumnType,
  })
  @IsEnum(ExpenseColumnType)
  columnType: ExpenseColumnType;

  @ApiProperty({ description: 'Is required field', example: true })
  @IsBoolean()
  isRequired: boolean;

  @ApiProperty({ description: 'Enable auto sum for number columns', example: true })
  @IsBoolean()
  hasAutoSum: boolean;

  @ApiPropertyOptional({ description: 'Column metadata' })
  @IsOptional()
  metadata?: any;
}

export class ExpenseEntryData {
  @ApiProperty({ description: 'Entry ID', example: 'uuid-string' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: 'Row values mapped by column name',
    example: { 'Item Name': 'Office Chair', 'Amount': '299.99' },
  })
  values: Record<string, string>;

  @ApiPropertyOptional({ description: 'Entry status', example: 'DRAFT' })
  @IsString()
  @IsOptional()
  status?: string;
}

export class CreateExpenseSheetDto {
  /**
   * IMPORTANT: Columns must include all names used in entry values.
   * Example:
   * columns: [
   *   { name: 'Item Name', columnType: 'STRING', isRequired: true, hasAutoSum: false },
   *   { name: 'Amount', columnType: 'NUMBER', isRequired: true, hasAutoSum: true }
   * ]
   * entries: [
   *   { id: 'uuid', values: { 'Item Name': 'Office Chair', 'Amount': '299.99' }, status: 'DRAFT' }
   * ]
   */
  @ApiProperty({ description: 'Sheet name', example: 'January Office Supplies' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Sheet description',
    example: 'Office supplies purchased in January',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Directory ID where sheet will be created',
    example: 'uuid-string',
  })
  @IsUUID()
  @IsNotEmpty()
  directoryId: string;

  @ApiProperty({
    description: 'Column definitions',
    type: [ExpenseColumnDefinition],
  })
  @IsArray()
  @Type(() => ExpenseColumnDefinition)
  columns: ExpenseColumnDefinition[];

  @ApiProperty({
    description: 'All entry data',
    type: [ExpenseEntryData],
  })
  @IsArray()
  @Type(() => ExpenseEntryData)
  entries: ExpenseEntryData[];
}

export class UpdateExpenseSheetDto {
  @ApiPropertyOptional({ description: 'Sheet name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Sheet description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Column definitions',
    type: [ExpenseColumnDefinition],
  })
  @IsArray()
  @IsOptional()
  @Type(() => ExpenseColumnDefinition)
  columns?: ExpenseColumnDefinition[];

  @ApiPropertyOptional({
    description: 'All entry data',
    type: [ExpenseEntryData],
  })
  @IsArray()
  @IsOptional()
  @Type(() => ExpenseEntryData)
  entries?: ExpenseEntryData[];

  @ApiPropertyOptional({ description: 'Archive status' })
  @IsBoolean()
  @IsOptional()
  isArchived?: boolean;
}
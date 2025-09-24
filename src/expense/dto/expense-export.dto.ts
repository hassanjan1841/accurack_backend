import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export enum ExportFormat {
  CSV = 'csv',
  XLSX = 'xlsx',
}

export class ExportExpenseSheetDto {
  @ApiProperty({
    description: 'Export format',
    enum: ExportFormat,
    default: ExportFormat.CSV,
  })
  @IsEnum(ExportFormat)
  format: ExportFormat;
}

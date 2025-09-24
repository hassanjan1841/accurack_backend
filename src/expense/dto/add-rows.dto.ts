import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';


export class AddRowsSheetDto {
  @ApiProperty({ example: 'sheet-uuid' })
  @IsString()
  sheetId: string;

  @ApiProperty({
    description: 'Array of row objects with dynamic column keys',
    example: [
      { "Item Name": 10, "amount": 20 },
      { "Product": "Laptop", "price": 1500 }
    ],
    type: 'array',
    items: {
      type: 'object',
      additionalProperties: { type: 'any' }
    }
  })
  @IsArray()
  rows: Record<string, any>[];
}

export class AddRowsDto {
  @ApiProperty({ type: [AddRowsSheetDto], description: 'Array of sheet rows to add (for multi-sheet)' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddRowsSheetDto)
  sheets: AddRowsSheetDto[];
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class UpdateExpenseDirectoryDto {
  @ApiPropertyOptional({ description: 'Directory name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Directory description' })
  @IsString()
  @IsOptional()
  description?: string;
}
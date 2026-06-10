import {
  IsArray, IsEnum, IsInt, IsOptional, IsString, Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { InventoryCategory } from '@prisma/client';

export class CreateInventoryItemDto {
  @ApiProperty({ example: 'INV-LPT-001' })
  @IsString()
  code: string;

  @ApiProperty({ example: 'Laptop Client Lenovo ThinkPad' })
  @IsString()
  name: string;

  @ApiProperty({ enum: InventoryCategory })
  @IsEnum(InventoryCategory)
  category: InventoryCategory;

  @ApiProperty({ example: 100 })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  standardQty: number;
}

export class InventoryChecklistDto {
  @ApiProperty()
  @IsString()
  locationId: string;

  @ApiProperty()
  @IsString()
  itemId: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  expectedQty: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  receivedQty: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  damagedQty: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  missingQty: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  photos?: string[];
}

export class UpdateInventoryChecklistDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  receivedQty?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  damagedQty?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  missingQty?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  photos?: string[];
}

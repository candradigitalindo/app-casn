import { IsEnum, IsInt, IsOptional, IsString, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ItemOwnership, ItemCondition } from '@prisma/client';

export class CreateLocationItemDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  qty: number;

  @ApiProperty({ example: 'unit' })
  @IsString()
  unit: string;

  @ApiPropertyOptional({ enum: ItemOwnership })
  @IsOptional()
  @IsEnum(ItemOwnership)
  ownership?: ItemOwnership;

  @ApiPropertyOptional({ enum: ItemCondition })
  @IsOptional()
  @IsEnum(ItemCondition)
  condition?: ItemCondition;

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  installationPct?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

// PartialType: PATCH boleh parsial (mis. hanya installationPct atau condition)
export class UpdateLocationItemDto extends PartialType(CreateLocationItemDto) {}

export class UpdateCapacityDto {
  @ApiProperty({ example: 200 })
  @IsInt()
  @Min(0)
  @Type(() => Number)
  capacity: number;
}

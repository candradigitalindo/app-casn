import {
  IsArray, IsEnum, IsOptional, IsString, ValidateNested,
  IsInt, Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ShipmentStatus } from '@prisma/client';
import { PaginationDto } from '../../../common/dto/pagination.dto';

class ManifestItemDto {
  @ApiProperty()
  @IsString()
  itemId: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  qty: number;
}

export class CreateShipmentDto {
  @ApiProperty()
  @IsString()
  originWarehouseId: string;

  @ApiProperty()
  @IsString()
  destinationLocationId: string;

  @ApiProperty({ type: [ManifestItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ManifestItemDto)
  manifestItems: ManifestItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  trackingNotes?: string;
}

export class UpdateShipmentDto {
  @ApiPropertyOptional({ enum: ShipmentStatus })
  @IsOptional()
  @IsEnum(ShipmentStatus)
  status?: ShipmentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  trackingNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  receivedBy?: string;
}

export class QueryShipmentDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ShipmentStatus })
  @IsOptional()
  @IsEnum(ShipmentStatus)
  status?: ShipmentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  destinationLocationId?: string;
}

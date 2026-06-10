import {
  IsEnum, IsInt, IsNumber, IsOptional, IsString, Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { LocationStatus } from '@prisma/client';

export class CreateLocationDto {
  @ApiProperty({ example: 'LOC-JKT-001' })
  @IsString()
  code: string;

  @ApiProperty({ example: 'Gedung A BPSDM DKI Jakarta' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'DKI Jakarta' })
  @IsString()
  province: string;

  @ApiProperty({ example: 'Jakarta Pusat' })
  @IsString()
  city: string;

  @ApiProperty({ example: 'Jl. Medan Merdeka Barat No.8' })
  @IsString()
  address: string;

  @ApiProperty({ example: -6.1751 })
  @IsNumber()
  @Type(() => Number)
  latitude: number;

  @ApiProperty({ example: 106.8272 })
  @IsNumber()
  @Type(() => Number)
  longitude: number;

  @ApiPropertyOptional({ enum: LocationStatus, default: LocationStatus.PREPARATION })
  @IsOptional()
  @IsEnum(LocationStatus)
  status?: LocationStatus;

  @ApiPropertyOptional({ example: 200 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  capacity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coordinatorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endDate?: string;
}

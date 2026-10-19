import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ItemOwnership, RegencyType, SarprasCategory } from '@prisma/client';

export class CreateProvinceDto {
  @ApiProperty({ example: '11' }) @IsString() @MinLength(1) code: string;
  @ApiProperty({ example: 'Aceh' }) @IsString() @MinLength(2) name: string;
}

export class UpdateProvinceDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(1) code?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(2) name?: string;
}

export class CreateRegencyDto {
  @ApiProperty({ example: '11.01' }) @IsString() @MinLength(1) code: string;
  @ApiProperty({ example: 'Kabupaten Aceh Selatan' }) @IsString() @MinLength(2) name: string;
  @ApiProperty({ enum: RegencyType }) @IsEnum(RegencyType) type: RegencyType;
  @ApiProperty() @IsUUID() provinceId: string;
}

export class UpdateRegencyDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(1) code?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(2) name?: string;
  @ApiPropertyOptional({ enum: RegencyType }) @IsOptional() @IsEnum(RegencyType) type?: RegencyType;
  @ApiPropertyOptional() @IsOptional() @IsUUID() provinceId?: string;
}

// ── Master Item Sarana Prasarana (Lampiran E Kepsesma 240/2026) ──

export class CreateMasterItemDto {
  @ApiProperty({ example: 1, description: 'Nomor urut sesuai Lampiran E' })
  @IsInt() @Min(1) no: number;

  @ApiProperty({ example: 'Laptop client untuk peserta ujian termasuk jaringan LAN dan elektrikal' })
  @IsString() @MinLength(3) name: string;

  @ApiProperty({ example: 'unit' }) @IsString() @MinLength(1) unit: string;

  @ApiPropertyOptional({ enum: ItemOwnership })
  @IsOptional() @IsEnum(ItemOwnership) ownership?: ItemOwnership;

  @ApiPropertyOptional({ enum: SarprasCategory, description: 'Sarpras IT / Sarpras Non IT — dasar pemetaan vendor' })
  @IsOptional() @IsEnum(SarprasCategory) category?: SarprasCategory;

  @ApiProperty({ example: 100 }) @IsInt() @Min(0) qty100: number;
  @ApiProperty({ example: 200 }) @IsInt() @Min(0) qty200: number;
  @ApiProperty({ example: 300 }) @IsInt() @Min(0) qty300: number;
  @ApiProperty({ example: 400 }) @IsInt() @Min(0) qty400: number;
  @ApiProperty({ example: 500 }) @IsInt() @Min(0) qty500: number;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateMasterItemDto {
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) no?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(3) name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(1) unit?: string;
  @ApiPropertyOptional({ enum: ItemOwnership })
  @IsOptional() @IsEnum(ItemOwnership) ownership?: ItemOwnership;
  @ApiPropertyOptional({ enum: SarprasCategory })
  @IsOptional() @IsEnum(SarprasCategory) category?: SarprasCategory;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) qty100?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) qty200?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) qty300?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) qty400?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) qty500?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

// ── Master Kebutuhan Tenaga Teknis per tier (huruf D.4.e Kepsesma 240/2026) ──

export class CreatePersonnelRequirementDto {
  @ApiProperty({ example: 100, description: 'Jumlah peserta per sesi (tier)' })
  @IsInt() @Min(1) capacity: number;

  @ApiProperty({ example: 1 }) @IsInt() @Min(0) koordinator: number;
  @ApiProperty({ example: 1 }) @IsInt() @Min(0) tenagaIt: number;
  @ApiProperty({ example: 1 }) @IsInt() @Min(0) elektrikal: number;
  @ApiProperty({ example: 1 }) @IsInt() @Min(0) sarpras: number;
}

export class UpdatePersonnelRequirementDto {
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) capacity?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) koordinator?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) tenagaIt?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) elektrikal?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) sarpras?: number;
}

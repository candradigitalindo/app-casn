import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PriceUnit, SarprasCategory } from '@prisma/client';

export class CreateVendorDto {
  @ApiProperty({ example: 'CV Sumber IT Medan' })
  @IsString() @MinLength(2) name: string;

  @ApiProperty({ enum: SarprasCategory, isArray: true, example: ['SARPRAS_IT'] })
  @IsArray() @ArrayNotEmpty() @IsEnum(SarprasCategory, { each: true })
  categories: SarprasCategory[];

  @ApiPropertyOptional() @IsOptional() @IsString() npwp?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() nib?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() kbli?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;

  @ApiPropertyOptional({ description: 'Provinsi domisili' })
  @IsOptional() @IsUUID() provinceId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() picName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() picPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional() @IsInt() @Min(1) @Max(5) rating?: number;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;

  @ApiPropertyOptional({
    description: 'Daftar provinceId cakupan wilayah (replace-all)',
    type: [String],
  })
  @IsOptional() @IsArray() @IsUUID(undefined, { each: true })
  coverageProvinceIds?: string[];
}

export class UpdateVendorDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(2) name?: string;

  @ApiPropertyOptional({ enum: SarprasCategory, isArray: true })
  @IsOptional() @IsArray() @ArrayNotEmpty() @IsEnum(SarprasCategory, { each: true })
  categories?: SarprasCategory[];

  @ApiPropertyOptional() @IsOptional() @IsString() npwp?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() nib?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() kbli?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() provinceId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() picName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() picPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(5) rating?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @IsUUID(undefined, { each: true })
  coverageProvinceIds?: string[];
}

export class SetCoveragesDto {
  @ApiProperty({ type: [String], description: 'Daftar provinceId cakupan (replace-all)' })
  @IsArray() @IsUUID(undefined, { each: true })
  provinceIds: string[];
}

export class VendorItemInputDto {
  @ApiProperty() @IsUUID() masterItemId: string;

  @ApiProperty({ description: 'Jumlah maksimal yang sanggup dipasok', example: 500 })
  @IsInt() @Min(1) qty: number;

  @ApiProperty({ description: 'Harga satuan (Rp)', example: 9000 })
  @IsNumber() @Min(0) unitPrice: number;

  @ApiPropertyOptional({
    enum: PriceUnit,
    description: 'PER_HARI = dikali jumlah hari kegiatan; PER_EVENT = flat sekali per kegiatan',
    default: PriceUnit.PER_HARI,
  })
  @IsOptional() @IsEnum(PriceUnit) priceUnit?: PriceUnit;

  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class SetVendorItemsDto {
  @ApiProperty({ type: [VendorItemInputDto], description: 'Daftar barang vendor (replace-all)' })
  @IsArray() @ValidateNested({ each: true }) @Type(() => VendorItemInputDto)
  items: VendorItemInputDto[];
}

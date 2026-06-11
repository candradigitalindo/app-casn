import { IsEnum, IsOptional, IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BeritaAcaraType, BeritaAcaraStatus, TransportMode, DeliveryType } from '@prisma/client';

export class BeritaAcaraPartyDto {
  @ApiProperty() @IsString() nama: string;
  @ApiProperty() @IsString() jabatan: string;
  @ApiProperty() @IsString() instansi: string;
}

export class BeritaAcaraItemDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() qty: number;
  @ApiProperty() @IsString() unit: string;
}

export class CreateBeritaAcaraDto {
  @ApiProperty({ enum: BeritaAcaraType }) @IsEnum(BeritaAcaraType) type: BeritaAcaraType;
  @ApiProperty() @IsString() locationId: string;
  @ApiProperty() @IsString() title: string;
  @ApiProperty() @IsString() date: string;
  // BA berupa upload file — uraian dan penandatangan tidak lagi diisi dari form.
  @ApiPropertyOptional() @IsOptional() @IsString() body?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fileUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fileName?: string;
  @ApiPropertyOptional({ enum: TransportMode }) @IsOptional() @IsEnum(TransportMode) transportMode?: TransportMode;
  @ApiPropertyOptional({ enum: DeliveryType }) @IsOptional() @IsEnum(DeliveryType) deliveryType?: DeliveryType;
  @ApiPropertyOptional() @IsOptional() @IsString() courierName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() vehicleInfo?: string;
  @ApiPropertyOptional({ type: [BeritaAcaraItemDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => BeritaAcaraItemDto)
  items?: BeritaAcaraItemDto[];

  @ApiPropertyOptional({ type: BeritaAcaraPartyDto })
  @IsOptional() @ValidateNested() @Type(() => BeritaAcaraPartyDto)
  pihakPertama?: BeritaAcaraPartyDto;

  @ApiPropertyOptional({ type: BeritaAcaraPartyDto })
  @IsOptional() @ValidateNested() @Type(() => BeritaAcaraPartyDto)
  pihakKedua?: BeritaAcaraPartyDto;

  @ApiPropertyOptional() @IsOptional() @IsArray() photos?: any[];
}

export class UpdateBeritaAcaraDto {
  @ApiPropertyOptional({ enum: BeritaAcaraStatus }) @IsOptional() @IsEnum(BeritaAcaraStatus) status?: BeritaAcaraStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() body?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fileUrl?: string;
}

export class BeritaAcaraQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() locationId?: string;
  @ApiPropertyOptional({ enum: BeritaAcaraType }) @IsOptional() @IsEnum(BeritaAcaraType) type?: BeritaAcaraType;
}

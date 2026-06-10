import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PersonnelRole } from '@prisma/client';

export class CreatePersonnelDto {
  @ApiProperty() @IsString() locationId: string;
  @ApiProperty() @IsString() name: string;
  @ApiProperty({ enum: PersonnelRole }) @IsEnum(PersonnelRole) role: PersonnelRole;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdatePersonnelDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional({ enum: PersonnelRole }) @IsOptional() @IsEnum(PersonnelRole) role?: PersonnelRole;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpsertAttendanceDto {
  @ApiProperty() @IsString() personnelId: string;
  @ApiProperty() @IsString() locationId: string;
  @ApiProperty() @IsString() date: string;
  @ApiProperty() @IsBoolean() present: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

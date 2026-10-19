import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  Matches,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EducationLevel, Gender, PersonnelRole } from '@prisma/client';

// Field profil opsional yang sama untuk create & update.
// `null` diperbolehkan pada beberapa field untuk MENGOSONGKAN nilai
// (mis. batal penugasan → locationId: null).
abstract class PersonnelProfileDto {
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;

  // ── Data pribadi ──
  @ApiPropertyOptional() @IsOptional() @IsString() nik?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() birthPlace?: string;
  @ApiPropertyOptional()
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsDateString()
  birthDate?: string | null;
  @ApiPropertyOptional({ enum: Gender })
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsEnum(Gender)
  gender?: Gender | null;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional()
  @IsOptional() @ValidateIf((_, v) => v !== null && v !== '') @IsEmail()
  email?: string | null;

  // ── Pendidikan & ijazah ──
  @ApiPropertyOptional({ enum: EducationLevel, description: 'Minimal SMA sederajat (Kepsesma G.1.8)' })
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsEnum(EducationLevel)
  educationLevel?: EducationLevel | null;
  @ApiPropertyOptional() @IsOptional() @IsString() educationMajor?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() educationInstitution?: string;
  @ApiPropertyOptional() @IsOptional() @ValidateIf((_, v) => v !== null) @IsString()
  diplomaFileUrl?: string | null;
  @ApiPropertyOptional() @IsOptional() @ValidateIf((_, v) => v !== null) @IsString()
  diplomaFileName?: string | null;

  // ── Honor & rekomendasi ──
  @ApiPropertyOptional({ description: 'Honor per hari kegiatan (Rp)' })
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsNumber() @Min(0)
  honorPerDay?: number | null;
  @ApiPropertyOptional({ enum: PersonnelRole, description: 'Grade jabatan yang direkomendasikan' })
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsEnum(PersonnelRole)
  recommendedRole?: PersonnelRole | null;
}

export class CreatePersonnelDto extends PersonnelProfileDto {
  @ApiProperty() @IsString() @MinLength(2) name: string;
  @ApiProperty({ enum: PersonnelRole }) @IsEnum(PersonnelRole) role: PersonnelRole;

  // Penugasan titik lokasi — boleh kosong (belum ditugaskan)
  @ApiPropertyOptional()
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsString()
  locationId?: string | null;
}

export class UpdatePersonnelDto extends PersonnelProfileDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(2) name?: string;
  @ApiPropertyOptional({ enum: PersonnelRole }) @IsOptional() @IsEnum(PersonnelRole) role?: PersonnelRole;

  // locationId: null = batalkan penugasan
  @ApiPropertyOptional()
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsString()
  locationId?: string | null;
}

export class UpsertAttendanceDto {
  @ApiProperty() @IsString() personnelId: string;
  @ApiProperty() @IsString() locationId: string;
  @ApiProperty() @IsDateString({ strict: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/) date: string;
  @ApiProperty() @IsBoolean() present: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  // Bukti kehadiran (base64 data URL) yang di-upload admin
  @ApiPropertyOptional() @IsOptional() @IsString() fileUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fileName?: string;
}

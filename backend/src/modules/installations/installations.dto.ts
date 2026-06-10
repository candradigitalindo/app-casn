import { IsEnum, IsNumber, IsOptional, IsString, IsArray, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InstallationMilestone } from '@prisma/client';

export class PhotoEvidenceDto {
  @ApiProperty() @IsString() url: string;
  @ApiProperty() @IsNumber() lat: number;
  @ApiProperty() @IsNumber() lng: number;
  @ApiProperty() @IsString() timestamp: string;
}

export class UpdateProgressDto {
  @ApiProperty() @IsString() locationId: string;
  @ApiProperty({ enum: InstallationMilestone }) @IsEnum(InstallationMilestone) milestone: InstallationMilestone;
  @ApiProperty() @IsNumber() @Min(0) @Max(100) percentage: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional({ type: [PhotoEvidenceDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PhotoEvidenceDto)
  photos?: PhotoEvidenceDto[];

  @ApiPropertyOptional() @IsOptional() @IsString() completedBy?: string;
}

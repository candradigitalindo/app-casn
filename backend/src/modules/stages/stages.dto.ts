import { IsEnum, IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { StageStatus } from '@prisma/client';

export class UpdateStageDto {
  @ApiPropertyOptional({ enum: StageStatus }) @IsOptional() @IsEnum(StageStatus) status?: StageStatus;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100) progress?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class AddStagePhotoDto {
  @ApiProperty() @IsString() url: string;
  @ApiProperty() @IsString() caption: string;
  @ApiProperty() @IsString() takenAt: string;
  @ApiPropertyOptional() @IsOptional() @IsString() uploadedBy?: string;
}

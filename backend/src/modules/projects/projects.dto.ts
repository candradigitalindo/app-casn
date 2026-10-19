import {
  IsArray,
  IsDateString,
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
  ValidateIf,
} from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PriceUnit, ProjectStatus } from '@prisma/client';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class CreateProjectDto {
  @IsString() @MinLength(2) name: string;
  @IsString() @MinLength(2) agencyName: string;
  @IsInt() @Min(2020) @Max(2100) fiscalYear: number;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsNumber() @Min(0) @Max(999999999999999) hpsAmount?: number;
  @ValidateIf((_object, value) => value !== undefined)
  @IsNumber() @Min(0) @Max(999.99) defaultMarginPct?: number;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsDateString() submissionDeadline?: string;
}
export class UpdateProjectDto extends PartialType(CreateProjectDto, { skipNullProperties: false }) {}
export class QueryProjectDto extends PaginationDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsEnum(ProjectStatus) status?: ProjectStatus;
}
export class ProjectLocationDto {
  @IsString() @MinLength(2) name: string;
  @IsUUID() provinceId: string;
  @IsOptional() @IsUUID() regencyId?: string;
  @IsString() @MinLength(2) city: string;
  @IsInt() @Min(1) @Max(500) capacity: number;
  @IsInt() @Min(5) @Max(3650) days: number;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsNumber() @Min(-90) @Max(90) latitude?: number;
  @IsOptional() @IsNumber() @Min(-180) @Max(180) longitude?: number;
}
export class UpdateProjectLocationDto extends PartialType(ProjectLocationDto, { skipNullProperties: false }) {}
export class AllocationInputDto {
  @IsUUID() vendorItemId: string;
  @IsInt() @Min(1) @Max(2147483647) qty: number;
  @IsOptional() @IsNumber() @Min(0) @Max(999999999999.99) unitPrice?: number;
  @IsOptional() @IsEnum(PriceUnit) priceUnit?: PriceUnit;
  @IsOptional() @IsString() notes?: string;
}
export class SetAllocationsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AllocationInputDto)
  allocations: AllocationInputDto[];
}
export class UpdateRequirementDto {
  @IsOptional() @IsNumber() @Min(0) @Max(999.99) marginPct?: number;
}
export class ProjectStatusDto {
  @IsEnum(ProjectStatus) status: ProjectStatus;
}
export class ReviseProjectDto {
  @IsString() @MinLength(5) reason: string;
}

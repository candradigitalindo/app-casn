import { IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class ScanDto {
  @ApiProperty() @IsString() locationId: string;
  @ApiProperty() @IsString() barcodeValue: string;
  @ApiProperty() @IsNumber() session: number;
  @ApiPropertyOptional() @IsOptional() @IsString() participantName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class AttendanceQueryDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() locationId?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() session?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
}

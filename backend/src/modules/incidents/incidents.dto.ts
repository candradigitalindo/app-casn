import { IsEnum, IsOptional, IsString, IsArray, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TicketSeverity, TicketCategory, TicketStatus } from '@prisma/client';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class CreateTicketDto {
  @ApiProperty() @IsString() locationId: string;
  @ApiProperty({ enum: TicketSeverity }) @IsEnum(TicketSeverity) severity: TicketSeverity;
  @ApiProperty({ enum: TicketCategory }) @IsEnum(TicketCategory) category: TicketCategory;
  @ApiProperty() @IsString() title: string;
  @ApiProperty() @IsString() description: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() photos?: string[];
}

export class AssignTicketDto {
  @ApiProperty() @IsString() assignedTo: string;
}

export class UpdateStatusDto {
  @ApiPropertyOptional({ enum: TicketStatus }) @IsOptional() @IsEnum(TicketStatus) status?: TicketStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() resolutionNote?: string;
}

export class AddNoteDto {
  @ApiProperty() @IsString() note: string;
}

export class EscalateDto {
  @ApiProperty() @IsString() reason: string;
}

export class TicketQueryDto extends PaginationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() locationId?: string;
  @ApiPropertyOptional({ enum: TicketStatus }) @IsOptional() @IsEnum(TicketStatus) status?: TicketStatus;
  @ApiPropertyOptional({ enum: TicketSeverity }) @IsOptional() @IsEnum(TicketSeverity) severity?: TicketSeverity;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
}

import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentCategory } from '@prisma/client';

export class CreateDocumentDto {
  @ApiProperty() @IsString() locationId: string;
  @ApiProperty({ enum: DocumentCategory }) @IsEnum(DocumentCategory) category: DocumentCategory;
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsString() fileName: string;
  @ApiProperty() @IsString() fileUrl: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() fileSizeKb?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

export class UpdateDocumentDto {
  @ApiPropertyOptional({ enum: DocumentCategory }) @IsOptional() @IsEnum(DocumentCategory) category?: DocumentCategory;
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}

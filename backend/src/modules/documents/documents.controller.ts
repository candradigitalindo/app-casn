import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto, UpdateDocumentDto } from './documents.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '@prisma/client';

@ApiTags('Documents')
@ApiBearerAuth()
@Controller('v1/documents')
export class DocumentsController {
  constructor(private readonly service: DocumentsService) {}

  @Get()
  getByLocation(@Query('locationId') locationId: string) {
    return this.service.getByLocation(locationId);
  }

  @Post()
  create(@Body() dto: CreateDocumentDto, @CurrentUser() user: User) {
    return this.service.create(dto, user.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDocumentDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

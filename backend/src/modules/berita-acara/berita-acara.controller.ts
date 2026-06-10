import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { BeritaAcaraService } from './berita-acara.service';
import { CreateBeritaAcaraDto, UpdateBeritaAcaraDto, BeritaAcaraQueryDto } from './berita-acara.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '@prisma/client';

@ApiTags('Berita Acara')
@ApiBearerAuth()
@Controller('v1/berita-acara')
export class BeritaAcaraController {
  constructor(private readonly service: BeritaAcaraService) {}

  @Get()
  findAll(@Query() query: BeritaAcaraQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateBeritaAcaraDto, @CurrentUser() user: User) {
    return this.service.create(dto, user.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBeritaAcaraDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

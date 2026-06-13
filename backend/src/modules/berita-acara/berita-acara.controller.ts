import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BeritaAcaraService } from './berita-acara.service';
import { CreateBeritaAcaraDto, UpdateBeritaAcaraDto, BeritaAcaraQueryDto, RejectBeritaAcaraDto } from './berita-acara.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { User, UserRole } from '@prisma/client';

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

  @Patch(':id/approve')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Setujui BA (pengawas lapangan)' })
  approve(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.approve(id, user.id);
  }

  @Patch(':id/reject')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Tolak BA dengan catatan (pengawas lapangan)' })
  reject(@Param('id') id: string, @Body() dto: RejectBeritaAcaraDto, @CurrentUser() user: User) {
    return this.service.reject(id, user.id, dto.note);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

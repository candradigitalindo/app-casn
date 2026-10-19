import { OPERATIONAL_ROLES } from '../../common/constants/roles';
import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { IncidentsService } from './incidents.service';
import { CreateTicketDto, AssignTicketDto, UpdateStatusDto, AddNoteDto, EscalateDto, TicketQueryDto } from './incidents.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { User } from '@prisma/client';

@ApiTags('Incidents')
@ApiBearerAuth()
@Controller('v1/incidents')
export class IncidentsController {
  constructor(private readonly service: IncidentsService) {}

  @Get('tickets/sla/overdue')
  getOverdue(@Query('locationId') locationId?: string) {
    return this.service.getOverdue(locationId);
  }

  @Get('tickets/sla/stats')
  getSLAStats(@Query('locationId') locationId?: string) {
    return this.service.getSLAStats(locationId);
  }

  @Get('tickets')
  findAll(@Query() query: TicketQueryDto) {
    return this.service.findAll(query);
  }

  @Get('tickets/:id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post('tickets')
  create(@Body() dto: CreateTicketDto, @CurrentUser() user: User) {
    return this.service.create(dto, user.id, user.name);
  }

  @Patch('tickets/:id/assign')
  @Roles(...OPERATIONAL_ROLES)
  assign(@Param('id') id: string, @Body() dto: AssignTicketDto) {
    return this.service.assign(id, dto);
  }

  @Patch('tickets/:id/status')
  @Roles(...OPERATIONAL_ROLES)
  updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
    return this.service.updateStatus(id, dto);
  }

  @Post('tickets/:id/notes')
  @Roles(...OPERATIONAL_ROLES)
  addNote(@Param('id') id: string, @Body() dto: AddNoteDto) {
    return this.service.addNote(id, dto);
  }

  @Post('tickets/:id/escalate')
  @Roles(...OPERATIONAL_ROLES)
  escalate(@Param('id') id: string, @Body() dto: EscalateDto) {
    return this.service.escalate(id, dto);
  }

  @Post('tickets/:id/photos')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  uploadPhoto(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('File wajib diunggah (field: file)');
    return this.service.addPhoto(id, file);
  }

  @Delete('tickets/:id')
  @Roles(...OPERATIONAL_ROLES)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

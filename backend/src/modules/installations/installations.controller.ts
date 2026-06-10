import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { InstallationsService } from './installations.service';
import { UpdateProgressDto, PhotoEvidenceDto } from './installations.dto';

@ApiTags('Installations')
@ApiBearerAuth()
@Controller('v1/installations')
export class InstallationsController {
  constructor(private readonly service: InstallationsService) {}

  @Get('summary')
  getSummary() {
    return this.service.getSummary();
  }

  @Get('alerts/delays')
  getDelayAlerts() {
    return this.service.getDelayAlerts();
  }

  @Get('progress')
  getAll() {
    return this.service.getAll();
  }

  @Get('progress/:locationId')
  getByLocation(@Param('locationId') locationId: string) {
    return this.service.getByLocation(locationId);
  }

  @Post('progress')
  upsert(@Body() dto: UpdateProgressDto) {
    return this.service.upsert(dto);
  }

  @Post('progress/:id/photos')
  addPhoto(@Param('id') id: string, @Body() photo: PhotoEvidenceDto) {
    return this.service.addPhoto(id, photo);
  }
}

import { OPERATIONAL_ROLES } from '../../common/constants/roles';
import { Roles } from '../../common/decorators/roles.decorator';
import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { InstallationsService } from './installations.service';
import { UpdateProgressDto, PhotoEvidenceDto } from './installations.dto';

@ApiTags('Installations')
@ApiBearerAuth()
@Controller('v1/installations')
export class InstallationsController {
  constructor(private readonly service: InstallationsService) {}

  @Get('summary')
  getSummary(@Query('locationId') locationId?: string) {
    return this.service.getSummary(locationId);
  }

  @Get('alerts/delays')
  getDelayAlerts(@Query('locationId') locationId?: string) {
    return this.service.getDelayAlerts(locationId);
  }

  @Get('progress')
  getAll(@Query('locationId') locationId?: string) {
    return this.service.getAll(locationId);
  }

  @Get('progress/:locationId')
  getByLocation(@Param('locationId') locationId: string) {
    return this.service.getByLocation(locationId);
  }

  @Post('progress')
  @Roles(...OPERATIONAL_ROLES)
  upsert(@Body() dto: UpdateProgressDto) {
    return this.service.upsert(dto);
  }

  @Post('progress/:id/photos')
  @Roles(...OPERATIONAL_ROLES)
  addPhoto(@Param('id') id: string, @Body() photo: PhotoEvidenceDto) {
    return this.service.addPhoto(id, photo);
  }
}

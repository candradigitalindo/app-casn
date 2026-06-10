import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { StagesService } from './stages.service';
import { UpdateStageDto, AddStagePhotoDto } from './stages.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '@prisma/client';

@ApiTags('Stages')
@ApiBearerAuth()
@Controller('v1/stages')
export class StagesController {
  constructor(private readonly service: StagesService) {}

  @Get('summary')
  getAllSummary() {
    return this.service.getAllSummary();
  }

  @Get('location/:locationId')
  getByLocation(@Param('locationId') locationId: string) {
    return this.service.getByLocation(locationId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateStageDto, @CurrentUser() user: User) {
    return this.service.update(id, dto, user.id);
  }

  @Post(':id/photos')
  addPhoto(@Param('id') id: string, @Body() dto: AddStagePhotoDto, @CurrentUser() user: User) {
    return this.service.addPhoto(id, dto, user.id);
  }

  @Delete(':stageId/photos/:photoId')
  deletePhoto(@Param('stageId') stageId: string, @Param('photoId') photoId: string) {
    return this.service.deletePhoto(stageId, photoId);
  }
}

import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PersonnelService } from './personnel.service';
import { CreatePersonnelDto, UpdatePersonnelDto, UpsertAttendanceDto } from './personnel.dto';
import { Roles } from '../../common/decorators/roles.decorator';

import { OPERATIONAL_ROLES } from '../../common/constants/roles';

@ApiTags('Personnel')
@ApiBearerAuth()
@Controller('v1/personnel')
export class PersonnelController {
  constructor(private readonly service: PersonnelService) {}

  @Get('summary')
  getSummary(@Query('locationId') locationId?: string) {
    return this.service.getSummary(locationId);
  }

  @Get('requirements')
  getRequirements(@Query('capacity') capacity?: number) {
    return this.service.getRequirements(capacity ? Number(capacity) : undefined);
  }

  @Get('attendance')
  getAttendance(@Query('locationId') locationId: string, @Query('date') date?: string) {
    return this.service.getAttendance(locationId, date);
  }

  @Get()
  findAll(
    @Query('locationId') locationId?: string,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('unassigned') unassigned?: string,
  ) {
    return this.service.findAll({
      locationId,
      search,
      role,
      unassigned: unassigned === 'true',
    });
  }

  @Post('attendance')
  @Roles(...OPERATIONAL_ROLES)
  upsertAttendance(@Body() dto: UpsertAttendanceDto) {
    return this.service.upsertAttendance(dto);
  }

  @Delete('attendance/:id')
  @Roles(...OPERATIONAL_ROLES)
  deleteAttendance(@Param('id') id: string) {
    return this.service.deleteAttendance(id);
  }

  @Post()
  @Roles(...OPERATIONAL_ROLES)
  create(@Body() dto: CreatePersonnelDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(...OPERATIONAL_ROLES)
  update(@Param('id') id: string, @Body() dto: UpdatePersonnelDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(...OPERATIONAL_ROLES)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

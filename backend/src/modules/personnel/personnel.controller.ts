import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PersonnelService } from './personnel.service';
import { CreatePersonnelDto, UpdatePersonnelDto, UpsertAttendanceDto } from './personnel.dto';

@ApiTags('Personnel')
@ApiBearerAuth()
@Controller('v1/personnel')
export class PersonnelController {
  constructor(private readonly service: PersonnelService) {}

  @Get('summary')
  getSummary() {
    return this.service.getSummary();
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
  getByLocation(@Query('locationId') locationId: string) {
    return this.service.getByLocation(locationId);
  }

  @Post('attendance')
  upsertAttendance(@Body() dto: UpsertAttendanceDto) {
    return this.service.upsertAttendance(dto);
  }

  @Delete('attendance/:id')
  deleteAttendance(@Param('id') id: string) {
    return this.service.deleteAttendance(id);
  }

  @Post()
  create(@Body() dto: CreatePersonnelDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePersonnelDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

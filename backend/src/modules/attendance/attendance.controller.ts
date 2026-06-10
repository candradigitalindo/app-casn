import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { ScanDto, AttendanceQueryDto } from './attendance.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '@prisma/client';

@ApiTags('Attendance')
@ApiBearerAuth()
@Controller('v1/attendance')
export class AttendanceController {
  constructor(private readonly service: AttendanceService) {}

  @Get('logs')
  getLogs(@Query() query: AttendanceQueryDto) {
    return this.service.getLogs(query);
  }

  @Post('scan')
  scan(@Body() dto: ScanDto, @CurrentUser() user: User) {
    return this.service.scan(dto, user.id);
  }
}

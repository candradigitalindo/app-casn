import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('v1/reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('executive')
  getExecutiveDashboard() {
    return this.service.getExecutiveDashboard();
  }

  @Get('locations')
  getLocationsReport() {
    return this.service.getLocationsReport();
  }

  @Get('attendance')
  getAttendanceReport(@Query('locationId') locationId?: string) {
    return this.service.getAttendanceReport(locationId);
  }

  @Get('incidents')
  getIncidentsReport() {
    return this.service.getIncidentsReport();
  }

  @Get('logistics')
  getLogisticsReport() {
    return this.service.getLogisticsReport();
  }

  @Get('installations')
  getInstallationsReport() {
    return this.service.getInstallationsReport();
  }

  @Get('berita-acara')
  getBeritaAcaraReport() {
    return this.service.getBeritaAcaraReport();
  }

  @ApiQuery({ name: 'entityType', required: false })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @Roles(UserRole.SUPER_ADMIN)
  @Get('audit-log')
  getAuditLog(
    @Query('entityType') entityType?: string,
    @Query('userId') userId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.service.getAuditLog({ entityType, userId, page, limit });
  }
}

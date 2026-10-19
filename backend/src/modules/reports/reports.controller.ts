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
  getExecutiveDashboard(@Query('locationId') locationId?: string) {
    return this.service.getExecutiveDashboard(locationId);
  }

  @Get('locations')
  getLocationsReport(@Query('locationId') locationId?: string) {
    return this.service.getLocationsReport(locationId);
  }

  @Get('incidents')
  getIncidentsReport(@Query('locationId') locationId?: string) {
    return this.service.getIncidentsReport(locationId);
  }

  @Get('logistics')
  getLogisticsReport(@Query('locationId') locationId?: string) {
    return this.service.getLogisticsReport(locationId);
  }

  @Get('installations')
  getInstallationsReport(@Query('locationId') locationId?: string) {
    return this.service.getInstallationsReport(locationId);
  }

  @Get('berita-acara')
  getBeritaAcaraReport(@Query('locationId') locationId?: string) {
    return this.service.getBeritaAcaraReport(locationId);
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

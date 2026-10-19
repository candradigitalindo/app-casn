import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ok } from '../../common/dto/api-response.dto';
import { NotificationsService } from './notifications.service';

@Controller('v1/notifications')
export class NotificationsController {
  constructor(private service: NotificationsService) {}
  @Get() list(
    @CurrentUser() user: any,
    @Query() query: PaginationDto,
    @Query('unread') unread?: string,
  ) {
    return this.service.list(user, query, unread === 'true');
  }
  @Patch('read-all') async readAll(@CurrentUser() user: any) {
    await this.service.read(user.id);
    return ok(null);
  }
  @Patch(':id/read') async read(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    await this.service.read(user.id, id);
    return ok(null);
  }
}

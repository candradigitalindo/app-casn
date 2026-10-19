import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ok } from '../../common/dto/api-response.dto';
import { ProjectsService } from './projects.service';
import {
  CreateProjectDto,
  ProjectLocationDto,
  ProjectStatusDto,
  QueryProjectDto,
  ReviseProjectDto,
  SetAllocationsDto,
  UpdateProjectDto,
  UpdateProjectLocationDto,
  UpdateRequirementDto,
} from './projects.dto';

@Roles(UserRole.SUPER_ADMIN, UserRole.LOGISTICS)
@Controller('v1/projects')
export class ProjectsController {
  constructor(private service: ProjectsService) {}
  private global(user: any) {
    if (user.locationId)
      throw new ForbiddenException(
        'Pengadaan proyek memerlukan cakupan seluruh lokasi',
      );
  }

  @Get() list(@Query() query: QueryProjectDto, @CurrentUser() user: any) {
    this.global(user);
    return this.service.list(query);
  }
  @Get(':id') async get(@Param('id') id: string, @CurrentUser() user: any) {
    this.global(user);
    return ok(await this.service.get(id));
  }
  @Post() async create(
    @Body() dto: CreateProjectDto,
    @CurrentUser() user: any,
  ) {
    this.global(user);
    return ok(await this.service.create(dto, user.id), 'Proyek dibuat');
  }
  @Patch(':id') async update(
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUser() user: any,
  ) {
    this.global(user);
    return ok(await this.service.update(id, dto));
  }
  @Post(':id/locations') async addLocation(
    @Param('id') id: string,
    @Body() dto: ProjectLocationDto,
    @CurrentUser() user: any,
  ) {
    this.global(user);
    return ok(await this.service.saveLocation(id, dto));
  }
  @Patch(':id/locations/:locationId') async updateLocation(
    @Param('id') id: string,
    @Param('locationId') locationId: string,
    @Body() dto: UpdateProjectLocationDto,
    @CurrentUser() user: any,
  ) {
    this.global(user);
    return ok(await this.service.saveLocation(id, dto, locationId));
  }
  @Delete(':id/locations/:locationId') async removeLocation(
    @Param('id') id: string,
    @Param('locationId') locationId: string,
    @CurrentUser() user: any,
  ) {
    this.global(user);
    return ok(await this.service.deleteLocation(id, locationId));
  }
  @Get(':id/requirements/:requirementId/offers') async offers(
    @Param('id') id: string,
    @Param('requirementId') requirementId: string,
    @CurrentUser() user: any,
  ) {
    this.global(user);
    return ok(await this.service.candidates(id, requirementId));
  }
  @Post(':id/requirements/:requirementId/allocations') async allocations(
    @Param('id') id: string,
    @Param('requirementId') requirementId: string,
    @Body() dto: SetAllocationsDto,
    @CurrentUser() user: any,
  ) {
    this.global(user);
    return ok(
      await this.service.setAllocations(id, requirementId, dto.allocations),
    );
  }
  @Patch(':id/requirements/:requirementId') async margin(
    @Param('id') id: string,
    @Param('requirementId') requirementId: string,
    @Body() dto: UpdateRequirementDto,
    @CurrentUser() user: any,
  ) {
    this.global(user);
    return ok(await this.service.margin(id, requirementId, dto.marginPct));
  }
  @Post(':id/auto-allocate') async auto(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    this.global(user);
    return ok(await this.service.autoAllocate(id));
  }
  @Post(':id/locations/:locationId/auto-allocate') async autoLocation(
    @Param('id') id: string,
    @Param('locationId') locationId: string,
    @CurrentUser() user: any,
  ) {
    this.global(user);
    return ok(await this.service.autoAllocate(id, locationId));
  }
  @Post(':id/submit') async submit(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    this.global(user);
    return ok(
      await this.service.submit(id),
      'Penawaran diajukan dan snapshot disimpan',
    );
  }
  @Post(':id/revise') async revise(
    @Param('id') id: string,
    @Body() dto: ReviseProjectDto,
    @CurrentUser() user: any,
  ) {
    this.global(user);
    return ok(await this.service.revise(id, dto.reason));
  }
  @Post(':id/status') async status(
    @Param('id') id: string,
    @Body() dto: ProjectStatusDto,
    @CurrentUser() user: any,
  ) {
    this.global(user);
    return ok(await this.service.status(id, dto.status));
  }
  @Post(':id/activate') async activate(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    this.global(user);
    return ok(await this.service.activate(id), 'Lokasi operasional diaktifkan');
  }
  @Get(':id/proposals/:version') async proposal(
    @Param('id') id: string,
    @Param('version', ParseIntPipe) version: number,
    @CurrentUser() user: any,
  ) {
    this.global(user);
    return ok(await this.service.proposal(id, version));
  }
}

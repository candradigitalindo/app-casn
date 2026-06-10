import {
  Controller, Get, Post, Patch, Delete,
  Param, Query, Body, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { LocationsService } from './locations.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { QueryLocationDto } from './dto/query-location.dto';
import {
  CreateLocationItemDto,
  UpdateLocationItemDto,
  UpdateCapacityDto,
} from './dto/location-item.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { ok } from '../../common/dto/api-response.dto';

@ApiTags('Locations')
@ApiBearerAuth()
@Controller('v1/locations')
export class LocationsController {
  constructor(private svc: LocationsService) {}

  // ── LIST & DETAIL ──────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Daftar semua lokasi dengan filter' })
  findAll(@Query() query: QueryLocationDto) {
    return this.svc.findAll(query);
  }

  @Get('stats/summary')
  @ApiOperation({ summary: 'Statistik nasional untuk dashboard' })
  async getStatsSummary() {
    const data = await this.svc.getStatsSummary();
    return ok(data);
  }

  @Get('stats/province')
  @ApiOperation({ summary: 'Statistik per provinsi' })
  async getStatsProvince() {
    const data = await this.svc.getStatsProvince();
    return ok(data);
  }

  @Get('geo/boundaries')
  @ApiOperation({ summary: 'GeoJSON batas provinsi untuk peta' })
  getGeoBoundaries() {
    return ok(this.svc.getGeoBoundaries());
  }

  @Get('items/all')
  @ApiOperation({ summary: 'Semua item barang di seluruh lokasi' })
  async getAllItems() {
    const data = await this.svc.getAllItems();
    return ok(data);
  }

  @Get('items/master')
  @ApiOperation({ summary: 'Master data 38 item standar BKN (kuantitas per tier kapasitas)' })
  async getMasterItems() {
    const data = await this.svc.getMasterItems();
    return ok(data);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail satu lokasi' })
  async findOne(@Param('id') id: string) {
    const data = await this.svc.findOne(id);
    return ok(data);
  }

  @Get(':id/installations')
  @ApiOperation({ summary: 'Progress instalasi lokasi' })
  async getInstallations(@Param('id') id: string) {
    const data = await this.svc.getInstallations(id);
    return ok(data);
  }

  @Get(':id/items')
  @ApiOperation({ summary: 'Daftar barang di satu lokasi' })
  async getItems(@Param('id') id: string) {
    const data = await this.svc.getItems(id);
    return ok(data);
  }

  // ── CREATE / UPDATE / DELETE ───────────────────────────────

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.LOGISTICS)
  @ApiOperation({ summary: 'Buat lokasi baru' })
  async create(@Body() dto: CreateLocationDto) {
    const data = await this.svc.create(dto);
    return ok(data, 'Lokasi berhasil dibuat');
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.LOGISTICS, UserRole.COORDINATOR)
  @ApiOperation({ summary: 'Update data lokasi' })
  async update(@Param('id') id: string, @Body() dto: UpdateLocationDto) {
    const data = await this.svc.update(id, dto);
    return ok(data, 'Lokasi berhasil diperbarui');
  }

  @Patch(':id/capacity')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COORDINATOR)
  @ApiOperation({ summary: 'Update kapasitas lokasi' })
  async updateCapacity(@Param('id') id: string, @Body() dto: UpdateCapacityDto) {
    const data = await this.svc.updateCapacity(id, dto);
    return ok(data, 'Kapasitas berhasil diperbarui');
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Hapus lokasi (Super Admin)' })
  async remove(@Param('id') id: string) {
    await this.svc.remove(id);
    return ok(null, 'Lokasi berhasil dihapus');
  }

  // ── ITEMS ──────────────────────────────────────────────────

  @Post(':id/items')
  @Roles(UserRole.SUPER_ADMIN, UserRole.LOGISTICS, UserRole.COORDINATOR)
  @ApiOperation({ summary: 'Tambah barang ke lokasi' })
  async createItem(
    @Param('id') id: string,
    @Body() dto: CreateLocationItemDto,
  ) {
    const data = await this.svc.createItem(id, dto);
    return ok(data, 'Barang berhasil ditambahkan');
  }

  @Post(':id/items/seed-standard')
  @Roles(UserRole.SUPER_ADMIN, UserRole.LOGISTICS)
  @ApiOperation({ summary: 'Seed item standar berdasarkan kapasitas' })
  async seedStandardItems(@Param('id') id: string) {
    const data = await this.svc.seedStandardItems(id);
    return ok(data, `${data.length} item standar berhasil dibuat`);
  }

  @Patch(':id/items/:itemId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.LOGISTICS, UserRole.COORDINATOR)
  @ApiOperation({ summary: 'Update barang di lokasi' })
  async updateItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateLocationItemDto,
  ) {
    const data = await this.svc.updateItem(id, itemId, dto);
    return ok(data, 'Barang berhasil diperbarui');
  }

  @Delete(':id/items/:itemId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.LOGISTICS, UserRole.COORDINATOR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Hapus barang dari lokasi' })
  async deleteItem(@Param('id') id: string, @Param('itemId') itemId: string) {
    await this.svc.deleteItem(id, itemId);
    return ok(null, 'Barang berhasil dihapus');
  }
}

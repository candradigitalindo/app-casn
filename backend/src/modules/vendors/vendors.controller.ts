import { Controller, Get, Post, Patch, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { VendorsService } from './vendors.service';
import {
  CreateVendorDto,
  UpdateVendorDto,
  SetCoveragesDto,
  SetVendorItemsDto,
} from './vendors.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { ok } from '../../common/dto/api-response.dto';

const MANAGE_ROLES = [UserRole.SUPER_ADMIN, UserRole.LOGISTICS] as const;

@ApiTags('Vendors')
@ApiBearerAuth()
@Controller('v1/vendors')
export class VendorsController {
  constructor(private readonly service: VendorsService) {}

  @Get()
  @ApiOperation({ summary: 'Daftar vendor rekanan (filter kategori, provinsi cakupan, pencarian)' })
  async findAll(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('provinceId') provinceId?: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return ok(
      await this.service.findAll({
        search,
        category,
        provinceId,
        includeInactive: includeInactive === 'true',
      }),
    );
  }

  // Perhatian: rute statis ini wajib dideklarasikan SEBELUM ':id'.
  @Get('items/comparison')
  @ApiOperation({
    summary:
      'Perbandingan harga antar vendor per item (urut biaya efektif per event: per-hari × jumlah hari vs flat per-event)',
  })
  async getItemComparison(
    @Query('category') category?: string,
    @Query('provinceId') provinceId?: string,
    @Query('search') search?: string,
    @Query('days') days?: string,
  ) {
    return ok(
      await this.service.getItemComparison({
        category,
        provinceId,
        search,
        days: days !== undefined ? Number(days) : undefined,
      }),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail vendor beserta cakupan wilayah' })
  async findOne(@Param('id') id: string) {
    return ok(await this.service.findOne(id));
  }

  @Post()
  @Roles(...MANAGE_ROLES)
  @ApiOperation({ summary: 'Tambah vendor rekanan (kode otomatis VDR-XXXX)' })
  async create(@Body() dto: CreateVendorDto) {
    return ok(await this.service.create(dto), 'Vendor berhasil ditambahkan');
  }

  @Patch(':id')
  @Roles(...MANAGE_ROLES)
  @ApiOperation({ summary: 'Update vendor (termasuk replace cakupan bila coverageProvinceIds dikirim)' })
  async update(@Param('id') id: string, @Body() dto: UpdateVendorDto) {
    return ok(await this.service.update(id, dto), 'Vendor berhasil diperbarui');
  }

  @Put(':id/coverages')
  @Roles(...MANAGE_ROLES)
  @ApiOperation({ summary: 'Set daftar provinsi cakupan vendor (replace-all)' })
  async setCoverages(@Param('id') id: string, @Body() dto: SetCoveragesDto) {
    return ok(await this.service.setCoverages(id, dto.provinceIds), 'Cakupan wilayah diperbarui');
  }

  @Get(':id/items')
  @ApiOperation({ summary: 'Daftar barang & harga vendor (mengacu master item)' })
  async getItems(@Param('id') id: string) {
    return ok(await this.service.getItems(id));
  }

  @Put(':id/items')
  @Roles(...MANAGE_ROLES)
  @ApiOperation({ summary: 'Set daftar barang, jumlah, dan harga vendor (replace-all)' })
  async setItems(@Param('id') id: string, @Body() dto: SetVendorItemsDto) {
    return ok(await this.service.setItems(id, dto.items), 'Barang & harga vendor diperbarui');
  }

  @Delete(':id')
  @Roles(...MANAGE_ROLES)
  @ApiOperation({ summary: 'Hapus vendor' })
  async remove(@Param('id') id: string) {
    await this.service.remove(id);
    return ok(null, 'Vendor berhasil dihapus');
  }
}

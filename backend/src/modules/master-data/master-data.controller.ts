import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { MasterDataService } from './master-data.service';
import {
  CreateProvinceDto,
  UpdateProvinceDto,
  CreateRegencyDto,
  UpdateRegencyDto,
  CreateMasterItemDto,
  UpdateMasterItemDto,
  CreatePersonnelRequirementDto,
  UpdatePersonnelRequirementDto,
} from './master-data.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { ok } from '../../common/dto/api-response.dto';

@ApiTags('Master Data')
@ApiBearerAuth()
@Controller('v1/master-data')
export class MasterDataController {
  constructor(private readonly service: MasterDataService) {}

  // ── PROVINSI ────────────────────────────────────────────────

  @Get('provinces')
  @ApiOperation({ summary: 'Daftar provinsi (dengan jumlah kabupaten/kota)' })
  async findProvinces(@Query('search') search?: string) {
    return ok(await this.service.findProvinces(search));
  }

  @Post('provinces')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Tambah provinsi' })
  async createProvince(@Body() dto: CreateProvinceDto) {
    return ok(await this.service.createProvince(dto), 'Provinsi berhasil ditambahkan');
  }

  @Patch('provinces/:id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update provinsi' })
  async updateProvince(@Param('id') id: string, @Body() dto: UpdateProvinceDto) {
    return ok(await this.service.updateProvince(id, dto), 'Provinsi berhasil diperbarui');
  }

  @Delete('provinces/:id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Hapus provinsi (beserta seluruh kabupaten/kota di dalamnya)' })
  async removeProvince(@Param('id') id: string) {
    const result = await this.service.removeProvince(id);
    return ok(result, 'Provinsi berhasil dihapus');
  }

  // ── KABUPATEN / KOTA ────────────────────────────────────────

  @Get('regencies')
  @ApiOperation({ summary: 'Daftar kabupaten/kota (filter provinsi, tipe, pencarian)' })
  async findRegencies(
    @Query('provinceId') provinceId?: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
  ) {
    return ok(await this.service.findRegencies({ provinceId, type, search }));
  }

  @Post('regencies')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Tambah kabupaten/kota' })
  async createRegency(@Body() dto: CreateRegencyDto) {
    return ok(await this.service.createRegency(dto), 'Kabupaten/kota berhasil ditambahkan');
  }

  @Patch('regencies/:id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update kabupaten/kota' })
  async updateRegency(@Param('id') id: string, @Body() dto: UpdateRegencyDto) {
    return ok(await this.service.updateRegency(id, dto), 'Kabupaten/kota berhasil diperbarui');
  }

  @Delete('regencies/:id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Hapus kabupaten/kota' })
  async removeRegency(@Param('id') id: string) {
    await this.service.removeRegency(id);
    return ok(null, 'Kabupaten/kota berhasil dihapus');
  }

  // ── MASTER ITEM SARANA PRASARANA ────────────────────────────

  @Get('items')
  @ApiOperation({ summary: 'Daftar master item sarana prasarana (Lampiran E Kepsesma 240/2026)' })
  async findMasterItems(
    @Query('search') search?: string,
    @Query('includeInactive') includeInactive?: string,
    @Query('category') category?: string,
  ) {
    return ok(
      await this.service.findMasterItems({
        search,
        includeInactive: includeInactive === 'true',
        category,
      }),
    );
  }

  @Post('items')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Tambah master item' })
  async createMasterItem(@Body() dto: CreateMasterItemDto) {
    return ok(await this.service.createMasterItem(dto), 'Item master berhasil ditambahkan');
  }

  @Patch('items/:id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update master item' })
  async updateMasterItem(@Param('id') id: string, @Body() dto: UpdateMasterItemDto) {
    return ok(await this.service.updateMasterItem(id, dto), 'Item master berhasil diperbarui');
  }

  @Delete('items/:id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Hapus master item' })
  async removeMasterItem(@Param('id') id: string) {
    await this.service.removeMasterItem(id);
    return ok(null, 'Item master berhasil dihapus');
  }

  // ── MASTER KEBUTUHAN TENAGA TEKNIS ──────────────────────────

  @Get('personnel-requirements')
  @ApiOperation({ summary: 'Kebutuhan tenaga teknis per tier kapasitas (huruf D.4.e Kepsesma 240/2026)' })
  async findPersonnelRequirements() {
    return ok(await this.service.findPersonnelRequirements());
  }

  @Post('personnel-requirements')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Tambah tier kebutuhan tenaga teknis' })
  async createPersonnelRequirement(@Body() dto: CreatePersonnelRequirementDto) {
    return ok(
      await this.service.createPersonnelRequirement(dto),
      'Kebutuhan tenaga teknis berhasil ditambahkan',
    );
  }

  @Patch('personnel-requirements/:id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update tier kebutuhan tenaga teknis' })
  async updatePersonnelRequirement(
    @Param('id') id: string,
    @Body() dto: UpdatePersonnelRequirementDto,
  ) {
    return ok(
      await this.service.updatePersonnelRequirement(id, dto),
      'Kebutuhan tenaga teknis berhasil diperbarui',
    );
  }

  @Delete('personnel-requirements/:id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Hapus tier kebutuhan tenaga teknis' })
  async removePersonnelRequirement(@Param('id') id: string) {
    await this.service.removePersonnelRequirement(id);
    return ok(null, 'Kebutuhan tenaga teknis berhasil dihapus');
  }
}

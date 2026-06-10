import {
  Controller, Get, Post, Patch, Delete,
  Param, Query, Body, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { LogisticsService } from './logistics.service';
import {
  CreateShipmentDto,
  UpdateShipmentDto,
  QueryShipmentDto,
} from './dto/shipment.dto';
import {
  CreateInventoryItemDto,
  InventoryChecklistDto,
  UpdateInventoryChecklistDto,
} from './dto/inventory.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ok } from '../../common/dto/api-response.dto';

@ApiTags('Logistics')
@ApiBearerAuth()
@Controller('v1/logistics')
export class LogisticsController {
  constructor(private svc: LogisticsService) {}

  // ── SHIPMENTS ──────────────────────────────────────────────

  @Get('shipments')
  @ApiOperation({ summary: 'Daftar pengiriman' })
  findAllShipments(@Query() query: QueryShipmentDto) {
    return this.svc.findAllShipments(query);
  }

  @Get('shipments/summary')
  @ApiOperation({ summary: 'Ringkasan status pengiriman' })
  async getShipmentSummary() {
    const data = await this.svc.getShipmentSummary();
    return ok(data);
  }

  @Get('shipments/:id')
  @ApiOperation({ summary: 'Detail pengiriman' })
  async findShipment(@Param('id') id: string) {
    const data = await this.svc.findShipment(id);
    return ok(data);
  }

  @Post('shipments')
  @Roles(UserRole.SUPER_ADMIN, UserRole.LOGISTICS)
  @ApiOperation({ summary: 'Buat pengiriman baru' })
  async createShipment(
    @Body() dto: CreateShipmentDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.svc.createShipment(dto, user.id);
    return ok(data, 'Pengiriman berhasil dibuat');
  }

  @Patch('shipments/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.LOGISTICS, UserRole.COORDINATOR)
  @ApiOperation({ summary: 'Update status / catatan pengiriman' })
  async updateShipment(
    @Param('id') id: string,
    @Body() dto: UpdateShipmentDto,
  ) {
    const data = await this.svc.updateShipment(id, dto);
    return ok(data, 'Pengiriman berhasil diperbarui');
  }

  @Delete('shipments/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.LOGISTICS)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Hapus pengiriman (Logistics / Admin)' })
  async deleteShipment(@Param('id') id: string) {
    await this.svc.deleteShipment(id);
    return ok(null, 'Pengiriman berhasil dihapus');
  }

  // ── INVENTORY ITEMS ────────────────────────────────────────

  @Get('inventory/items')
  @ApiOperation({ summary: 'Daftar master item inventaris' })
  async findInventoryItems() {
    const data = await this.svc.findInventoryItems();
    return ok(data);
  }

  @Post('inventory/items')
  @Roles(UserRole.SUPER_ADMIN, UserRole.LOGISTICS)
  @ApiOperation({ summary: 'Tambah master item inventaris' })
  async createInventoryItem(@Body() dto: CreateInventoryItemDto) {
    const data = await this.svc.createInventoryItem(dto);
    return ok(data, 'Item inventaris berhasil ditambahkan');
  }

  // ── INVENTORY CHECKLISTS ───────────────────────────────────

  @Get('inventory/checklists/:locationId')
  @ApiOperation({ summary: 'Checklist penerimaan barang per lokasi' })
  async findChecklists(@Param('locationId') locationId: string) {
    const data = await this.svc.findChecklists(locationId);
    return ok(data);
  }

  @Post('inventory/checklists')
  @Roles(UserRole.SUPER_ADMIN, UserRole.LOGISTICS, UserRole.COORDINATOR)
  @ApiOperation({ summary: 'Submit / update checklist penerimaan barang' })
  async submitChecklist(
    @Body() dto: InventoryChecklistDto,
    @CurrentUser() user: any,
  ) {
    const data = await this.svc.submitChecklist(dto, user.id);
    return ok(data, 'Checklist berhasil disimpan');
  }

  @Patch('inventory/checklists/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.LOGISTICS, UserRole.COORDINATOR)
  @ApiOperation({ summary: 'Update checklist penerimaan barang' })
  async updateChecklist(
    @Param('id') id: string,
    @Body() dto: UpdateInventoryChecklistDto,
  ) {
    const data = await this.svc.updateChecklist(id, dto);
    return ok(data, 'Checklist berhasil diperbarui');
  }

  // ── BUFFER STOCK ───────────────────────────────────────────

  @Get('inventory/buffer-stock')
  @ApiOperation({ summary: 'Ketersediaan stok cadangan seluruh item' })
  async getBufferStock() {
    const data = await this.svc.getBufferStock();
    return ok(data);
  }
}

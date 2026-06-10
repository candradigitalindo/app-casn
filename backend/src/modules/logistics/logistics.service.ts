import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
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
import { paginate } from '../../common/dto/api-response.dto';

const SHIPMENT_SELECT = {
  id: true,
  shipmentNumber: true,
  originWarehouseId: true,
  destinationLocationId: true,
  destination: { select: { id: true, name: true, province: true, city: true } },
  createdById: true,
  createdBy: { select: { id: true, name: true } },
  status: true,
  manifestItems: true,
  trackingNotes: true,
  shippedAt: true,
  arrivedAt: true,
  receivedBy: true,
  receivedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class LogisticsService {
  constructor(private prisma: PrismaService) {}

  // ──────────────────────────────────────────────────────────
  // SHIPMENTS
  // ──────────────────────────────────────────────────────────

  async findAllShipments(query: QueryShipmentDto) {
    const { page = 1, limit = 20, status, destinationLocationId } = query;
    const skip = (page - 1) * limit;

    const where = {
      ...(status ? { status } : {}),
      ...(destinationLocationId ? { destinationLocationId } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.logisticsShipment.findMany({
        where,
        select: SHIPMENT_SELECT,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.logisticsShipment.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findShipment(id: string) {
    const s = await this.prisma.logisticsShipment.findUnique({
      where: { id },
      select: SHIPMENT_SELECT,
    });
    if (!s) throw new NotFoundException('Pengiriman tidak ditemukan');
    return s;
  }

  async createShipment(dto: CreateShipmentDto, createdById: string) {
    const shipmentNumber = `SHP-${Date.now()}`;

    return this.prisma.logisticsShipment.create({
      data: {
        shipmentNumber,
        originWarehouseId: dto.originWarehouseId,
        destinationLocationId: dto.destinationLocationId,
        createdById,
        manifestItems: dto.manifestItems as any,
        trackingNotes: dto.trackingNotes,
        status: 'PACKING',
      },
      select: SHIPMENT_SELECT,
    });
  }

  async updateShipment(id: string, dto: UpdateShipmentDto) {
    await this.findShipment(id);

    // Isi timestamp otomatis berdasarkan perubahan status
    const timestamps: Record<string, Date> = {};
    if (dto.status === 'IN_TRANSIT') timestamps.shippedAt = new Date();
    if (dto.status === 'ARRIVED') timestamps.arrivedAt = new Date();
    if (dto.status === 'RECEIVED') timestamps.receivedAt = new Date();

    return this.prisma.logisticsShipment.update({
      where: { id },
      data: { ...dto, ...timestamps },
      select: SHIPMENT_SELECT,
    });
  }

  async deleteShipment(id: string) {
    await this.findShipment(id);
    await this.prisma.logisticsShipment.delete({ where: { id } });
  }

  async getShipmentSummary() {
    const groups = await this.prisma.logisticsShipment.groupBy({
      by: ['status'],
      _count: { id: true },
    });
    const result: Record<string, number> = {
      packing: 0, inTransit: 0, arrived: 0, received: 0, returned: 0,
    };
    for (const g of groups) {
      const key = g.status.toLowerCase().replace('_', '');
      // Map: IN_TRANSIT → inTransit
      const mapped: Record<string, string> = {
        packing: 'packing',
        intransit: 'inTransit',
        arrived: 'arrived',
        received: 'received',
        returned: 'returned',
      };
      result[mapped[key] ?? key] = g._count.id;
    }
    return result;
  }

  // ──────────────────────────────────────────────────────────
  // INVENTORY ITEMS (master)
  // ──────────────────────────────────────────────────────────

  async findInventoryItems() {
    return this.prisma.inventoryItem.findMany({ orderBy: { name: 'asc' } });
  }

  async createInventoryItem(dto: CreateInventoryItemDto) {
    const existing = await this.prisma.inventoryItem.findUnique({
      where: { code: dto.code },
    });
    if (existing) throw new ConflictException('Kode item sudah digunakan');
    return this.prisma.inventoryItem.create({ data: dto });
  }

  // ──────────────────────────────────────────────────────────
  // INVENTORY CHECKLISTS (per lokasi)
  // ──────────────────────────────────────────────────────────

  async findChecklists(locationId: string) {
    return this.prisma.inventoryChecklist.findMany({
      where: { locationId },
      include: { item: true },
      orderBy: { item: { name: 'asc' } },
    });
  }

  async submitChecklist(dto: InventoryChecklistDto, verifiedBy: string) {
    // Upsert: update jika sudah ada, create jika belum
    return this.prisma.inventoryChecklist.upsert({
      where: { locationId_itemId: { locationId: dto.locationId, itemId: dto.itemId } },
      update: {
        receivedQty: dto.receivedQty,
        damagedQty: dto.damagedQty,
        missingQty: dto.missingQty,
        notes: dto.notes,
        photos: dto.photos,
        verifiedBy,
        verifiedAt: new Date(),
      },
      create: {
        ...dto,
        verifiedBy,
        verifiedAt: new Date(),
      },
      include: { item: true },
    });
  }

  async updateChecklist(id: string, dto: UpdateInventoryChecklistDto) {
    const cl = await this.prisma.inventoryChecklist.findUnique({ where: { id } });
    if (!cl) throw new NotFoundException('Checklist tidak ditemukan');
    return this.prisma.inventoryChecklist.update({
      where: { id },
      data: dto,
      include: { item: true },
    });
  }

  // ──────────────────────────────────────────────────────────
  // BUFFER STOCK
  // ──────────────────────────────────────────────────────────

  async getBufferStock() {
    // Hitung total penerimaan vs ekspektasi per item di seluruh lokasi
    const items = await this.prisma.inventoryItem.findMany({
      include: {
        checklists: { select: { expectedQty: true, receivedQty: true, damagedQty: true } },
      },
    });

    return items.map((item) => {
      const totalExpected = item.checklists.reduce((s, c) => s + c.expectedQty, 0);
      const totalReceived = item.checklists.reduce((s, c) => s + c.receivedQty, 0);
      const totalDamaged = item.checklists.reduce((s, c) => s + c.damagedQty, 0);
      const available = totalReceived - totalDamaged;
      return {
        itemId: item.id,
        itemCode: item.code,
        itemName: item.name,
        category: item.category,
        totalExpected,
        totalReceived,
        totalDamaged,
        available,
        fulfillmentRate: totalExpected > 0 ? Math.round((totalReceived / totalExpected) * 100) : 0,
      };
    });
  }
}

import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { InventoryCategory } from '@prisma/client';

function categoryFromItemName(name: string): InventoryCategory {
  const n = name.toLowerCase();
  if (n.includes('laptop')) return 'LAPTOP_CLIENT';
  if (n.includes('server')) return 'SERVER';
  if (n.includes('ups')) return 'UPS';
  if (n.includes('jaringan') || n.includes('switch') || n.includes('router') || n.includes('bandwidth') || n.includes('internet') || n.includes('lan')) return 'NETWORK';
  if (n.includes('metal detector')) return 'METAL_DETECTOR';
  if (n.includes('cctv')) return 'CCTV';
  if (n.includes('tenda')) return 'TENTA';
  if (n.includes('ac ') || n.startsWith('ac') || n.includes('air conditioner')) return 'AC';
  if (n.includes('genset') || n.includes('generator')) return 'GENERATOR';
  return 'OTHER';
}
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
  constructor(private prisma: PrismaService, private events: EventsGateway) {}

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
    const shipmentNumber = `SHP-${Date.now()}-${randomUUID().slice(0, 8)}`;

    const created = await this.prisma.logisticsShipment.create({
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
    this.events.emitShipmentUpdated(created.id, created);
    return created;
  }

  async updateShipment(id: string, dto: UpdateShipmentDto) {
    const shipment = await this.findShipment(id);

    // Isi timestamp otomatis berdasarkan perubahan status
    const timestamps: Record<string, Date> = {};
    if (dto.status === 'IN_TRANSIT' && !shipment.shippedAt) timestamps.shippedAt = new Date();
    if (dto.status === 'ARRIVED' && !shipment.arrivedAt) timestamps.arrivedAt = new Date();
    if (dto.status === 'RECEIVED' && !shipment.receivedAt) timestamps.receivedAt = new Date();

    const updated = await this.prisma.logisticsShipment.update({
      where: { id },
      data: { ...dto, ...timestamps },
      select: SHIPMENT_SELECT,
    });
    this.events.emitShipmentUpdated(id, updated);
    return updated;
  }

  async deleteShipment(id: string) {
    const shipment = await this.findShipment(id);
    await this.prisma.logisticsShipment.delete({ where: { id } });
    this.events.emitShipmentUpdated(id, null, shipment.destinationLocationId);
  }

  async getShipmentSummary(locationId?: string) {
    const groups = await this.prisma.logisticsShipment.groupBy({
      by: ['status'],
      where: locationId ? { destinationLocationId: locationId } : {},
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
    // Auto-seed dari MasterItem (38 item standar instansi penyelenggara) saat
    // pertama diakses — pola yang sama dengan auto-seed stages.
    const count = await this.prisma.inventoryItem.count();
    if (count === 0) {
      const masters = await this.prisma.masterItem.findMany({
        where: { isActive: true },
        orderBy: { no: 'asc' },
      });
      if (masters.length > 0) {
        await this.prisma.inventoryItem.createMany({
          data: masters.map((m) => ({
            code: `ITM-${String(m.no).padStart(2, '0')}`,
            name: m.name,
            category: categoryFromItemName(m.name),
            standardQty: m.qty100,
            // Kuantitas standar per tier kapasitas — dipakai frontend untuk
            // menampilkan jumlah seharusnya sesuai kapasitas lokasi tujuan.
            specifications: {
              unit: m.unit,
              qty100: m.qty100,
              qty200: m.qty200,
              qty300: m.qty300,
              qty400: m.qty400,
              qty500: m.qty500,
            },
          })),
          skipDuplicates: true,
        });
      }
    }
    return this.prisma.inventoryItem.findMany({ orderBy: { code: 'asc' } });
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
        expectedQty: dto.expectedQty,
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

  async getBufferStock(locationId?: string) {
    // Hitung total penerimaan vs ekspektasi per item di seluruh lokasi
    const items = await this.prisma.inventoryItem.findMany({
      include: {
        checklists: { where: locationId ? { locationId } : {}, select: { expectedQty: true, receivedQty: true, damagedQty: true } },
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

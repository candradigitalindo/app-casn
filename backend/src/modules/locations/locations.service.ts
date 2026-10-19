import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { LocationStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { syncInstallationStageFromItems } from '../../common/utils/installation-progress.util';
import { lockLocation } from '../../common/utils/lock-location.util';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { QueryLocationDto } from './dto/query-location.dto';
import {
  CreateLocationItemDto,
  UpdateLocationItemDto,
  UpdateCapacityDto,
} from './dto/location-item.dto';
import { paginate } from '../../common/dto/api-response.dto';

const LOCATION_SELECT = {
  id: true,
  code: true,
  name: true,
  province: true,
  city: true,
  address: true,
  latitude: true,
  longitude: true,
  status: true,
  capacity: true,
  startDate: true,
  endDate: true,
  coordinatorId: true,
  coordinator: {
    select: { id: true, name: true, phone: true, email: true },
  },
  metadata: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class LocationsService {
  constructor(private prisma: PrismaService, private events: EventsGateway) {}

  // ──────────────────────────────────────────────────────────
  // CRUD
  // ──────────────────────────────────────────────────────────

  async findAll(query: QueryLocationDto) {
    const { page = 1, limit = 500, province, city, status, search, locationId } = query;
    const skip = (page - 1) * limit;

    const where = {
      ...(locationId ? { id: locationId } : {}),
      ...(province ? { province: { contains: province, mode: 'insensitive' as const } } : {}),
      ...(city ? { city: { contains: city, mode: 'insensitive' as const } } : {}),
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { code: { contains: search, mode: 'insensitive' as const } },
              { city: { contains: search, mode: 'insensitive' as const } },
              { province: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.location.findMany({
        where,
        select: LOCATION_SELECT,
        skip,
        take: limit,
        orderBy: [{ province: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.location.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findOne(id: string) {
    const loc = await this.prisma.location.findUnique({
      where: { id },
      select: LOCATION_SELECT,
    });
    if (!loc) throw new NotFoundException('Lokasi tidak ditemukan');
    return loc;
  }

  async create(dto: CreateLocationDto) {
    const existing = await this.prisma.location.findUnique({
      where: { code: dto.code },
    });
    if (existing) throw new ConflictException('Kode lokasi sudah digunakan');

    const location = await this.prisma.$transaction(async (tx) => {
      const created = await tx.location.create({
        data: {
          ...dto,
          startDate: dto.startDate ? new Date(dto.startDate) : undefined,
          endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        },
        select: LOCATION_SELECT,
      });
      if (created.capacity > 0) {
        await this.syncItemsFromMaster(created.id, created.capacity, tx);
        await syncInstallationStageFromItems(tx, created.id);
      }
      return tx.location.findUniqueOrThrow({ where: { id: created.id }, select: LOCATION_SELECT });
    });
    this.events.emitLocationUpdated(location.id, location);
    return location;
  }

  async update(id: string, dto: UpdateLocationDto) {
    await this.findOne(id);
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.location.update({
        where: { id },
        data: {
          ...dto,
          startDate: dto.startDate ? new Date(dto.startDate) : undefined,
          endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        },
      });
      // PATCH umum dan PATCH capacity wajib memakai aturan kuantitas yang sama.
      if (dto.capacity !== undefined) {
        await this.syncItemsFromMaster(id, dto.capacity, tx);
        await syncInstallationStageFromItems(tx, id);
      }
      return tx.location.findUniqueOrThrow({ where: { id }, select: LOCATION_SELECT });
    });
    this.events.emitLocationUpdated(id, updated);
    return updated;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.$transaction(async (tx) => {
      await lockLocation(tx, id);
      // FK SetNull tidak boleh mengubah akun lokal menjadi akun cakupan global.
      await tx.user.updateMany({ where: { locationId: id }, data: { isActive: false } });
      await tx.location.delete({ where: { id } });
    });
    this.events.emitLocationUpdated(id, null);
  }

  // ──────────────────────────────────────────────────────────
  // STATS
  // ──────────────────────────────────────────────────────────

  async getStatsSummary(locationId?: string) {
    const [locations, openTickets, resolvedTickets, itemAgg, inTransit] = await Promise.all([
      this.prisma.location.groupBy({ by: ['status'], where: locationId ? { id: locationId } : {}, _count: { id: true } }),
      this.prisma.incidentTicket.count({
        where: { ...(locationId ? { locationId } : {}), status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'ESCALATED'] } },
      }),
      this.prisma.incidentTicket.count({ where: { ...(locationId ? { locationId } : {}), status: { in: ['RESOLVED', 'CLOSED'] } } }),
      this.prisma.locationItem.aggregate({ where: locationId ? { locationId } : {}, _avg: { installationPct: true } }),
      this.prisma.logisticsShipment.count({ where: { ...(locationId ? { destinationLocationId: locationId } : {}), status: 'IN_TRANSIT' } }),
    ]);

    const byStatus: Record<string, number> = {};
    let total = 0;
    for (const g of locations) {
      byStatus[g.status] = g._count.id;
      total += g._count.id;
    }

    const avgInstallation = Math.round(itemAgg._avg.installationPct ?? 0);

    return {
      totalLocations: total,
      activeLocations: (byStatus['READY'] ?? 0),
      openTickets,
      resolvedTickets,
      installationProgress: avgInstallation,
      shipmentInTransit: inTransit,
    };
  }

  async getStatsProvince(locationId?: string) {
    const locations = await this.prisma.location.findMany({
      where: locationId ? { id: locationId } : {},
      select: {
        province: true,
        status: true,
        _count: { select: { incidentTickets: { where: { status: { notIn: ['RESOLVED', 'CLOSED'] } } } } },
      },
    });

    const map = new Map<string, Record<LocationStatus | 'total' | 'issues', number>>();

    for (const loc of locations) {
      if (!map.has(loc.province)) {
        map.set(loc.province, {
          total: 0,
          issues: 0,
          PREPARATION: 0,
          INSTALLATION_IN_PROGRESS: 0,
          READY: 0,
          CLOSED: 0,
        });
      }
      const entry = map.get(loc.province)!;
      entry.total++;
      entry.issues += loc._count.incidentTickets;
      entry[loc.status]++;
    }

    return Array.from(map.entries()).map(([province, counts]) => ({
      province,
      total: counts.total,
      ready: counts.READY,
      active: counts.READY, // alias untuk kompatibilitas frontend
      issues: counts.issues,
      preparation: counts.PREPARATION,
      installationInProgress: counts.INSTALLATION_IN_PROGRESS,
    }));
  }

  // ──────────────────────────────────────────────────────────
  // ITEMS (barang di lokasi)
  // ──────────────────────────────────────────────────────────

  async getItems(locationId: string) {
    await this.findOne(locationId);
    return this.prisma.locationItem.findMany({
      where: { locationId },
      orderBy: { name: 'asc' },
    });
  }

  async getAllItems(locationId?: string) {
    return this.prisma.locationItem.findMany({
      where: locationId ? { locationId } : {},
      include: { location: { select: { id: true, name: true, province: true } } },
      orderBy: [{ location: { province: 'asc' } }, { name: 'asc' }],
    });
  }

  async createItem(locationId: string, dto: CreateLocationItemDto) {
    await this.findOne(locationId);
    const created = await this.prisma.$transaction(async (tx) => {
      await lockLocation(tx, locationId);
      const item = await tx.locationItem.create({ data: { ...dto, locationId } });
      await syncInstallationStageFromItems(tx, locationId);
      return item;
    });
    this.events.emitInstallationUpdated(locationId, created);
    return created;
  }

  async updateItem(locationId: string, itemId: string, dto: UpdateLocationItemDto) {
    const updated = await this.prisma.$transaction(async (tx) => {
      await lockLocation(tx, locationId);
      const item = await tx.locationItem.findFirst({ where: { id: itemId, locationId } });
      if (!item) throw new NotFoundException('Item tidak ditemukan');
      const result = await tx.locationItem.update({ where: { id: itemId }, data: dto });
      await syncInstallationStageFromItems(tx, locationId);
      return result;
    });
    this.events.emitInstallationUpdated(locationId, updated);
    return updated;
  }

  async deleteItem(locationId: string, itemId: string) {
    await this.prisma.$transaction(async (tx) => {
      await lockLocation(tx, locationId);
      const item = await tx.locationItem.findFirst({ where: { id: itemId, locationId } });
      if (!item) throw new NotFoundException('Item tidak ditemukan');
      await tx.locationItem.delete({ where: { id: itemId } });
      await syncInstallationStageFromItems(tx, locationId);
    });
    this.events.emitInstallationUpdated(locationId, null);
  }

  async updateCapacity(id: string, dto: UpdateCapacityDto) {
    await this.findOne(id);
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.location.update({ where: { id }, data: { capacity: dto.capacity } });
      const updatedItems = await this.syncItemsFromMaster(id, dto.capacity, tx);
      await syncInstallationStageFromItems(tx, id);
      const location = await tx.location.findUniqueOrThrow({ where: { id }, select: LOCATION_SELECT });
      return { location, updatedItems };
    });
    this.events.emitLocationUpdated(id, result.location);
    this.events.emitInstallationUpdated(id, null);
    return result;
  }

  // ──────────────────────────────────────────────────────────
  // ITEM STANDAR — MASTER DATA
  // Sumber: Lampiran E Kepsesma BKN No 240 Tahun 2026
  // (38 item, tier 100–500 peserta/sesi)
  // ──────────────────────────────────────────────────────────

  // Kapasitas riil dibulatkan ke atas ke tier terdekat (100/200/300/400/500)
  private tierForCapacity(capacity: number): 100 | 200 | 300 | 400 | 500 {
    const tier = Math.ceil(Math.max(capacity, 1) / 100) * 100;
    return Math.min(Math.max(tier, 100), 500) as 100 | 200 | 300 | 400 | 500;
  }

  // Upsert LocationItem dari master data: item yang sudah ada (match nama)
  // di-update kuantitasnya, yang belum ada dibuat. Item kustom dibiarkan.
  private async syncItemsFromMaster(locationId: string, capacity: number, prisma: Prisma.TransactionClient) {
    const tier = this.tierForCapacity(capacity);
    const qtyField = `qty${tier}` as 'qty100' | 'qty200' | 'qty300' | 'qty400' | 'qty500';

    const masterItems = await prisma.masterItem.findMany({
      where: { isActive: true },
      orderBy: { no: 'asc' },
    });

    const existing = await prisma.locationItem.findMany({
      where: { locationId },
      select: { id: true, name: true },
    });
    const byName = new Map(existing.map((i) => [i.name, i.id]));

    const results: Awaited<ReturnType<typeof prisma.locationItem.create>>[] = [];
    for (const m of masterItems) {
      const qty = m[qtyField];
      const existingId = byName.get(m.name);

      if (existingId) {
        results.push(
          await prisma.locationItem.update({
            where: { id: existingId },
            data: { qty, unit: m.unit },
          }),
        );
      } else {
        results.push(
          await prisma.locationItem.create({
            data: {
              locationId,
              name: m.name,
              qty,
              unit: m.unit,
              ownership: m.ownership,
              condition: 'BAIK',
              installationPct: 0,
            },
          }),
        );
      }
    }
    return results;
  }

  // Endpoint seed-standard: generate/sinkron item dari master data.
  // Bila `capacity` dikirim dari dialog, kapasitas lokasi ikut diperbarui
  // sehingga pilihan pengguna benar-benar dipakai (bukan diabaikan).
  async seedStandardItems(locationId: string, capacity?: number) {
    const loc = await this.prisma.location.findUnique({
      where: { id: locationId },
      select: { capacity: true },
    });
    if (!loc) throw new NotFoundException('Lokasi tidak ditemukan');

    const effectiveCapacity = capacity ?? loc.capacity;
    const results = await this.prisma.$transaction(async (tx) => {
      await lockLocation(tx, locationId);
      if (capacity !== undefined && capacity !== loc.capacity) {
        await tx.location.update({ where: { id: locationId }, data: { capacity } });
      }
      const items = await this.syncItemsFromMaster(locationId, effectiveCapacity, tx);
      await syncInstallationStageFromItems(tx, locationId);
      return items;
    });
    this.events.emitLocationUpdated(locationId, null);
    this.events.emitInstallationUpdated(locationId, null);
    return results;
  }

  // Master item standar (untuk halaman referensi/admin)
  async getMasterItems() {
    return this.prisma.masterItem.findMany({
      where: { isActive: true },
      orderBy: { no: 'asc' },
    });
  }

  // Geo boundaries (data statis — bisa diganti dengan data GeoJSON nyata)
  getGeoBoundaries() {
    return {
      type: 'FeatureCollection',
      features: [],
      message: 'GeoJSON boundaries akan diisi setelah data shapefile provinsi tersedia',
    };
  }

  // Installations summary per location
  async getInstallations(locationId: string) {
    await this.findOne(locationId);
    return this.prisma.installationProgress.findMany({
      where: { locationId },
      orderBy: { percentage: 'asc' },
    });
  }
}

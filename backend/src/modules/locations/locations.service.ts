import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { LocationStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { syncLocationStatusFromStages } from '../../common/utils/location-status.util';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { QueryLocationDto } from './dto/query-location.dto';
import {
  CreateLocationItemDto,
  UpdateLocationItemDto,
  UpdateCapacityDto,
} from './dto/location-item.dto';
import { paginate, ok } from '../../common/dto/api-response.dto';

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
  constructor(private prisma: PrismaService) {}

  // ──────────────────────────────────────────────────────────
  // CRUD
  // ──────────────────────────────────────────────────────────

  async findAll(query: QueryLocationDto) {
    const { page = 1, limit = 20, province, city, status, search } = query;
    const skip = (page - 1) * limit;

    const where = {
      ...(province ? { province: { contains: province, mode: 'insensitive' as const } } : {}),
      ...(city ? { city: { contains: city, mode: 'insensitive' as const } } : {}),
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { code: { contains: search, mode: 'insensitive' as const } },
              { city: { contains: search, mode: 'insensitive' as const } },
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

    const location = await this.prisma.location.create({
      data: {
        ...dto,
        latitude: dto.latitude,
        longitude: dto.longitude,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
      select: LOCATION_SELECT,
    });

    // Auto-generate item standar dari master data sesuai kapasitas,
    // sehingga titik lokasi baru langsung sinkron dengan standar BKN.
    if (location.capacity > 0) {
      await this.syncItemsFromMaster(location.id, location.capacity);
    }

    return location;
  }

  async update(id: string, dto: UpdateLocationDto) {
    await this.findOne(id);
    return this.prisma.location.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
      select: LOCATION_SELECT,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.location.delete({ where: { id } });
  }

  // ──────────────────────────────────────────────────────────
  // STATS
  // ──────────────────────────────────────────────────────────

  async getStatsSummary() {
    const [locations, openTickets, resolvedTickets, checkedIn] = await Promise.all([
      this.prisma.location.groupBy({ by: ['status'], _count: { id: true } }),
      this.prisma.incidentTicket.count({
        where: { status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'ESCALATED'] } },
      }),
      this.prisma.incidentTicket.count({ where: { status: 'RESOLVED' } }),
      this.prisma.attendanceLog.count(),
    ]);

    const byStatus: Record<string, number> = {};
    let total = 0;
    for (const g of locations) {
      byStatus[g.status] = g._count.id;
      total += g._count.id;
    }

    // Progress instalasi rata-rata (dari milestone tertinggi yang COMPLETED)
    const progresses = await this.prisma.installationProgress.findMany({
      select: { percentage: true },
    });
    const avgInstallation =
      progresses.length > 0
        ? Math.round(progresses.reduce((s, p) => s + p.percentage, 0) / progresses.length)
        : 0;

    const inTransit = await this.prisma.logisticsShipment.count({
      where: { status: 'IN_TRANSIT' },
    });

    return {
      totalLocations: total,
      activeLocations: (byStatus['READY'] ?? 0),
      totalParticipants: 0,       // akan terisi saat modul attendance aktif
      checkedInParticipants: checkedIn,
      openTickets,
      resolvedTickets,
      installationProgress: avgInstallation,
      shipmentInTransit: inTransit,
    };
  }

  async getStatsProvince() {
    const locations = await this.prisma.location.findMany({
      select: { province: true, status: true },
    });

    const map = new Map<string, Record<LocationStatus | 'total', number>>();

    for (const loc of locations) {
      if (!map.has(loc.province)) {
        map.set(loc.province, {
          total: 0,
          PREPARATION: 0,
          INSTALLATION_IN_PROGRESS: 0,
          READY: 0,
          CLOSED: 0,
        });
      }
      const entry = map.get(loc.province)!;
      entry.total++;
      entry[loc.status]++;
    }

    return Array.from(map.entries()).map(([province, counts]) => ({
      province,
      total: counts.total,
      ready: counts.READY,
      active: counts.READY, // alias untuk kompatibilitas frontend
      issues: 0,
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

  async getAllItems() {
    return this.prisma.locationItem.findMany({
      include: { location: { select: { id: true, name: true, province: true } } },
      orderBy: [{ location: { province: 'asc' } }, { name: 'asc' }],
    });
  }

  async createItem(locationId: string, dto: CreateLocationItemDto) {
    await this.findOne(locationId);
    const created = await this.prisma.locationItem.create({
      data: { ...dto, locationId },
    });
    await this.syncInstallationStageFromItems(locationId);
    return created;
  }

  async updateItem(locationId: string, itemId: string, dto: UpdateLocationItemDto) {
    const item = await this.prisma.locationItem.findFirst({
      where: { id: itemId, locationId },
    });
    if (!item) throw new NotFoundException('Item tidak ditemukan');
    const updated = await this.prisma.locationItem.update({ where: { id: itemId }, data: dto });
    await this.syncInstallationStageFromItems(locationId);
    return updated;
  }

  async deleteItem(locationId: string, itemId: string) {
    const item = await this.prisma.locationItem.findFirst({
      where: { id: itemId, locationId },
    });
    if (!item) throw new NotFoundException('Item tidak ditemukan');
    await this.prisma.locationItem.delete({ where: { id: itemId } });
    await this.syncInstallationStageFromItems(locationId);
  }

  // Fase INSTALASI tahapan pekerjaan mengikuti rata-rata persentase
  // instalasi barang di lokasi — sumber yang sama dengan halaman Instalasi.
  private async syncInstallationStageFromItems(locationId: string) {
    const items = await this.prisma.locationItem.findMany({
      where: { locationId },
      select: { installationPct: true },
    });
    const avg = items.length
      ? Math.round(items.reduce((s, i) => s + i.installationPct, 0) / items.length)
      : 0;
    const allComplete = items.length > 0 && items.every((i) => i.installationPct >= 100);
    const status = allComplete ? 'COMPLETED' : avg > 0 ? 'IN_PROGRESS' : 'NOT_STARTED';

    await this.prisma.locationStage.upsert({
      where: { locationId_phase: { locationId, phase: 'INSTALASI' } },
      create: {
        locationId,
        phase: 'INSTALASI',
        status,
        progress: Math.min(avg, 100),
        ...(status !== 'NOT_STARTED' ? { startedAt: new Date() } : {}),
        ...(allComplete ? { completedAt: new Date() } : {}),
      },
      update: {
        status,
        progress: Math.min(avg, 100),
        ...(status === 'IN_PROGRESS' ? { completedAt: null } : {}),
        ...(allComplete ? { completedAt: new Date() } : {}),
      },
    });

    await syncLocationStatusFromStages(this.prisma, locationId);
  }

  async updateCapacity(id: string, dto: UpdateCapacityDto) {
    await this.findOne(id);
    const updated = await this.prisma.location.update({
      where: { id },
      data: { capacity: dto.capacity },
      select: LOCATION_SELECT,
    });

    // Sinkronkan ulang kuantitas item standar mengikuti kapasitas baru.
    // Item kustom (yang tidak ada di master) tidak disentuh.
    const updatedItems = await this.syncItemsFromMaster(id, dto.capacity);

    return { location: updated, updatedItems };
  }

  // ──────────────────────────────────────────────────────────
  // ITEM STANDAR — MASTER DATA
  // Sumber: Lampiran 2 Dok. Pengumuman Katalog Elektronik BKN
  // No 113/D23/DPPP/04/2026 (38 item, tier 100–500 peserta/sesi)
  // ──────────────────────────────────────────────────────────

  // Kapasitas riil dibulatkan ke atas ke tier terdekat (100/200/300/400/500)
  private tierForCapacity(capacity: number): 100 | 200 | 300 | 400 | 500 {
    const tier = Math.ceil(Math.max(capacity, 1) / 100) * 100;
    return Math.min(Math.max(tier, 100), 500) as 100 | 200 | 300 | 400 | 500;
  }

  // Upsert LocationItem dari master data: item yang sudah ada (match nama)
  // di-update kuantitasnya, yang belum ada dibuat. Item kustom dibiarkan.
  private async syncItemsFromMaster(locationId: string, capacity: number) {
    const tier = this.tierForCapacity(capacity);
    const qtyField = `qty${tier}` as 'qty100' | 'qty200' | 'qty300' | 'qty400' | 'qty500';

    const masterItems = await this.prisma.masterItem.findMany({
      where: { isActive: true },
      orderBy: { no: 'asc' },
    });

    const existing = await this.prisma.locationItem.findMany({
      where: { locationId },
      select: { id: true, name: true },
    });
    const byName = new Map(existing.map((i) => [i.name, i.id]));

    const results: Awaited<ReturnType<typeof this.prisma.locationItem.create>>[] = [];
    for (const m of masterItems) {
      const qty = m[qtyField];
      const existingId = byName.get(m.name);

      if (existingId) {
        results.push(
          await this.prisma.locationItem.update({
            where: { id: existingId },
            data: { qty, unit: m.unit },
          }),
        );
      } else {
        results.push(
          await this.prisma.locationItem.create({
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

  // Endpoint seed-standard: generate/sinkron item dari master data
  async seedStandardItems(locationId: string) {
    const loc = await this.prisma.location.findUnique({
      where: { id: locationId },
      select: { capacity: true },
    });
    if (!loc) throw new NotFoundException('Lokasi tidak ditemukan');

    const results = await this.syncItemsFromMaster(locationId, loc.capacity);
    await this.syncInstallationStageFromItems(locationId);
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

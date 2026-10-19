import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ok } from '../../common/dto/api-response.dto';
import { summarizeInstallation } from '../../common/utils/installation-progress.util';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getLocationsReport(locationId?: string) {
    const locations = await this.prisma.location.findMany({
      where: locationId ? { id: locationId } : {},
      select: {
        id: true,
        code: true,
        name: true,
        province: true,
        city: true,
        status: true,
        capacity: true,
        startDate: true,
        endDate: true,
        coordinator: { select: { name: true } },
        incidentTickets: { select: { id: true, status: true, severity: true } },
        locationItems: { select: { installationPct: true } },
      },
      orderBy: [{ province: 'asc' }, { name: 'asc' }],
    });

    const data = locations.map((loc) => ({
      ...loc,
      openTickets: loc.incidentTickets.filter((t) => !['RESOLVED', 'CLOSED'].includes(t.status)).length,
      criticalTickets: loc.incidentTickets.filter((t) => t.severity === 'CRITICAL' && !['RESOLVED', 'CLOSED'].includes(t.status)).length,
      installationAvgPct: summarizeInstallation(loc.locationItems).average,
    }));

    return ok(data);
  }

  async getIncidentsReport(locationId?: string) {
    const tickets = await this.prisma.incidentTicket.findMany({
      where: locationId ? { locationId } : {},
      orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
      include: {
        location: { select: { name: true, province: true } },
        assignee: { select: { name: true } },
      },
    });

    const now = new Date();
    const summary = {
      total: tickets.length,
      open: tickets.filter((t) => t.status === 'OPEN').length,
      inProgress: tickets.filter((t) => t.status === 'IN_PROGRESS').length,
      resolved: tickets.filter((t) => ['RESOLVED', 'CLOSED'].includes(t.status)).length,
      overdueSLA: tickets.filter((t) => t.slaExpiresAt < now && !['RESOLVED', 'CLOSED'].includes(t.status)).length,
      avgResolutionMinutes: (() => {
        const resolved = tickets.filter((t) => t.resolvedAt);
        if (!resolved.length) return 0;
        const total = resolved.reduce((s, t) => s + (t.resolvedAt!.getTime() - t.createdAt.getTime()) / 60_000, 0);
        return Math.round(total / resolved.length);
      })(),
    };

    return ok({ summary, tickets });
  }

  async getLogisticsReport(locationId?: string) {
    const shipments = await this.prisma.logisticsShipment.findMany({
      where: locationId ? { destinationLocationId: locationId } : {},
      orderBy: { createdAt: 'desc' },
      include: {
        destination: { select: { name: true, province: true } },
        createdBy: { select: { name: true } },
      },
    });

    const summary = {
      total: shipments.length,
      packing: shipments.filter((s) => s.status === 'PACKING').length,
      inTransit: shipments.filter((s) => s.status === 'IN_TRANSIT').length,
      arrived: shipments.filter((s) => s.status === 'ARRIVED').length,
      received: shipments.filter((s) => s.status === 'RECEIVED').length,
    };

    return ok({ summary, shipments });
  }

  async getInstallationsReport(locationId?: string) {
    const locations = await this.prisma.location.findMany({
      where: locationId ? { id: locationId } : {},
      select: {
        id: true,
        name: true,
        province: true,
        status: true,
        locationItems: { orderBy: { name: 'asc' } },
      },
      orderBy: [{ province: 'asc' }, { name: 'asc' }],
    });

    const data = locations.map((loc) => {
      const items = loc.locationItems;
      const summary = summarizeInstallation(items);
      return {
        locationId: loc.id,
        locationName: loc.name,
        province: loc.province,
        status: loc.status,
        completedMilestones: summary.completed,
        totalMilestones: summary.total,
        averagePercentage: summary.average,
        items,
      };
    });

    return ok(data);
  }

  async getExecutiveDashboard(locationId?: string) {
    const [
      totalLocations,
      readyLocations,
      totalTickets,
      openTickets,
      totalShipments,
      receivedShipments,
      totalPersonnel,
    ] = await Promise.all([
      this.prisma.location.count({ where: locationId ? { id: locationId } : {} }),
      this.prisma.location.count({ where: { ...(locationId ? { id: locationId } : {}), status: 'READY' } }),
      this.prisma.incidentTicket.count({ where: locationId ? { locationId } : {} }),
      this.prisma.incidentTicket.count({ where: { ...(locationId ? { locationId } : {}), status: { notIn: ['RESOLVED', 'CLOSED'] } } }),
      this.prisma.logisticsShipment.count({ where: locationId ? { destinationLocationId: locationId } : {} }),
      this.prisma.logisticsShipment.count({ where: { ...(locationId ? { destinationLocationId: locationId } : {}), status: 'RECEIVED' } }),
      this.prisma.personnel.count({ where: locationId ? { locationId } : {} }),
    ]);

    const locationsByStatus = await this.prisma.location.groupBy({
      by: ['status'],
      where: locationId ? { id: locationId } : {},
      _count: { id: true },
    });

    const locationsByProvince = await this.prisma.location.groupBy({
      by: ['province'],
      where: locationId ? { id: locationId } : {},
      _count: { id: true },
      orderBy: { province: 'asc' },
    });

    return ok({
      kpi: {
        totalLocations,
        readyLocations,
        readinessRate: totalLocations ? Math.round((readyLocations / totalLocations) * 100) : 0,
        totalTickets,
        openTickets,
        totalShipments,
        receivedShipments,
        logisticsRate: totalShipments ? Math.round((receivedShipments / totalShipments) * 100) : 0,
        totalPersonnel,
      },
      locationsByStatus: locationsByStatus.map((r) => ({ status: r.status, count: r._count.id })),
      locationsByProvince: locationsByProvince.map((r) => ({ province: r.province, count: r._count.id })),
    });
  }

  async getAuditLog(query: { entityType?: string; userId?: string; page?: number; limit?: number }) {
    const { entityType, userId } = query;
    // Query string masuk sebagai string — koersi eksplisit untuk Prisma skip/take
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 50);
    if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) || limit < 1 || limit > 1000) {
      throw new BadRequestException('page harus bilangan bulat positif dan limit harus antara 1 dan 1000');
    }
    const skip = (page - 1) * limit;

    const where: any = {};
    if (entityType) where.entityType = entityType;
    if (userId) where.userId = userId;

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true, role: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return ok({ data, total, page, limit, totalPages: Math.ceil(total / limit) });
  }

  // Rekap berita acara: matriks lokasi × jenis BA dengan status approval —
  // memenuhi spesifikasi "laporan hasil upload berita acara".
  async getBeritaAcaraReport(locationId?: string) {
    const locations = await this.prisma.location.findMany({
      where: locationId ? { id: locationId } : {},
      select: {
        id: true,
        name: true,
        province: true,
        city: true,
        beritaAcara: {
          select: {
            id: true,
            type: true,
            status: true,
            title: true,
            date: true,
            createdAt: true,
            approvedAt: true,
            approvedBy: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    const data = locations.map((loc) => {
      const byType: Record<string, { count: number; latestStatus: string | null }> = {};
      for (const ba of loc.beritaAcara) {
        if (!byType[ba.type]) byType[ba.type] = { count: 0, latestStatus: ba.status };
        byType[ba.type].count += 1;
      }
      return {
        locationId: loc.id,
        locationName: loc.name,
        province: loc.province,
        city: loc.city,
        totalBA: loc.beritaAcara.length,
        pendingCount: loc.beritaAcara.filter((b) => b.status === 'PENDING_APPROVAL').length,
        approvedCount: loc.beritaAcara.filter((b) => b.status === 'FINAL').length,
        rejectedCount: loc.beritaAcara.filter((b) => b.status === 'REJECTED').length,
        byType,
        items: loc.beritaAcara,
      };
    });

    return ok(data);
  }
}

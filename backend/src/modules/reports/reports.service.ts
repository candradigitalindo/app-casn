import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ok } from '../../common/dto/api-response.dto';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getLocationsReport() {
    const locations = await this.prisma.location.findMany({
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
        installationProgress: { select: { milestone: true, percentage: true } },
      },
      orderBy: [{ province: 'asc' }, { name: 'asc' }],
    });

    const data = locations.map((loc) => ({
      ...loc,
      openTickets: loc.incidentTickets.filter((t) => !['RESOLVED', 'CLOSED'].includes(t.status)).length,
      criticalTickets: loc.incidentTickets.filter((t) => t.severity === 'CRITICAL' && !['RESOLVED', 'CLOSED'].includes(t.status)).length,
      installationAvgPct: loc.installationProgress.length
        ? Math.round(loc.installationProgress.reduce((s, m) => s + m.percentage, 0) / loc.installationProgress.length)
        : 0,
    }));

    return ok(data);
  }

  async getAttendanceReport(locationId?: string) {
    const where: any = {};
    if (locationId) where.locationId = locationId;

    const [logs, total] = await Promise.all([
      this.prisma.attendanceLog.findMany({
        where,
        orderBy: [{ locationId: 'asc' }, { session: 'asc' }, { scanTime: 'asc' }],
        include: { location: { select: { name: true, province: true } } },
      }),
      this.prisma.attendanceLog.count({ where }),
    ]);

    // Group by location + session
    const grouped: Record<string, any> = {};
    for (const log of logs) {
      const key = `${log.locationId}-${log.session}`;
      if (!grouped[key]) {
        grouped[key] = {
          locationId: log.locationId,
          locationName: (log as any).location?.name,
          session: log.session,
          count: 0,
          firstScan: log.scanTime,
          lastScan: log.scanTime,
        };
      }
      grouped[key].count++;
      if (log.scanTime < grouped[key].firstScan) grouped[key].firstScan = log.scanTime;
      if (log.scanTime > grouped[key].lastScan) grouped[key].lastScan = log.scanTime;
    }

    return ok({ total, bySession: Object.values(grouped), logs });
  }

  async getIncidentsReport() {
    const tickets = await this.prisma.incidentTicket.findMany({
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

  async getLogisticsReport() {
    const shipments = await this.prisma.logisticsShipment.findMany({
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

  async getInstallationsReport() {
    const locations = await this.prisma.location.findMany({
      select: {
        id: true,
        name: true,
        province: true,
        status: true,
        installationProgress: { orderBy: { milestone: 'asc' } },
      },
      orderBy: [{ province: 'asc' }, { name: 'asc' }],
    });

    const data = locations.map((loc) => {
      const milestones = loc.installationProgress;
      const completed = milestones.filter((m) => m.percentage >= 100).length;
      const avgPct = milestones.length
        ? Math.round(milestones.reduce((s, m) => s + m.percentage, 0) / milestones.length)
        : 0;
      return {
        locationId: loc.id,
        locationName: loc.name,
        province: loc.province,
        status: loc.status,
        completedMilestones: completed,
        totalMilestones: 4,
        averagePercentage: avgPct,
        milestones,
      };
    });

    return ok(data);
  }

  async getExecutiveDashboard() {
    const [
      totalLocations,
      readyLocations,
      totalTickets,
      openTickets,
      totalAttendance,
      totalShipments,
      receivedShipments,
      totalPersonnel,
    ] = await Promise.all([
      this.prisma.location.count(),
      this.prisma.location.count({ where: { status: 'READY' } }),
      this.prisma.incidentTicket.count(),
      this.prisma.incidentTicket.count({ where: { status: { notIn: ['RESOLVED', 'CLOSED'] } } }),
      this.prisma.attendanceLog.count(),
      this.prisma.logisticsShipment.count(),
      this.prisma.logisticsShipment.count({ where: { status: 'RECEIVED' } }),
      this.prisma.personnel.count(),
    ]);

    const locationsByStatus = await this.prisma.location.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    const locationsByProvince = await this.prisma.location.groupBy({
      by: ['province'],
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
        totalAttendance,
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
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 50;
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
}

import { Injectable } from '@nestjs/common';
import { NotificationSeverity, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { paginate } from '../../common/dto/api-response.dto';
import { operationState } from '../operations/operations-state';
import { summarizeInstallation } from '../../common/utils/installation-progress.util';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private events: EventsGateway,
  ) {}

  private scope(user: {
    id: string;
    locationId?: string | null;
  }): Prisma.NotificationWhereInput {
    return {
      userId: user.id,
      ...(user.locationId
        ? { OR: [{ locationId: user.locationId }, { locationId: null }] }
        : {}),
    };
  }
  async list(
    user: { id: string; locationId?: string | null },
    query: PaginationDto,
    unread = false,
  ) {
    const page = query.page ?? 1,
      limit = query.limit ?? 20;
    const where = { ...this.scope(user), ...(unread ? { readAt: null } : {}) };
    const [data, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: { ...this.scope(user), readAt: null },
      }),
    ]);
    return { ...paginate(data, total, page, limit), unreadCount };
  }
  async read(userId: string, id?: string) {
    await this.prisma.notification.updateMany({
      where: { userId, ...(id ? { id } : {}), readAt: null },
      data: { readAt: new Date() },
    });
    this.events.server?.to(`user:${userId}`).emit('notification:updated');
  }

  async refresh() {
    const now = new Date(),
      soon = new Date(now.getTime() + 15 * 60000);
    const [users, bas, tickets, locations, backup, monitor, restore] =
      await Promise.all([
        this.prisma.user.findMany({
          where: { isActive: true },
          select: { id: true, role: true, locationId: true },
        }),
        this.prisma.beritaAcara.findMany({
          where: { status: 'PENDING_APPROVAL' },
          select: { id: true, locationId: true, title: true },
        }),
        this.prisma.incidentTicket.findMany({
          where: {
            status: { notIn: ['RESOLVED', 'CLOSED'] },
            OR: [{ slaExpiresAt: { lte: soon } }, { severity: 'CRITICAL' }],
          },
          select: {
            id: true,
            ticketNumber: true,
            title: true,
            locationId: true,
            assignedTo: true,
            reportedBy: true,
            slaExpiresAt: true,
            severity: true,
          },
        }),
        this.prisma.location.findMany({
          where: {
            status: { notIn: ['READY', 'CLOSED'] },
            startDate: { lt: new Date(now.getTime() - 86400000) },
          },
          select: {
            id: true,
            name: true,
            locationItems: { select: { installationPct: true } },
          },
        }),
        operationState('latest-backup'),
        operationState('latest-health'),
        operationState('latest-restore-check'),
      ]);
    const pending: Prisma.NotificationCreateManyInput[] = [];
    const liveKeys = new Set<string>();
    const add = (
      type: string,
      entityId: string,
      locationId: string | null,
      title: string,
      message: string,
      href: string,
      severity: NotificationSeverity,
      roles: UserRole[],
      personal: string[] = [],
    ) => {
      const dedupeKey = `${type}:${entityId}`;
      liveKeys.add(dedupeKey);
      for (const user of users) {
        if (user.locationId && user.locationId !== locationId) continue;
        if (!roles.includes(user.role) && !personal.includes(user.id)) continue;
        pending.push({
          userId: user.id,
          locationId,
          type,
          dedupeKey,
          title,
          message,
          href,
          severity,
        });
      }
    };
    for (const ba of bas)
      add(
        'BA_PENDING',
        ba.id,
        ba.locationId,
        'Berita acara menunggu persetujuan',
        ba.title,
        `/locations/detail?id=${ba.locationId}`,
        'INFO',
        ['SUPER_ADMIN', 'SUPERVISOR', 'COORDINATOR'],
      );
    for (const ticket of tickets) {
      const overdue = ticket.slaExpiresAt <= now;
      const warning = ticket.slaExpiresAt <= soon;
      const type = overdue
        ? 'SLA_OVERDUE'
        : warning
          ? 'SLA_WARNING'
          : 'TICKET_CRITICAL';
      add(
        type,
        ticket.id,
        ticket.locationId,
        overdue
          ? 'Batas SLA terlewati'
          : warning
            ? 'Batas SLA mendekat'
            : 'Insiden kritis',
        `${ticket.ticketNumber}: ${ticket.title}`,
        `/incidents?ticket=${ticket.id}`,
        overdue || ticket.severity === 'CRITICAL' ? 'CRITICAL' : 'WARNING',
        ['SUPER_ADMIN', 'COORDINATOR'],
        [ticket.reportedBy, ticket.assignedTo ?? ''],
      );
    }
    for (const location of locations)
      if (summarizeInstallation(location.locationItems).average < 20) {
        add(
          'INSTALL_DELAY',
          `${location.id}:${now.toISOString().slice(0, 10)}`,
          location.id,
          'Instalasi terlambat',
          `${location.name}: progres masih di bawah 20% setelah jadwal mulai.`,
          `/locations/detail?id=${location.id}`,
          'WARNING',
          ['SUPER_ADMIN', 'LOGISTICS', 'COORDINATOR'],
        );
      }
    if (
      backup?.status !== 'ok' ||
      !backup.completedAt ||
      !Number.isFinite(Date.parse(backup.completedAt)) ||
      Date.now() - new Date(backup.completedAt).getTime() > 36 * 3600000
    ) {
      add(
        'BACKUP_STALE',
        now.toISOString().slice(0, 10),
        null,
        'Periksa backup aplikasi',
        'Backup terakhir belum tersedia atau berumur lebih dari 36 jam.',
        '/operations',
        'WARNING',
        ['SUPER_ADMIN'],
      );
    }
    if (monitor?.status === 'failed')
      add(
        'MONITOR_FAILED',
        now.toISOString().slice(0, 10),
        null,
        'Pemeriksaan layanan gagal',
        'Periksa database, antrean, dan log server.',
        '/operations',
        'CRITICAL',
        ['SUPER_ADMIN'],
      );
    if (restore?.status === 'failed')
      add(
        'RESTORE_FAILED',
        now.toISOString().slice(0, 10),
        null,
        'Uji pemulihan backup gagal',
        'Periksa integritas backup dan log pemulihan.',
        '/operations',
        'CRITICAL',
        ['SUPER_ADMIN'],
      );
    if (pending.length) {
      const created = await this.prisma.notification.createManyAndReturn({
        data: pending,
        skipDuplicates: true,
        select: { userId: true },
      });
      for (const id of new Set(created.map((row) => row.userId)))
        this.events.server?.to(`user:${id}`).emit('notification:updated');
    }
    await this.prisma.notification.updateMany({
      where: {
        readAt: null,
        type: {
          in: [
            'BA_PENDING',
            'SLA_WARNING',
            'SLA_OVERDUE',
            'TICKET_CRITICAL',
            'INSTALL_DELAY',
            'BACKUP_STALE',
            'MONITOR_FAILED',
            'RESTORE_FAILED',
          ],
        },
        dedupeKey: { notIn: [...liveKeys] },
      },
      data: { readAt: now },
    });
  }
}

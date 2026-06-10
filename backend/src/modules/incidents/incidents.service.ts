import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ok, paginate } from '../../common/dto/api-response.dto';
import { CreateTicketDto, AssignTicketDto, UpdateStatusDto, AddNoteDto, EscalateDto, TicketQueryDto } from './incidents.dto';
import { TicketSeverity, TicketStatus } from '@prisma/client';
import { EventsGateway } from '../events/events.gateway';

const SLA_MINUTES: Record<TicketSeverity, number> = {
  CRITICAL: 30,
  HIGH: 60,
  MEDIUM: 120,
  LOW: 240,
};

@Injectable()
export class IncidentsService {
  constructor(private prisma: PrismaService, private events: EventsGateway) {}

  async findAll(query: TicketQueryDto) {
    const { page, limit, skip, locationId, status, severity, search } = query;

    const where: any = {};
    if (locationId) where.locationId = locationId;
    if (status) where.status = status;
    if (severity) where.severity = severity;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { ticketNumber: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.incidentTicket.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
        include: { location: { select: { name: true, city: true } }, assignee: { select: { id: true, name: true } } },
      }),
      this.prisma.incidentTicket.count({ where }),
    ]);

    return paginate(data, total, page ?? 1, limit ?? 20);
  }

  async findOne(id: string) {
    const ticket = await this.prisma.incidentTicket.findUnique({
      where: { id },
      include: {
        location: { select: { name: true, city: true } },
        reporter: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
      },
    });
    if (!ticket) throw new NotFoundException('Tiket tidak ditemukan');
    return ok(ticket);
  }

  async create(dto: CreateTicketDto, userId: string, reporterName: string) {
    const ticketNumber = `TKT-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const slaMinutes = SLA_MINUTES[dto.severity];
    const slaExpiresAt = new Date(Date.now() + slaMinutes * 60_000);

    const ticket = await this.prisma.incidentTicket.create({
      data: {
        ticketNumber,
        locationId: dto.locationId,
        reportedBy: userId,
        reporterName,
        severity: dto.severity,
        category: dto.category,
        title: dto.title,
        description: dto.description,
        photos: dto.photos ?? [],
        slaMinutes,
        slaExpiresAt,
      },
    });
    this.events.emitTicketCreated(ticket);
    return ok(ticket, 'Tiket berhasil dibuat');
  }

  async assign(id: string, dto: AssignTicketDto) {
    const ticket = await this.prisma.incidentTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Tiket tidak ditemukan');

    const updated = await this.prisma.incidentTicket.update({
      where: { id },
      data: { assignedTo: dto.assignedTo, status: TicketStatus.ASSIGNED },
    });
    return ok(updated, 'Tiket berhasil di-assign');
  }

  async updateStatus(id: string, dto: UpdateStatusDto) {
    const ticket = await this.prisma.incidentTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Tiket tidak ditemukan');

    const data: any = {};
    if (dto.status) data.status = dto.status;
    if (dto.resolutionNote) data.resolutionNote = dto.resolutionNote;
    if (dto.status === TicketStatus.RESOLVED || dto.status === TicketStatus.CLOSED) {
      data.resolvedAt = new Date();
    }

    const updated = await this.prisma.incidentTicket.update({ where: { id }, data });
    this.events.emitTicketUpdated(id, updated.status, updated);
    return ok(updated, 'Status tiket diperbarui');
  }

  async getOverdue() {
    const tickets = await this.prisma.incidentTicket.findMany({
      where: {
        slaExpiresAt: { lt: new Date() },
        status: { notIn: [TicketStatus.RESOLVED, TicketStatus.CLOSED] },
      },
      orderBy: { slaExpiresAt: 'asc' },
      include: { location: { select: { name: true } } },
    });
    return ok(tickets);
  }

  async getSLAStats() {
    const now = new Date();
    const warn15 = new Date(now.getTime() + 15 * 60_000);

    const [overdue, critical, warning] = await Promise.all([
      this.prisma.incidentTicket.count({
        where: {
          slaExpiresAt: { lt: now },
          status: { notIn: [TicketStatus.RESOLVED, TicketStatus.CLOSED] },
        },
      }),
      this.prisma.incidentTicket.count({
        where: { severity: TicketSeverity.CRITICAL, status: { notIn: [TicketStatus.RESOLVED, TicketStatus.CLOSED] } },
      }),
      this.prisma.incidentTicket.count({
        where: {
          slaExpiresAt: { gte: now, lte: warn15 },
          status: { notIn: [TicketStatus.RESOLVED, TicketStatus.CLOSED] },
        },
      }),
    ]);

    return ok({ overdue, critical, warning });
  }

  async addNote(id: string, dto: AddNoteDto) {
    const ticket = await this.prisma.incidentTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Tiket tidak ditemukan');
    // Notes disimpan di resolutionNote sebagai appended text (simple implementation)
    const existing = ticket.resolutionNote ?? '';
    const updated = await this.prisma.incidentTicket.update({
      where: { id },
      data: { resolutionNote: existing ? `${existing}\n---\n${dto.note}` : dto.note },
    });
    return ok(updated, 'Catatan ditambahkan');
  }

  // Interim: foto disimpan sebagai data URL di kolom JSON photos.
  // Saat MinIO terpasang, ganti dengan upload ke object storage.
  async addPhoto(id: string, file: Express.Multer.File) {
    const ticket = await this.prisma.incidentTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Tiket tidak ditemukan');

    const url = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    const photos = [...(((ticket.photos as any[]) ?? [])), url];

    await this.prisma.incidentTicket.update({ where: { id }, data: { photos } });
    return ok({ url }, 'Foto berhasil diunggah');
  }

  async escalate(id: string, dto: EscalateDto) {
    const ticket = await this.prisma.incidentTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Tiket tidak ditemukan');
    const updated = await this.prisma.incidentTicket.update({
      where: { id },
      data: {
        status: TicketStatus.ESCALATED,
        resolutionNote: `[ESKALASI] ${dto.reason}`,
      },
    });
    return ok(updated, 'Tiket berhasil dieskalasi');
  }

  async remove(id: string) {
    const ticket = await this.prisma.incidentTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Tiket tidak ditemukan');

    await this.prisma.incidentTicket.delete({ where: { id } });
    return ok(null, 'Tiket berhasil dihapus');
  }
}

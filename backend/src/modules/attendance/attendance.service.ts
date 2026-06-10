import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ok, paginate } from '../../common/dto/api-response.dto';
import { ScanDto, AttendanceQueryDto } from './attendance.dto';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService, private events: EventsGateway) {}

  async getLogs(query: AttendanceQueryDto) {
    const { page = 1, limit = 20, skip, locationId, session, search } = query;

    const where: any = {};
    if (locationId) where.locationId = locationId;
    if (session) where.session = session;
    if (search) {
      where.OR = [
        { participantName: { contains: search, mode: 'insensitive' } },
        { participantId: { contains: search, mode: 'insensitive' } },
        { barcodeValue: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.attendanceLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { scanTime: 'desc' },
        include: { location: { select: { name: true } } },
      }),
      this.prisma.attendanceLog.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async scan(dto: ScanDto, scannedById: string) {
    // Cegah double-scan per barcode per sesi
    const existing = await this.prisma.attendanceLog.findFirst({
      where: { barcodeValue: dto.barcodeValue, session: dto.session },
    });
    if (existing) {
      throw new ConflictException('Peserta sudah discan pada sesi ini');
    }

    // Derive participantId dari barcode
    const suffix = dto.barcodeValue.split('-').pop()?.padStart(6, '0') ?? '000000';
    const participantId = `P-${suffix}`;
    const participantName = dto.participantName ?? `Peserta ${dto.barcodeValue}`;

    const log = await this.prisma.attendanceLog.create({
      data: {
        locationId: dto.locationId,
        participantId,
        barcodeValue: dto.barcodeValue,
        participantName,
        session: dto.session,
        scanTime: new Date(),
        notes: dto.notes,
        scannedBy: scannedById,
      },
    });
    this.events.emitAttendanceUpdated(dto.locationId, log);
    return ok(log, 'Peserta berhasil discan');
  }
}

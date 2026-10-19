import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { ok } from '../../common/dto/api-response.dto';
import { CreateBeritaAcaraDto, UpdateBeritaAcaraDto, BeritaAcaraQueryDto } from './berita-acara.dto';

@Injectable()
export class BeritaAcaraService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: BeritaAcaraQueryDto) {
    const where: any = {};
    if (query.locationId) where.locationId = query.locationId;
    if (query.type) where.type = query.type;

    const data = await this.prisma.beritaAcara.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        location: { select: { name: true, city: true } },
        approvedBy: { select: { id: true, name: true } },
      },
    });
    return ok(data);
  }

  async findOne(id: string) {
    const ba = await this.prisma.beritaAcara.findUnique({
      where: { id },
      include: { location: { select: { name: true, city: true } }, createdBy: { select: { id: true, name: true } } },
    });
    if (!ba) throw new NotFoundException('Berita acara tidak ditemukan');
    return ok(ba);
  }

  async create(dto: CreateBeritaAcaraDto, userId: string) {
    const docNumber = `BA-${dto.type.replace('BA_', '')}-${Date.now()}-${randomUUID().slice(0, 8)}`;

    const ba = await this.prisma.beritaAcara.create({
      data: {
        documentNumber: docNumber,
        type: dto.type,
        locationId: dto.locationId,
        title: dto.title,
        date: new Date(dto.date),
        body: dto.body ?? '',
        fileUrl: dto.fileUrl,
        fileName: dto.fileName,
        // Alur approval: BA yang di-upload menunggu persetujuan pengawas lapangan.
        status: dto.fileUrl ? 'PENDING_APPROVAL' : 'DRAFT',
        transportMode: dto.transportMode,
        deliveryType: dto.deliveryType,
        courierName: dto.courierName,
        vehicleInfo: dto.vehicleInfo,
        items: dto.items as any,
        pihakPertamaNama: dto.pihakPertama?.nama ?? '-',
        pihakPertamaJabatan: dto.pihakPertama?.jabatan ?? '-',
        pihakPertamaInstansi: dto.pihakPertama?.instansi ?? '-',
        pihakKeduaNama: dto.pihakKedua?.nama ?? '-',
        pihakKeduaJabatan: dto.pihakKedua?.jabatan ?? '-',
        pihakKeduaInstansi: dto.pihakKedua?.instansi ?? '-',
        photos: dto.photos as any,
        createdById: userId,
      },
    });
    return ok(ba, 'Berita acara berhasil dibuat');
  }

  async update(id: string, dto: UpdateBeritaAcaraDto) {
    const ba = await this.prisma.beritaAcara.findUnique({ where: { id } });
    if (!ba) throw new NotFoundException('Berita acara tidak ditemukan');

    // Status hasil review hanya boleh berubah lewat approve/reject.
    if (dto.status && !['DRAFT', 'PENDING_APPROVAL'].includes(dto.status)) {
      throw new BadRequestException('Gunakan endpoint persetujuan atau penolakan berita acara');
    }
    const hasChanges = ['title', 'body', 'fileUrl'].some((key) => dto[key] !== undefined && dto[key] !== ba[key]);
    const status = dto.status ?? (hasChanges ? ((dto.fileUrl ?? ba.fileUrl) ? 'PENDING_APPROVAL' : 'DRAFT') : ba.status);
    if (status === 'PENDING_APPROVAL' && !(dto.fileUrl ?? ba.fileUrl)) {
      throw new BadRequestException('File berita acara wajib tersedia sebelum diajukan');
    }
    const resetApproval = hasChanges || (dto.status !== undefined && dto.status !== ba.status);
    const updated = await this.prisma.beritaAcara.update({
      where: { id },
      data: {
        ...dto,
        status,
        ...(resetApproval ? { approvedById: null, approvedAt: null, rejectionNote: null } : {}),
      },
    });
    return ok(updated, 'Berita acara diperbarui');
  }

  async remove(id: string) {
    const ba = await this.prisma.beritaAcara.findUnique({ where: { id } });
    if (!ba) throw new NotFoundException('Berita acara tidak ditemukan');

    await this.prisma.beritaAcara.delete({ where: { id } });
    return ok(null, 'Berita acara dihapus');
  }

  async approve(id: string, approverId: string) {
    return this.review(id, approverId);
  }

  async reject(id: string, approverId: string, note: string) {
    if (!note.trim()) throw new BadRequestException('Alasan penolakan wajib diisi');
    return this.review(id, approverId, note.trim());
  }

  private async review(id: string, approverId: string, rejectionNote?: string) {
    const ba = await this.prisma.beritaAcara.findUnique({ where: { id } });
    if (!ba) throw new NotFoundException('Berita acara tidak ditemukan');
    if (ba.status !== 'PENDING_APPROVAL' || !ba.fileUrl) {
      throw new ConflictException('Hanya berita acara dengan file dan status menunggu persetujuan yang dapat ditinjau');
    }
    // Predicate status mencegah persetujuan/penolakan bersamaan saling menimpa.
    const result = await this.prisma.beritaAcara.updateMany({
      where: { id, status: 'PENDING_APPROVAL', updatedAt: ba.updatedAt },
      data: {
        status: rejectionNote ? 'REJECTED' : 'FINAL',
        approvedById: approverId,
        approvedAt: new Date(),
        rejectionNote: rejectionNote ?? null,
      },
    });
    if (result.count !== 1) throw new ConflictException('Berita acara sudah ditinjau oleh pengguna lain');
    const updated = await this.prisma.beritaAcara.findUnique({
      where: { id },
      include: { approvedBy: { select: { id: true, name: true } } },
    });
    return ok(updated, rejectionNote ? 'Berita acara ditolak' : 'Berita acara disetujui');
  }
}

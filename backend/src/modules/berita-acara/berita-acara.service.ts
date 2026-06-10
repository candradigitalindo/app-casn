import { Injectable, NotFoundException } from '@nestjs/common';
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
      include: { location: { select: { name: true, city: true } } },
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
    const docNumber = `BA-${dto.type.replace('BA_', '')}-${Date.now()}`;

    const ba = await this.prisma.beritaAcara.create({
      data: {
        documentNumber: docNumber,
        type: dto.type,
        locationId: dto.locationId,
        title: dto.title,
        date: new Date(dto.date),
        body: dto.body,
        fileUrl: dto.fileUrl,
        transportMode: dto.transportMode,
        deliveryType: dto.deliveryType,
        courierName: dto.courierName,
        vehicleInfo: dto.vehicleInfo,
        items: dto.items as any,
        pihakPertamaNama: dto.pihakPertama.nama,
        pihakPertamaJabatan: dto.pihakPertama.jabatan,
        pihakPertamaInstansi: dto.pihakPertama.instansi,
        pihakKeduaNama: dto.pihakKedua.nama,
        pihakKeduaJabatan: dto.pihakKedua.jabatan,
        pihakKeduaInstansi: dto.pihakKedua.instansi,
        photos: dto.photos as any,
        createdById: userId,
      },
    });
    return ok(ba, 'Berita acara berhasil dibuat');
  }

  async update(id: string, dto: UpdateBeritaAcaraDto) {
    const ba = await this.prisma.beritaAcara.findUnique({ where: { id } });
    if (!ba) throw new NotFoundException('Berita acara tidak ditemukan');

    const updated = await this.prisma.beritaAcara.update({ where: { id }, data: dto });
    return ok(updated, 'Berita acara diperbarui');
  }

  async remove(id: string) {
    const ba = await this.prisma.beritaAcara.findUnique({ where: { id } });
    if (!ba) throw new NotFoundException('Berita acara tidak ditemukan');

    await this.prisma.beritaAcara.delete({ where: { id } });
    return ok(null, 'Berita acara dihapus');
  }
}

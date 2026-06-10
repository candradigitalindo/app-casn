import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ok } from '../../common/dto/api-response.dto';
import { CreateDocumentDto, UpdateDocumentDto } from './documents.dto';

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  async getByLocation(locationId: string) {
    const data = await this.prisma.locationDocument.findMany({
      where: { locationId },
      orderBy: [{ category: 'asc' }, { createdAt: 'desc' }],
      include: { uploadedBy: { select: { id: true, name: true } } },
    });
    return ok(data);
  }

  async create(dto: CreateDocumentDto, uploadedById: string) {
    const data = await this.prisma.locationDocument.create({
      data: { ...dto, uploadedById },
    });
    return ok(data, 'Dokumen berhasil diunggah');
  }

  async update(id: string, dto: UpdateDocumentDto) {
    const doc = await this.prisma.locationDocument.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Dokumen tidak ditemukan');
    const data = await this.prisma.locationDocument.update({ where: { id }, data: dto });
    return ok(data, 'Dokumen diperbarui');
  }

  async remove(id: string) {
    const doc = await this.prisma.locationDocument.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Dokumen tidak ditemukan');
    await this.prisma.locationDocument.delete({ where: { id } });
    return ok(null, 'Dokumen dihapus');
  }
}

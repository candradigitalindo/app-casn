import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ok } from '../../common/dto/api-response.dto';
import { CreateDocumentDto, UpdateDocumentDto } from './documents.dto';

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  async getByLocation(locationId: string) {
    // Dokumen formal lokasi (BA, kontrak, dll.) — entitas LocationDocument.
    const documents = await this.prisma.locationDocument.findMany({
      where: { locationId },
      orderBy: { createdAt: 'desc' },
      include: { uploadedBy: { select: { id: true, name: true } } },
    });

    // Dokumentasi tahapan (foto/video) yang diunggah dari titik lokasi —
    // entitas StagePhoto, terhubung ke lokasi lewat LocationStage. Disertakan
    // di sini agar unggahan tilok juga muncul di halaman Dokumen per lokasi.
    const stagePhotos = await this.prisma.stagePhoto.findMany({
      where: { stage: { locationId } },
      orderBy: { createdAt: 'desc' },
      include: { stage: { select: { phase: true } } },
    });

    // StagePhoto.uploadedBy hanya menyimpan userId (bukan relasi) — resolusi nama.
    const uploaderIds = [...new Set(stagePhotos.map((p) => p.uploadedBy))];
    const uploaders = uploaderIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: uploaderIds } },
          select: { id: true, name: true },
        })
      : [];
    const uploaderMap = new Map(uploaders.map((u) => [u.id, u.name]));

    const normalizedDocs = documents.map((d) => ({
      id: d.id,
      locationId: d.locationId,
      source: 'DOCUMENT' as const,
      category: d.category as string,
      name: d.name,
      fileName: d.fileName,
      fileUrl: d.fileUrl,
      fileSizeKb: d.fileSizeKb ?? undefined,
      notes: d.notes ?? undefined,
      uploadedBy: d.uploadedBy,
      createdAt: d.createdAt,
    }));

    const normalizedPhotos = stagePhotos.map((p) => ({
      id: p.id,
      locationId,
      source: 'STAGE_PHOTO' as const,
      stageId: p.stageId,
      phase: p.stage.phase as string,
      category: p.category as string,
      name: p.caption,
      fileName: p.url.split('/').pop() ?? p.url,
      fileUrl: p.url,
      fileSizeKb: undefined,
      notes: undefined,
      uploadedBy: { id: p.uploadedBy, name: uploaderMap.get(p.uploadedBy) ?? '—' },
      createdAt: p.createdAt,
    }));

    const data = [...normalizedDocs, ...normalizedPhotos].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
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

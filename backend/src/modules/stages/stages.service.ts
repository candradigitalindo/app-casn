import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ok } from '../../common/dto/api-response.dto';
import { UpdateStageDto, AddStagePhotoDto } from './stages.dto';
import { StageStatus, StagePhase } from '@prisma/client';

const PHASES: StagePhase[] = [
  'PERSIAPAN',
  'INSTALASI',
  'UJI_FUNGSI',
  'PELAKSANAAN',
  'DEINSTALASI',
  'SERAH_TERIMA',
];

@Injectable()
export class StagesService {
  constructor(private prisma: PrismaService) {}

  async getByLocation(locationId: string) {
    const location = await this.prisma.location.findUnique({ where: { id: locationId } });
    if (!location) throw new NotFoundException('Lokasi tidak ditemukan');

    // Seed stages if none exist yet
    const existing = await this.prisma.locationStage.findMany({
      where: { locationId },
      include: { photos: true },
      orderBy: { phase: 'asc' },
    });

    if (existing.length === 0) {
      await this.prisma.locationStage.createMany({
        data: PHASES.map((phase) => ({ locationId, phase })),
      });
      const seeded = await this.prisma.locationStage.findMany({
        where: { locationId },
        include: { photos: true },
        orderBy: { phase: 'asc' },
      });
      return ok(seeded);
    }

    return ok(existing);
  }

  async getAllSummary() {
    const locations = await this.prisma.location.findMany({
      select: {
        id: true,
        name: true,
        province: true,
        stages: { orderBy: { phase: 'asc' } },
      },
    });

    const summary = locations.map((loc) => {
      const completed = loc.stages.filter((s) => s.status === 'COMPLETED').length;
      const inProgress = loc.stages.find((s) => s.status === 'IN_PROGRESS');
      return {
        locationId: loc.id,
        locationName: loc.name,
        province: loc.province,
        currentPhase: inProgress?.phase ?? (completed === PHASES.length ? 'SERAH_TERIMA' : 'PERSIAPAN'),
        completedPhases: completed,
        totalPhases: PHASES.length,
      };
    });

    return ok(summary);
  }

  async update(id: string, dto: UpdateStageDto, userId?: string) {
    const stage = await this.prisma.locationStage.findUnique({ where: { id } });
    if (!stage) throw new NotFoundException('Tahapan tidak ditemukan');

    const data: any = {};
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.progress !== undefined) data.progress = dto.progress;
    if (dto.notes !== undefined) data.notes = dto.notes;

    if (dto.status === StageStatus.IN_PROGRESS && !stage.startedAt) data.startedAt = new Date();
    if (dto.status === StageStatus.COMPLETED) {
      data.completedAt = new Date();
      if (userId) data.completedById = userId;
    }

    const updated = await this.prisma.locationStage.update({
      where: { id },
      data,
      include: { photos: true },
    });
    return ok(updated, 'Tahapan diperbarui');
  }

  async addPhoto(stageId: string, dto: AddStagePhotoDto, userId?: string) {
    const stage = await this.prisma.locationStage.findUnique({ where: { id: stageId } });
    if (!stage) throw new NotFoundException('Tahapan tidak ditemukan');

    await this.prisma.stagePhoto.create({
      data: {
        stageId,
        url: dto.url,
        caption: dto.caption,
        takenAt: new Date(dto.takenAt),
        uploadedBy: dto.uploadedBy ?? userId ?? 'system',
      },
    });

    const updated = await this.prisma.locationStage.findUnique({
      where: { id: stageId },
      include: { photos: true },
    });
    return ok(updated, 'Foto berhasil ditambahkan');
  }

  async deletePhoto(stageId: string, photoId: string) {
    const photo = await this.prisma.stagePhoto.findFirst({ where: { id: photoId, stageId } });
    if (!photo) throw new NotFoundException('Foto tidak ditemukan');

    await this.prisma.stagePhoto.delete({ where: { id: photoId } });

    const updated = await this.prisma.locationStage.findUnique({
      where: { id: stageId },
      include: { photos: true },
    });
    return ok(updated, 'Foto dihapus');
  }
}

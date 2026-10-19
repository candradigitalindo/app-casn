import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ok } from '../../common/dto/api-response.dto';
import { UpdateStageDto, AddStagePhotoDto } from './stages.dto';
import { StageStatus, StagePhase } from '@prisma/client';
import { syncLocationStatusFromStages } from '../../common/utils/location-status.util';

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

    // Upsert satu fase instalasi bisa mendahului akses halaman tahapan.
    // Lengkapi fase yang hilang; aman ketika dua klien membuka bersamaan.
    await this.prisma.locationStage.createMany({
      data: PHASES.map((phase) => ({ locationId, phase })),
      skipDuplicates: true,
    });
    const stages = await this.prisma.locationStage.findMany({
      where: { locationId },
      include: { photos: true },
      orderBy: { phase: 'asc' },
    });
    return ok(stages);
  }

  async getAllSummary(locationId?: string) {
    const locations = await this.prisma.location.findMany({
      where: locationId ? { id: locationId } : {},
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
        currentPhase: inProgress?.phase ?? PHASES.find((phase) => !loc.stages.some((s) => s.phase === phase && s.status === 'COMPLETED')) ?? 'SERAH_TERIMA',
        completedPhases: completed,
        totalPhases: PHASES.length,
      };
    });

    return ok(summary);
  }

  async update(id: string, dto: UpdateStageDto, userId?: string) {
    const stage = await this.prisma.locationStage.findUnique({ where: { id } });
    if (!stage) throw new NotFoundException('Tahapan tidak ditemukan');

    if (stage.phase === 'INSTALASI' && (dto.status !== undefined || dto.progress !== undefined)) {
      throw new BadRequestException('Progres tahap instalasi mengikuti barang di lokasi. Perbarui melalui halaman Instalasi.');
    }

    const status = dto.status ?? stage.status;
    const data: any = { ...dto };
    if (status === StageStatus.COMPLETED) {
      data.progress = 100;
      data.startedAt = stage.startedAt ?? new Date();
      data.completedAt = stage.completedAt ?? new Date();
      data.completedById = stage.completedById ?? userId ?? null;
    } else if (status === StageStatus.NOT_STARTED) {
      data.progress = 0;
      data.startedAt = null;
      data.completedAt = null;
      data.completedById = null;
    } else {
      data.startedAt = stage.startedAt ?? new Date();
      data.completedAt = null;
      data.completedById = null;
      // Buka kembali fase selesai agar tidak tetap menampilkan 100%.
      if (dto.status === StageStatus.IN_PROGRESS && stage.status === StageStatus.COMPLETED && dto.progress === undefined) {
        data.progress = 0;
      }
    }

    const updated = await this.prisma.locationStage.update({
      where: { id },
      data,
      include: { photos: true },
    });

    await syncLocationStatusFromStages(this.prisma, stage.locationId);

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
        category: dto.category ?? 'UMUM',
        takenAt: new Date(dto.takenAt),
        uploadedBy: userId ?? 'system',
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

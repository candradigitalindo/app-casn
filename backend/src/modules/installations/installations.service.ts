import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ok } from '../../common/dto/api-response.dto';
import { UpdateProgressDto, PhotoEvidenceDto } from './installations.dto';
import { EventsGateway } from '../events/events.gateway';
import { summarizeInstallation, syncInstallationStageFromItems } from '../../common/utils/installation-progress.util';

@Injectable()
export class InstallationsService {
  constructor(private prisma: PrismaService, private events: EventsGateway) {}

  async getAll(locationId?: string) {
    const data = await this.prisma.installationProgress.findMany({
      where: locationId ? { locationId } : {},
      orderBy: [{ locationId: 'asc' }, { milestone: 'asc' }],
      include: { location: { select: { name: true, province: true } } },
    });
    return ok(data);
  }

  async getByLocation(locationId: string) {
    const location = await this.prisma.location.findUnique({ where: { id: locationId } });
    if (!location) throw new NotFoundException('Lokasi tidak ditemukan');

    const data = await this.prisma.installationProgress.findMany({
      where: { locationId },
      orderBy: { milestone: 'asc' },
    });
    return ok(data);
  }

  async upsert(dto: UpdateProgressDto) {
    const existing = await this.prisma.installationProgress.findUnique({
      where: { locationId_milestone: { locationId: dto.locationId, milestone: dto.milestone } },
    });
    const completedAt = dto.percentage >= 100 ? existing?.completedAt ?? new Date() : null;

    const data = await this.prisma.installationProgress.upsert({
      where: { locationId_milestone: { locationId: dto.locationId, milestone: dto.milestone } },
      create: {
        locationId: dto.locationId,
        milestone: dto.milestone,
        percentage: dto.percentage,
        notes: dto.notes,
        photos: dto.photos as any ?? [],
        completedBy: dto.completedBy,
        completedAt,
      },
      update: {
        percentage: dto.percentage,
        notes: dto.notes,
        photos: dto.photos as any,
        completedBy: dto.completedBy,
        completedAt,
      },
    });

    // Endpoint milestone lama tidak menjadi sumber progres tahap instalasi.
    await syncInstallationStageFromItems(this.prisma, dto.locationId);

    this.events.emitInstallationUpdated(dto.locationId, data);
    return ok(data, 'Progress instalasi diperbarui');
  }

  async addPhoto(progressId: string, photo: PhotoEvidenceDto) {
    const progress = await this.prisma.installationProgress.findUnique({ where: { id: progressId } });
    if (!progress) throw new NotFoundException('Progress tidak ditemukan');

    const current = (progress.photos as any[]) ?? [];
    const updated = await this.prisma.installationProgress.update({
      where: { id: progressId },
      data: { photos: [...current, photo] as any },
    });
    return ok(updated, 'Foto berhasil ditambahkan');
  }

  async getSummary(locationId?: string) {
    // Akumulasi dihitung dari persentase instalasi barang di lokasi
    // (LocationItem.installationPct) — sumber yang sama dengan halaman Instalasi.
    const locations = await this.prisma.location.findMany({
      where: locationId ? { id: locationId } : {},
      select: {
        id: true,
        name: true,
        province: true,
        status: true,
        locationItems: { select: { installationPct: true } },
      },
    });

    const summary = locations.map((loc) => {
      const { completed, total, average } = summarizeInstallation(loc.locationItems);

      return {
        locationId: loc.id,
        locationName: loc.name,
        province: loc.province,
        status: loc.status,
        completedMilestones: completed,
        totalMilestones: total,
        averagePercentage: average,
      };
    });

    return ok(summary);
  }

  async getDelayAlerts(locationId?: string) {
    const locations = await this.prisma.location.findMany({
      where: { ...(locationId ? { id: locationId } : {}), status: { notIn: ['READY', 'CLOSED'] } },
      select: {
        id: true,
        name: true,
        province: true,
        startDate: true,
        status: true,
        locationItems: { select: { installationPct: true } },
      },
    });

    const now = new Date();
    const alerts = locations
      .filter((loc) => {
        if (!loc.startDate) return false;
        const avgPct = summarizeInstallation(loc.locationItems).average;
        const daysSinceStart = (now.getTime() - loc.startDate.getTime()) / 86_400_000;
        return daysSinceStart > 1 && avgPct < 20;
      })
      .map((loc) => ({
        locationId: loc.id,
        locationName: loc.name,
        province: loc.province,
        status: loc.status,
        daysBehind: Math.floor((now.getTime() - loc.startDate!.getTime()) / 86_400_000),
      }));

    return ok(alerts);
  }

}

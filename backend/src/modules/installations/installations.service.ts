import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ok } from '../../common/dto/api-response.dto';
import { UpdateProgressDto, PhotoEvidenceDto } from './installations.dto';
import { InstallationMilestone } from '@prisma/client';
import { EventsGateway } from '../events/events.gateway';
import { syncLocationStatusFromStages } from '../../common/utils/location-status.util';

const MILESTONE_ORDER: InstallationMilestone[] = [
  'LAYOUT_20',
  'INFRASTRUCTURE_50',
  'DEPLOYMENT_80',
  'COMPLETED_100',
];

const MILESTONE_PCT: Record<InstallationMilestone, number> = {
  LAYOUT_20: 20,
  INFRASTRUCTURE_50: 50,
  DEPLOYMENT_80: 80,
  COMPLETED_100: 100,
};

@Injectable()
export class InstallationsService {
  constructor(private prisma: PrismaService, private events: EventsGateway) {}

  async getAll() {
    const data = await this.prisma.installationProgress.findMany({
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
    const completedAt = dto.percentage >= 100 ? new Date() : undefined;

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

    // Sinkronkan milestone instalasi → fase INSTALASI tahapan pekerjaan,
    // lalu turunkan status lokasi lewat aturan tunggal berbasis tahapan.
    await this.syncInstallationStage(dto.locationId);
    await syncLocationStatusFromStages(this.prisma, dto.locationId);

    this.events.emitInstallationUpdated(dto.locationId, data);
    return ok(data, 'Progress instalasi diperbarui');
  }

  // Fase INSTALASI di tahapan pekerjaan mengikuti rata-rata 4 milestone
  // instalasi — satu sumber data, tidak lagi diisi ganda.
  private async syncInstallationStage(locationId: string) {
    const progresses = await this.prisma.installationProgress.findMany({
      where: { locationId },
    });
    const totalPct = progresses.reduce((s, p) => s + p.percentage, 0);
    const avg = Math.round(totalPct / MILESTONE_ORDER.length);
    const allComplete =
      progresses.length === MILESTONE_ORDER.length &&
      progresses.every((p) => p.percentage >= 100);

    const status = allComplete
      ? 'COMPLETED'
      : avg > 0
        ? 'IN_PROGRESS'
        : 'NOT_STARTED';

    await this.prisma.locationStage.upsert({
      where: { locationId_phase: { locationId, phase: 'INSTALASI' } },
      create: {
        locationId,
        phase: 'INSTALASI',
        status,
        progress: Math.min(avg, 100),
        ...(status !== 'NOT_STARTED' ? { startedAt: new Date() } : {}),
        ...(allComplete ? { completedAt: new Date() } : {}),
      },
      update: {
        status,
        progress: Math.min(avg, 100),
        ...(status === 'IN_PROGRESS' ? { completedAt: null } : {}),
        ...(allComplete ? { completedAt: new Date() } : {}),
      },
    });
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

  async getSummary() {
    const locations = await this.prisma.location.findMany({
      select: {
        id: true,
        name: true,
        province: true,
        status: true,
        installationProgress: true,
      },
    });

    const summary = locations.map((loc) => {
      const milestones = loc.installationProgress;
      const completed = milestones.filter((m) => m.percentage >= 100).length;
      const avgPct = milestones.length
        ? Math.round(milestones.reduce((s, m) => s + m.percentage, 0) / milestones.length)
        : 0;

      return {
        locationId: loc.id,
        locationName: loc.name,
        province: loc.province,
        status: loc.status,
        completedMilestones: completed,
        totalMilestones: MILESTONE_ORDER.length,
        averagePercentage: avgPct,
      };
    });

    return ok(summary);
  }

  async getDelayAlerts() {
    const locations = await this.prisma.location.findMany({
      where: { status: { notIn: ['READY', 'CLOSED'] } },
      select: {
        id: true,
        name: true,
        province: true,
        startDate: true,
        status: true,
        installationProgress: true,
      },
    });

    const now = new Date();
    const alerts = locations
      .filter((loc) => {
        if (!loc.startDate) return false;
        const avgPct = loc.installationProgress.length
          ? loc.installationProgress.reduce((s, m) => s + m.percentage, 0) / loc.installationProgress.length
          : 0;
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

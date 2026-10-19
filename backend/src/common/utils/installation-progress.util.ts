import { Prisma, StageStatus } from '@prisma/client';
import { syncLocationStatusFromStages } from './location-status.util';

type InstallationPrisma = Pick<Prisma.TransactionClient, 'locationItem' | 'locationStage' | 'location'>;

export function summarizeInstallation(items: { installationPct: number }[]) {
  const completed = items.filter((item) => item.installationPct === 100).length;
  const average = items.length
    ? Math.round(items.reduce((sum, item) => sum + item.installationPct, 0) / items.length)
    : 0;
  return { completed, total: items.length, average };
}

// Barang di lokasi adalah sumber progres yang digunakan halaman Instalasi.
// Milestone lama tetap tersimpan, tetapi tidak boleh menimpa progres barang.
export async function syncInstallationStageFromItems(prisma: InstallationPrisma, locationId: string) {
  const items = await prisma.locationItem.findMany({
    where: { locationId },
    select: { installationPct: true },
  });
  const summary = summarizeInstallation(items);
  const allComplete = summary.total > 0 && summary.completed === summary.total;
  const hasProgress = items.some((item) => item.installationPct > 0);
  const status = allComplete ? StageStatus.COMPLETED : hasProgress ? StageStatus.IN_PROGRESS : StageStatus.NOT_STARTED;
  const existing = await prisma.locationStage.findUnique({
    where: { locationId_phase: { locationId, phase: 'INSTALASI' } },
  });
  const now = new Date();
  const data = {
    status,
    progress: summary.average,
    startedAt: hasProgress ? existing?.startedAt ?? now : null,
    completedAt: allComplete ? existing?.completedAt ?? now : null,
    completedById: allComplete ? existing?.completedById ?? null : null,
  };
  await prisma.locationStage.upsert({
    where: { locationId_phase: { locationId, phase: 'INSTALASI' } },
    create: { locationId, phase: 'INSTALASI', ...data },
    update: data,
  });
  await syncLocationStatusFromStages(prisma, locationId);
  return { ...summary, status };
}

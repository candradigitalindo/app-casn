import { PrismaClient, LocationStatus, StagePhase } from '@prisma/client';

type PrismaLike = Pick<PrismaClient, 'locationStage' | 'location'>;

/**
 * Satu-satunya aturan penurunan Location.status — dari kondisi tahapan
 * pekerjaan. Dipakai modul stages maupun installations agar keduanya
 * tidak saling menimpa dengan aturan berbeda.
 */
export async function syncLocationStatusFromStages(
  prisma: PrismaLike,
  locationId: string,
): Promise<void> {
  const stages = await prisma.locationStage.findMany({ where: { locationId } });
  if (stages.length === 0) return;

  const byPhase = (phase: StagePhase) => stages.find((s) => s.phase === phase);

  let status: LocationStatus = 'PREPARATION';
  if (byPhase('SERAH_TERIMA')?.status === 'COMPLETED') {
    status = 'CLOSED';
  } else if (byPhase('UJI_FUNGSI')?.status === 'COMPLETED') {
    status = 'READY';
  } else if (byPhase('INSTALASI') && byPhase('INSTALASI')?.status !== 'NOT_STARTED') {
    status = 'INSTALLATION_IN_PROGRESS';
  }

  await prisma.location.update({ where: { id: locationId }, data: { status } });
}

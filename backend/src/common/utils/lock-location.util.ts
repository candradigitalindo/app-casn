import { Prisma } from '@prisma/client';

// Serialisasi perubahan per lokasi agar dua petugas tidak menyimpan agregat
// dari snapshot barang yang berbeda. Lock dilepas saat transaksi berakhir.
export async function lockLocation(tx: Prisma.TransactionClient, locationId: string) {
  await tx.$queryRaw`SELECT "id" FROM "Location" WHERE "id" = ${locationId} FOR UPDATE`;
}

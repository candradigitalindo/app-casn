-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "BeritaAcaraStatus" ADD VALUE 'PENDING_APPROVAL';
ALTER TYPE "BeritaAcaraStatus" ADD VALUE 'REJECTED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "BeritaAcaraType" ADD VALUE 'BA_PERUBAHAN_VOLUME';
ALTER TYPE "BeritaAcaraType" ADD VALUE 'BA_KENDALA';

-- AlterEnum
ALTER TYPE "PersonnelRole" ADD VALUE 'PENGAWAS_BKN';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserRole" ADD VALUE 'PIMPINAN';
ALTER TYPE "UserRole" ADD VALUE 'PPK';
ALTER TYPE "UserRole" ADD VALUE 'INSPEKTORAT';

-- AlterTable
ALTER TABLE "BeritaAcara" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" TEXT,
ADD COLUMN     "rejectionNote" TEXT;

-- AddForeignKey
ALTER TABLE "BeritaAcara" ADD CONSTRAINT "BeritaAcara_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

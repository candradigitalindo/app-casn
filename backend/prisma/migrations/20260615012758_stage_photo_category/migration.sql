-- CreateEnum
CREATE TYPE "StagePhotoCategory" AS ENUM ('BARANG', 'SESI_UJIAN', 'UMUM');

-- AlterTable
ALTER TABLE "StagePhoto" ADD COLUMN     "category" "StagePhotoCategory" NOT NULL DEFAULT 'UMUM';

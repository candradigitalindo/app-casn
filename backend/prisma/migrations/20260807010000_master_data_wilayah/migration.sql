-- Master data wilayah Indonesia: Provinsi & Kabupaten/Kota

-- CreateEnum
CREATE TYPE "RegencyType" AS ENUM ('KABUPATEN', 'KOTA');

-- CreateTable
CREATE TABLE "Province" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Province_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Regency" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "RegencyType" NOT NULL,
    "provinceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Regency_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Province_code_key" ON "Province"("code");
CREATE UNIQUE INDEX "Province_name_key" ON "Province"("name");
CREATE UNIQUE INDEX "Regency_code_key" ON "Regency"("code");
CREATE UNIQUE INDEX "Regency_provinceId_name_key" ON "Regency"("provinceId", "name");
CREATE INDEX "Regency_provinceId_idx" ON "Regency"("provinceId");

-- AddForeignKey
ALTER TABLE "Regency" ADD CONSTRAINT "Regency_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "Province"("id") ON DELETE CASCADE ON UPDATE CASCADE;

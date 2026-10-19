-- Data lengkap Tenaga Teknis sesuai Kepsesma 240/2026: data pribadi,
-- pendidikan/ijazah (min. SMA sederajat), honor per hari, grade jabatan
-- rekomendasi, serta penugasan titik lokasi yang bisa kosong/dipindah.
CREATE TYPE "Gender" AS ENUM ('LAKI_LAKI', 'PEREMPUAN');
CREATE TYPE "EducationLevel" AS ENUM ('SMA_SMK', 'D3', 'S1', 'S2');

ALTER TABLE "Personnel" ALTER COLUMN "locationId" DROP NOT NULL;

ALTER TABLE "Personnel" ADD COLUMN "nik" TEXT;
ALTER TABLE "Personnel" ADD COLUMN "birthPlace" TEXT;
ALTER TABLE "Personnel" ADD COLUMN "birthDate" TIMESTAMP(3);
ALTER TABLE "Personnel" ADD COLUMN "gender" "Gender";
ALTER TABLE "Personnel" ADD COLUMN "address" TEXT;
ALTER TABLE "Personnel" ADD COLUMN "email" TEXT;
ALTER TABLE "Personnel" ADD COLUMN "educationLevel" "EducationLevel";
ALTER TABLE "Personnel" ADD COLUMN "educationMajor" TEXT;
ALTER TABLE "Personnel" ADD COLUMN "educationInstitution" TEXT;
ALTER TABLE "Personnel" ADD COLUMN "diplomaFileUrl" TEXT;
ALTER TABLE "Personnel" ADD COLUMN "diplomaFileName" TEXT;
ALTER TABLE "Personnel" ADD COLUMN "honorPerDay" DECIMAL(14,2);
ALTER TABLE "Personnel" ADD COLUMN "recommendedRole" "PersonnelRole";

-- Penugasan: hapus tilok tidak lagi ikut menghapus tenaga teknis —
-- personel kembali ke status "belum ditugaskan".
ALTER TABLE "Personnel" DROP CONSTRAINT "Personnel_locationId_fkey";
ALTER TABLE "Personnel" ADD CONSTRAINT "Personnel_locationId_fkey"
    FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

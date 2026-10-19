-- Fitur scan barcode presensi peserta dihapus (tidak pernah dipakai di UI).
-- DropForeignKey
ALTER TABLE "AttendanceLog" DROP CONSTRAINT IF EXISTS "AttendanceLog_locationId_fkey";
ALTER TABLE "AttendanceLog" DROP CONSTRAINT IF EXISTS "AttendanceLog_scannedBy_fkey";

-- DropTable
DROP TABLE IF EXISTS "AttendanceLog";

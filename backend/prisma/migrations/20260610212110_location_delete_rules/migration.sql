-- DropForeignKey
ALTER TABLE "AttendanceLog" DROP CONSTRAINT "AttendanceLog_locationId_fkey";

-- DropForeignKey
ALTER TABLE "BeritaAcara" DROP CONSTRAINT "BeritaAcara_locationId_fkey";

-- DropForeignKey
ALTER TABLE "IncidentTicket" DROP CONSTRAINT "IncidentTicket_locationId_fkey";

-- DropForeignKey
ALTER TABLE "LogisticsShipment" DROP CONSTRAINT "LogisticsShipment_destinationLocationId_fkey";

-- AddForeignKey
ALTER TABLE "IncidentTicket" ADD CONSTRAINT "IncidentTicket_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogisticsShipment" ADD CONSTRAINT "LogisticsShipment_destinationLocationId_fkey" FOREIGN KEY ("destinationLocationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceLog" ADD CONSTRAINT "AttendanceLog_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BeritaAcara" ADD CONSTRAINT "BeritaAcara_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

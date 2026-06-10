-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'LOGISTICS', 'COORDINATOR', 'TECHNICAL_IT', 'TECHNICAL_ELECTRICAL', 'TECHNICAL_SARPRAS', 'REGISTRAR', 'SUPERVISOR');

-- CreateEnum
CREATE TYPE "LocationStatus" AS ENUM ('PREPARATION', 'INSTALLATION_IN_PROGRESS', 'READY', 'CLOSED');

-- CreateEnum
CREATE TYPE "InstallationMilestone" AS ENUM ('LAYOUT_20', 'INFRASTRUCTURE_50', 'DEPLOYMENT_80', 'COMPLETED_100');

-- CreateEnum
CREATE TYPE "TicketSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "TicketCategory" AS ENUM ('IT_SOFTWARE', 'IT_HARDWARE', 'ELECTRICAL', 'NETWORK', 'SARPRAS', 'OTHER');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'ESCALATED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('PACKING', 'IN_TRANSIT', 'ARRIVED', 'RECEIVED', 'RETURNED');

-- CreateEnum
CREATE TYPE "InventoryCategory" AS ENUM ('LAPTOP_CLIENT', 'SERVER', 'UPS', 'NETWORK', 'METAL_DETECTOR', 'CCTV', 'TENTA', 'AC', 'GENERATOR', 'OTHER');

-- CreateEnum
CREATE TYPE "StagePhase" AS ENUM ('PERSIAPAN', 'INSTALASI', 'UJI_FUNGSI', 'PELAKSANAAN', 'DEINSTALASI', 'SERAH_TERIMA');

-- CreateEnum
CREATE TYPE "StageStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "BeritaAcaraType" AS ENUM ('BA_PENGANTARAN', 'BA_UJI_FUNGSI', 'BA_HARIAN', 'BA_DEINSTALASI', 'BA_SERAH_TERIMA');

-- CreateEnum
CREATE TYPE "BeritaAcaraStatus" AS ENUM ('DRAFT', 'FINAL');

-- CreateEnum
CREATE TYPE "TransportMode" AS ENUM ('DARAT', 'LAUT', 'UDARA');

-- CreateEnum
CREATE TYPE "DeliveryType" AS ENUM ('CARGO', 'EKSPEDISI', 'DIANTAR_LANGSUNG');

-- CreateEnum
CREATE TYPE "ItemOwnership" AS ENUM ('MILIK_SENDIRI', 'SEWA');

-- CreateEnum
CREATE TYPE "ItemCondition" AS ENUM ('BAIK', 'RUSAK_RINGAN', 'RUSAK_BERAT');

-- CreateEnum
CREATE TYPE "PersonnelRole" AS ENUM ('KOORDINATOR', 'TENAGA_IT', 'ELEKTRIKAL', 'TENAGA_SARPRAS');

-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('KONTRAK', 'SURAT_TUGAS', 'BERITA_ACARA', 'LAPORAN', 'FOTO_DOKUMENTASI', 'LAINNYA');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "role" "UserRole" NOT NULL,
    "instansi" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "locationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DECIMAL(10,8) NOT NULL,
    "longitude" DECIMAL(11,8) NOT NULL,
    "status" "LocationStatus" NOT NULL DEFAULT 'PREPARATION',
    "capacity" INTEGER NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "metadata" JSONB,
    "coordinatorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstallationProgress" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "milestone" "InstallationMilestone" NOT NULL,
    "percentage" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "photos" JSONB,
    "completedBy" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstallationProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentTicket" (
    "id" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "reportedBy" TEXT NOT NULL,
    "reporterName" TEXT NOT NULL,
    "assignedTo" TEXT,
    "severity" "TicketSeverity" NOT NULL,
    "category" "TicketCategory" NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "photos" JSONB,
    "slaMinutes" INTEGER NOT NULL DEFAULT 30,
    "slaExpiresAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncidentTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "InventoryCategory" NOT NULL,
    "standardQty" INTEGER NOT NULL,
    "specifications" JSONB,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryChecklist" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "expectedQty" INTEGER NOT NULL,
    "receivedQty" INTEGER NOT NULL DEFAULT 0,
    "damagedQty" INTEGER NOT NULL DEFAULT 0,
    "missingQty" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "photos" JSONB,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogisticsShipment" (
    "id" TEXT NOT NULL,
    "shipmentNumber" TEXT NOT NULL,
    "originWarehouseId" TEXT NOT NULL,
    "destinationLocationId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'PACKING',
    "manifestItems" JSONB NOT NULL,
    "trackingNotes" TEXT,
    "shippedAt" TIMESTAMP(3),
    "arrivedAt" TIMESTAMP(3),
    "receivedBy" TEXT,
    "receivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LogisticsShipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceLog" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "barcodeValue" TEXT NOT NULL,
    "participantName" TEXT NOT NULL,
    "session" INTEGER NOT NULL,
    "scanTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "scannedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationStage" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "phase" "StagePhase" NOT NULL,
    "status" "StageStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "completedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LocationStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StagePhoto" (
    "id" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT NOT NULL,
    "takenAt" TIMESTAMP(3) NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StagePhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BeritaAcara" (
    "id" TEXT NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "type" "BeritaAcaraType" NOT NULL,
    "status" "BeritaAcaraStatus" NOT NULL DEFAULT 'DRAFT',
    "locationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "body" TEXT NOT NULL,
    "fileUrl" TEXT,
    "transportMode" "TransportMode",
    "deliveryType" "DeliveryType",
    "courierName" TEXT,
    "vehicleInfo" TEXT,
    "items" JSONB,
    "pihakPertamaNama" TEXT NOT NULL,
    "pihakPertamaJabatan" TEXT NOT NULL,
    "pihakPertamaInstansi" TEXT NOT NULL,
    "pihakKeduaNama" TEXT NOT NULL,
    "pihakKeduaJabatan" TEXT NOT NULL,
    "pihakKeduaInstansi" TEXT NOT NULL,
    "photos" JSONB,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BeritaAcara_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationItem" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "unit" TEXT NOT NULL,
    "ownership" "ItemOwnership" NOT NULL DEFAULT 'MILIK_SENDIRI',
    "condition" "ItemCondition" NOT NULL DEFAULT 'BAIK',
    "installationPct" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LocationItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Personnel" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "PersonnelRole" NOT NULL,
    "phone" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Personnel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonnelAttendance" (
    "id" TEXT NOT NULL,
    "personnelId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "present" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonnelAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationDocument" (
    "id" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "category" "DocumentCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSizeKb" INTEGER,
    "notes" TEXT,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LocationDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "oldValues" JSONB,
    "newValues" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_locationId_idx" ON "User"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "Location_code_key" ON "Location"("code");

-- CreateIndex
CREATE INDEX "Location_province_city_idx" ON "Location"("province", "city");

-- CreateIndex
CREATE INDEX "Location_status_idx" ON "Location"("status");

-- CreateIndex
CREATE INDEX "Location_coordinatorId_idx" ON "Location"("coordinatorId");

-- CreateIndex
CREATE INDEX "InstallationProgress_locationId_idx" ON "InstallationProgress"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "InstallationProgress_locationId_milestone_key" ON "InstallationProgress"("locationId", "milestone");

-- CreateIndex
CREATE UNIQUE INDEX "IncidentTicket_ticketNumber_key" ON "IncidentTicket"("ticketNumber");

-- CreateIndex
CREATE INDEX "IncidentTicket_locationId_status_idx" ON "IncidentTicket"("locationId", "status");

-- CreateIndex
CREATE INDEX "IncidentTicket_assignedTo_idx" ON "IncidentTicket"("assignedTo");

-- CreateIndex
CREATE INDEX "IncidentTicket_slaExpiresAt_idx" ON "IncidentTicket"("slaExpiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_code_key" ON "InventoryItem"("code");

-- CreateIndex
CREATE INDEX "InventoryChecklist_locationId_idx" ON "InventoryChecklist"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryChecklist_locationId_itemId_key" ON "InventoryChecklist"("locationId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "LogisticsShipment_shipmentNumber_key" ON "LogisticsShipment"("shipmentNumber");

-- CreateIndex
CREATE INDEX "LogisticsShipment_destinationLocationId_status_idx" ON "LogisticsShipment"("destinationLocationId", "status");

-- CreateIndex
CREATE INDEX "LogisticsShipment_originWarehouseId_idx" ON "LogisticsShipment"("originWarehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceLog_barcodeValue_key" ON "AttendanceLog"("barcodeValue");

-- CreateIndex
CREATE INDEX "AttendanceLog_locationId_session_idx" ON "AttendanceLog"("locationId", "session");

-- CreateIndex
CREATE INDEX "AttendanceLog_barcodeValue_idx" ON "AttendanceLog"("barcodeValue");

-- CreateIndex
CREATE INDEX "AttendanceLog_scanTime_idx" ON "AttendanceLog"("scanTime");

-- CreateIndex
CREATE INDEX "LocationStage_locationId_idx" ON "LocationStage"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "LocationStage_locationId_phase_key" ON "LocationStage"("locationId", "phase");

-- CreateIndex
CREATE INDEX "StagePhoto_stageId_idx" ON "StagePhoto"("stageId");

-- CreateIndex
CREATE UNIQUE INDEX "BeritaAcara_documentNumber_key" ON "BeritaAcara"("documentNumber");

-- CreateIndex
CREATE INDEX "BeritaAcara_locationId_type_idx" ON "BeritaAcara"("locationId", "type");

-- CreateIndex
CREATE INDEX "BeritaAcara_status_idx" ON "BeritaAcara"("status");

-- CreateIndex
CREATE INDEX "LocationItem_locationId_idx" ON "LocationItem"("locationId");

-- CreateIndex
CREATE INDEX "Personnel_locationId_idx" ON "Personnel"("locationId");

-- CreateIndex
CREATE INDEX "PersonnelAttendance_locationId_date_idx" ON "PersonnelAttendance"("locationId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "PersonnelAttendance_personnelId_date_key" ON "PersonnelAttendance"("personnelId", "date");

-- CreateIndex
CREATE INDEX "LocationDocument_locationId_category_idx" ON "LocationDocument"("locationId", "category");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_coordinatorId_fkey" FOREIGN KEY ("coordinatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstallationProgress" ADD CONSTRAINT "InstallationProgress_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentTicket" ADD CONSTRAINT "IncidentTicket_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentTicket" ADD CONSTRAINT "IncidentTicket_reportedBy_fkey" FOREIGN KEY ("reportedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentTicket" ADD CONSTRAINT "IncidentTicket_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryChecklist" ADD CONSTRAINT "InventoryChecklist_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryChecklist" ADD CONSTRAINT "InventoryChecklist_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogisticsShipment" ADD CONSTRAINT "LogisticsShipment_destinationLocationId_fkey" FOREIGN KEY ("destinationLocationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogisticsShipment" ADD CONSTRAINT "LogisticsShipment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceLog" ADD CONSTRAINT "AttendanceLog_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceLog" ADD CONSTRAINT "AttendanceLog_scannedBy_fkey" FOREIGN KEY ("scannedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationStage" ADD CONSTRAINT "LocationStage_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationStage" ADD CONSTRAINT "LocationStage_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StagePhoto" ADD CONSTRAINT "StagePhoto_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "LocationStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BeritaAcara" ADD CONSTRAINT "BeritaAcara_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BeritaAcara" ADD CONSTRAINT "BeritaAcara_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationItem" ADD CONSTRAINT "LocationItem_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Personnel" ADD CONSTRAINT "Personnel_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonnelAttendance" ADD CONSTRAINT "PersonnelAttendance_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "Personnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationDocument" ADD CONSTRAINT "LocationDocument_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationDocument" ADD CONSTRAINT "LocationDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

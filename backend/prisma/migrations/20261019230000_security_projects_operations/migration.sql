-- CreateEnum
CREATE TYPE "NotificationSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'PENYUSUNAN_PENAWARAN', 'DIAJUKAN', 'MENANG', 'KALAH', 'OPERASIONAL', 'SELESAI', 'DIBATALKAN');

-- AlterTable
ALTER TABLE "InventoryItem" ADD COLUMN     "masterItemId" TEXT;

-- AlterTable
ALTER TABLE "LocationItem" ADD COLUMN     "masterItemId" TEXT;

-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshId" TEXT NOT NULL,
    "refreshIssuedAt" TIMESTAMP(3) NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "previousTokenHash" TEXT,
    "previousValidUntil" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "success" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UploadedFile" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "locationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UploadedFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "locationId" TEXT,
    "type" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "severity" "NotificationSeverity" NOT NULL DEFAULT 'INFO',
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "agencyName" TEXT NOT NULL,
    "fiscalYear" INTEGER NOT NULL,
    "description" TEXT,
    "hpsAmount" DECIMAL(18,2),
    "defaultMarginPct" DECIMAL(5,2) NOT NULL DEFAULT 10,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "submissionDeadline" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "status" "ProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectLocation" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provinceId" TEXT NOT NULL,
    "regencyId" TEXT,
    "city" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "days" INTEGER NOT NULL DEFAULT 5,
    "address" TEXT,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "locationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectRequirement" (
    "id" TEXT NOT NULL,
    "projectLocationId" TEXT NOT NULL,
    "masterItemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "ownership" "ItemOwnership" NOT NULL,
    "qty" INTEGER NOT NULL,
    "marginPct" DECIMAL(5,2),

    CONSTRAINT "ProjectRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectAllocation" (
    "id" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "vendorItemId" TEXT,
    "qty" INTEGER NOT NULL,
    "unitPrice" DECIMAL(14,2) NOT NULL,
    "priceUnit" "PriceUnit" NOT NULL,
    "notes" TEXT,

    CONSTRAINT "ProjectAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectProposal" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "costTotal" DECIMAL(18,2) NOT NULL,
    "sellTotal" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationSupplyAllocation" (
    "id" TEXT NOT NULL,
    "locationItemId" TEXT NOT NULL,
    "projectAllocationId" TEXT,
    "vendorId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "unitPrice" DECIMAL(14,2) NOT NULL,
    "priceUnit" "PriceUnit" NOT NULL,

    CONSTRAINT "LocationSupplyAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserSession_userId_revokedAt_idx" ON "UserSession"("userId", "revokedAt");

-- CreateIndex
CREATE INDEX "UserSession_expiresAt_idx" ON "UserSession"("expiresAt");

-- CreateIndex
CREATE INDEX "LoginAttempt_email_createdAt_idx" ON "LoginAttempt"("email", "createdAt");

-- CreateIndex
CREATE INDEX "LoginAttempt_createdAt_idx" ON "LoginAttempt"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UploadedFile_filename_key" ON "UploadedFile"("filename");

-- CreateIndex
CREATE INDEX "UploadedFile_locationId_idx" ON "UploadedFile"("locationId");

-- CreateIndex
CREATE INDEX "UploadedFile_uploadedById_idx" ON "UploadedFile"("uploadedById");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_userId_dedupeKey_key" ON "Notification"("userId", "dedupeKey");

-- CreateIndex
CREATE UNIQUE INDEX "Project_code_key" ON "Project"("code");

-- CreateIndex
CREATE INDEX "Project_status_fiscalYear_idx" ON "Project"("status", "fiscalYear");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectLocation_locationId_key" ON "ProjectLocation"("locationId");

-- CreateIndex
CREATE INDEX "ProjectLocation_projectId_idx" ON "ProjectLocation"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectRequirement_projectLocationId_masterItemId_key" ON "ProjectRequirement"("projectLocationId", "masterItemId");

-- CreateIndex
CREATE INDEX "ProjectAllocation_vendorId_idx" ON "ProjectAllocation"("vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectAllocation_requirementId_vendorId_key" ON "ProjectAllocation"("requirementId", "vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectProposal_documentNumber_key" ON "ProjectProposal"("documentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectProposal_projectId_version_key" ON "ProjectProposal"("projectId", "version");

-- CreateIndex
CREATE INDEX "LocationSupplyAllocation_locationItemId_idx" ON "LocationSupplyAllocation"("locationItemId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_masterItemId_key" ON "InventoryItem"("masterItemId");

-- CreateIndex
CREATE UNIQUE INDEX "LocationItem_locationId_masterItemId_key" ON "LocationItem"("locationId", "masterItemId");

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_masterItemId_fkey" FOREIGN KEY ("masterItemId") REFERENCES "MasterItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationItem" ADD CONSTRAINT "LocationItem_masterItemId_fkey" FOREIGN KEY ("masterItemId") REFERENCES "MasterItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoginAttempt" ADD CONSTRAINT "LoginAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadedFile" ADD CONSTRAINT "UploadedFile_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadedFile" ADD CONSTRAINT "UploadedFile_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectLocation" ADD CONSTRAINT "ProjectLocation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectLocation" ADD CONSTRAINT "ProjectLocation_provinceId_fkey" FOREIGN KEY ("provinceId") REFERENCES "Province"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectLocation" ADD CONSTRAINT "ProjectLocation_regencyId_fkey" FOREIGN KEY ("regencyId") REFERENCES "Regency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectLocation" ADD CONSTRAINT "ProjectLocation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectRequirement" ADD CONSTRAINT "ProjectRequirement_projectLocationId_fkey" FOREIGN KEY ("projectLocationId") REFERENCES "ProjectLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectRequirement" ADD CONSTRAINT "ProjectRequirement_masterItemId_fkey" FOREIGN KEY ("masterItemId") REFERENCES "MasterItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAllocation" ADD CONSTRAINT "ProjectAllocation_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "ProjectRequirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAllocation" ADD CONSTRAINT "ProjectAllocation_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAllocation" ADD CONSTRAINT "ProjectAllocation_vendorItemId_fkey" FOREIGN KEY ("vendorItemId") REFERENCES "VendorItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectProposal" ADD CONSTRAINT "ProjectProposal_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationSupplyAllocation" ADD CONSTRAINT "LocationSupplyAllocation_locationItemId_fkey" FOREIGN KEY ("locationItemId") REFERENCES "LocationItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationSupplyAllocation" ADD CONSTRAINT "LocationSupplyAllocation_projectAllocationId_fkey" FOREIGN KEY ("projectAllocationId") REFERENCES "ProjectAllocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationSupplyAllocation" ADD CONSTRAINT "LocationSupplyAllocation_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Hubungkan data lama yang dapat diidentifikasi tanpa menghapus snapshot.
UPDATE "InventoryItem" i SET "masterItemId" = m.id FROM "MasterItem" m
WHERE i.code = 'ITM-' || LPAD(m.no::text, GREATEST(2, LENGTH(m.no::text)), '0');
WITH unique_names AS (
 SELECT MIN(id) AS id, LOWER(TRIM(name)) AS name FROM "MasterItem"
 GROUP BY LOWER(TRIM(name)) HAVING COUNT(*) = 1
), candidates AS (
 SELECT li.id, m.id AS "masterItemId", ROW_NUMBER() OVER (
 PARTITION BY li."locationId", m.id ORDER BY li."createdAt", li.id) AS n
 FROM "LocationItem" li JOIN unique_names m ON LOWER(TRIM(li.name)) = m.name
)
UPDATE "LocationItem" li SET "masterItemId" = c."masterItemId"
FROM candidates c WHERE c.id = li.id AND c.n = 1;

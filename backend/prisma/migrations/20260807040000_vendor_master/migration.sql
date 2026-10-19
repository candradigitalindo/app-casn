-- Pengadaan Fase 1: master vendor rekanan + cakupan wilayah.
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categories" "SarprasCategory"[],
    "npwp" TEXT,
    "nib" TEXT,
    "kbli" TEXT,
    "address" TEXT,
    "provinceId" TEXT,
    "picName" TEXT,
    "picPhone" TEXT,
    "email" TEXT,
    "rating" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Vendor_code_key" ON "Vendor"("code");
CREATE INDEX "Vendor_isActive_idx" ON "Vendor"("isActive");

ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_provinceId_fkey"
    FOREIGN KEY ("provinceId") REFERENCES "Province"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "VendorCoverage" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "provinceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorCoverage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VendorCoverage_vendorId_provinceId_key" ON "VendorCoverage"("vendorId", "provinceId");
CREATE INDEX "VendorCoverage_provinceId_idx" ON "VendorCoverage"("provinceId");

ALTER TABLE "VendorCoverage" ADD CONSTRAINT "VendorCoverage_vendorId_fkey"
    FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VendorCoverage" ADD CONSTRAINT "VendorCoverage_provinceId_fkey"
    FOREIGN KEY ("provinceId") REFERENCES "Province"("id") ON DELETE CASCADE ON UPDATE CASCADE;

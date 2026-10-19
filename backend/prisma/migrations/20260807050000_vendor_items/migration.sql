-- Katalog barang & harga vendor: item yang sanggup dipasok (mengacu MasterItem),
-- jumlah maksimal, dan harga satuan per hari. Dasar/prefill quotation bidding.
CREATE TABLE "VendorItem" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "masterItemId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "unitPricePerDay" DECIMAL(14,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VendorItem_vendorId_masterItemId_key" ON "VendorItem"("vendorId", "masterItemId");
CREATE INDEX "VendorItem_masterItemId_idx" ON "VendorItem"("masterItemId");

ALTER TABLE "VendorItem" ADD CONSTRAINT "VendorItem_vendorId_fkey"
    FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VendorItem" ADD CONSTRAINT "VendorItem_masterItemId_fkey"
    FOREIGN KEY ("masterItemId") REFERENCES "MasterItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

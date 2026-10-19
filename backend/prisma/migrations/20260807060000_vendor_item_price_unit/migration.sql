-- Satuan harga vendor: PER_HARI (dikali jumlah hari kegiatan) atau
-- PER_EVENT (flat sekali per kegiatan). Kolom harga di-rename menjadi
-- generik "unitPrice" karena tidak lagi selalu per hari.
CREATE TYPE "PriceUnit" AS ENUM ('PER_HARI', 'PER_EVENT');

ALTER TABLE "VendorItem" RENAME COLUMN "unitPricePerDay" TO "unitPrice";
ALTER TABLE "VendorItem" ADD COLUMN "priceUnit" "PriceUnit" NOT NULL DEFAULT 'PER_HARI';

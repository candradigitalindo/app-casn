-- Kategori sarana prasarana pada MasterItem: Sarpras IT vs Sarpras Non IT.
-- Menjadi data dasar pemetaan vendor per kategori.
CREATE TYPE "SarprasCategory" AS ENUM ('SARPRAS_IT', 'SARPRAS_NON_IT');

ALTER TABLE "MasterItem"
  ADD COLUMN "category" "SarprasCategory" NOT NULL DEFAULT 'SARPRAS_NON_IT';

-- Klasifikasi awal untuk 38 item Lampiran E Kepsesma 240/2026:
-- perangkat elektronik/TIK (laptop, UPS, webcam, scanner, printer, projector,
-- CCTV, hardisk, TV, metal detector, sistem aplikasi) = SARPRAS_IT.
UPDATE "MasterItem"
SET "category" = 'SARPRAS_IT'
WHERE "no" IN (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 15, 16, 17, 18, 19, 20, 25, 38);

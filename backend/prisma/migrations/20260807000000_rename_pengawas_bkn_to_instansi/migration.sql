-- Rebranding: istilah BKN diganti menjadi "Instansi" (instansi penyelenggara).
-- RENAME VALUE otomatis memperbarui seluruh baris Personnel yang memakai nilai lama.
ALTER TYPE "PersonnelRole" RENAME VALUE 'PENGAWAS_BKN' TO 'PENGAWAS_INSTANSI';

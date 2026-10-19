import { toast } from 'sonner';

// ── Format tanggal & angka Indonesia (helper bersama antar halaman) ──

/** "12 Juni 2026" */
export function formatDate(value?: string | Date | null): string {
  if (!value) return '-';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** "12 Jun 2026" */
export function formatDateShort(value?: string | Date | null): string {
  if (!value) return '-';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** "1.250" */
export function formatNumber(value: number): string {
  return value.toLocaleString('id-ID');
}

/**
 * ISO datetime penuh dari backend → "yyyy-MM-dd" untuk <input type="date">
 * (input date menolak nilai selain yyyy-MM-dd dan menampilkannya kosong).
 */
export function toDateInputValue(value?: string | null): string {
  if (!value) return '';
  return value.slice(0, 10);
}

/** Tanggal hari ini "yyyy-MM-dd" menurut zona waktu perangkat (bukan UTC). */
export function todayDateInput(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Baca file sebagai base64 data URL dengan validasi ukuran.
 * Mengembalikan null (plus toast error) bila file terlalu besar / gagal dibaca.
 */
export function readFileAsDataUrl(file: File, maxMb = 10): Promise<string | null> {
  if (file.size > maxMb * 1024 * 1024) {
    toast.error(`Ukuran file maksimal ${maxMb} MB`);
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => {
      toast.error('Gagal membaca file');
      resolve(null);
    };
    reader.readAsDataURL(file);
  });
}

"use client";

import { AlertCircle } from "lucide-react";
import { useLocationScope } from "@/lib/hooks/useLocations";

// Banner global: tampil jika user terikat ke titik lokasi
// tapi lokasinya sudah tidak ada (mis. dihapus admin).
export function LocationScopeBanner() {
  const { missing } = useLocationScope();
  if (!missing) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center gap-2">
      <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
      <p className="text-xs text-amber-800">
        Titik lokasi Anda tidak ditemukan atau sudah dihapus. Silakan hubungi admin.
      </p>
    </div>
  );
}

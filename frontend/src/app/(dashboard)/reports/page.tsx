"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText, MapPin, Users, AlertTriangle,
  Truck, Wrench, BarChart3, Loader2, ClipboardCheck,
} from "lucide-react";
import Link from "next/link";
import { useBeritaAcaraReport } from "@/lib/hooks";
import { BeritaAcaraType, BeritaAcaraTypeCodes, BeritaAcaraTypeLabels } from "@/types/enums";

// ─────────────────────────────────────────────────────────────
// Rekap Berita Acara — matriks lokasi × jenis BA (data live)
// ─────────────────────────────────────────────────────────────
const BA_TYPE_ORDER = Object.values(BeritaAcaraType);

const CELL_STATUS_STYLE: Record<string, string> = {
  PENDING_APPROVAL: "bg-amber-100 text-amber-700",
  FINAL: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
  DRAFT: "bg-slate-100 text-slate-500",
};

function BeritaAcaraRecap() {
  const { data, isLoading } = useBeritaAcaraReport();
  const rows = data?.data ?? [];

  const totals = rows.reduce(
    (acc, r) => ({
      total: acc.total + r.totalBA,
      pending: acc.pending + r.pendingCount,
      approved: acc.approved + r.approvedCount,
      rejected: acc.rejected + r.rejectedCount,
    }),
    { total: 0, pending: 0, approved: 0, rejected: 0 }
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <ClipboardCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Rekap Berita Acara</CardTitle>
              <CardDescription className="text-xs">
                Hasil upload BA per lokasi dan status persetujuan pengawas lapangan
              </CardDescription>
            </div>
          </div>
          {/* Statistik ringkas */}
          <div className="flex items-center gap-4 text-right">
            {[
              { v: totals.total, l: "Total", c: "text-foreground" },
              { v: totals.pending, l: "Menunggu", c: "text-amber-600" },
              { v: totals.approved, l: "Disetujui", c: "text-emerald-600" },
              { v: totals.rejected, l: "Ditolak", c: "text-red-600" },
            ].map((s) => (
              <div key={s.l}>
                <p className={`text-base font-bold tabular-nums leading-none ${s.c}`}>{s.v}</p>
                <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wide">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Belum ada titik lokasi terdaftar.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/20">
                  <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground uppercase text-[10px] min-w-44">Lokasi</th>
                  {BA_TYPE_ORDER.map((t) => (
                    <th
                      key={t}
                      className="px-2 py-2.5 font-semibold text-muted-foreground text-[10px] text-center min-w-16"
                      title={BeritaAcaraTypeLabels[t]}
                    >
                      {BeritaAcaraTypeCodes[t]}
                    </th>
                  ))}
                  <th className="px-3 py-2.5 font-semibold text-muted-foreground uppercase text-[10px] text-center">Menunggu</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r) => (
                  <tr key={r.locationId} className="hover:bg-muted/20 transition-colors">
                    <td className="px-3 py-2.5">
                      <Link href={`/locations/detail?id=${r.locationId}`} className="font-medium hover:text-primary hover:underline">
                        {r.locationName}
                      </Link>
                      <p className="text-[10px] text-muted-foreground">{r.city}, {r.province}</p>
                    </td>
                    {BA_TYPE_ORDER.map((t) => {
                      const cell = r.byType[t];
                      return (
                        <td key={t} className="px-2 py-2.5 text-center">
                          {cell ? (
                            <span
                              className={`inline-flex items-center justify-center h-6 min-w-6 px-1.5 rounded-full font-semibold tabular-nums ${
                                CELL_STATUS_STYLE[cell.latestStatus ?? "DRAFT"] ?? CELL_STATUS_STYLE.DRAFT
                              }`}
                              title={`${cell.count} dokumen`}
                            >
                              {cell.count}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2.5 text-center">
                      {r.pendingCount > 0 ? (
                        <Badge variant="outline" className="text-[10px] text-amber-700 bg-amber-50 border-amber-300">
                          {r.pendingCount}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Legenda */}
            <div className="flex items-center gap-4 mt-3 pt-3 border-t flex-wrap">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Status terakhir</span>
              {[
                { l: "Menunggu persetujuan", c: "bg-amber-100" },
                { l: "Disetujui", c: "bg-emerald-100" },
                { l: "Ditolak", c: "bg-red-100" },
              ].map((x) => (
                <span key={x.l} className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span className={`h-2.5 w-2.5 rounded-full ${x.c}`} /> {x.l}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// Pintasan modul laporan lain
// ─────────────────────────────────────────────────────────────
const reportLinks = [
  { title: "Status Lokasi", description: "Status & progres seluruh titik lokasi", icon: MapPin, href: "/locations" },
  { title: "Kehadiran Tenaga Teknis", description: "Presensi harian, rekap, dan unduh CSV", icon: Users, href: "/attendance" },
  { title: "Insiden & SLA", description: "Tiket insiden dan kepatuhan SLA per lokasi", icon: AlertTriangle, href: "/incidents" },
  { title: "Status Logistik", description: "Pengiriman barang dan manifest per lokasi", icon: Truck, href: "/logistics" },
  { title: "Progress Instalasi", description: "Persentase instalasi barang per lokasi", icon: Wrench, href: "/installations" },
  { title: "Dashboard Eksekutif", description: "Ringkasan KPI utama untuk pimpinan", icon: BarChart3, href: "/dashboard" },
];

export default function ReportsPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Laporan</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Rekap berita acara dan akses cepat ke laporan pelaksanaan seleksi
        </p>
      </div>

      <BeritaAcaraRecap />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reportLinks.map((report) => (
          <Link key={report.title} href={report.href}>
            <Card className="hover:shadow-md hover:border-primary/30 transition-all h-full">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <report.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{report.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{report.description}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <FileText className="h-10 w-10 text-muted-foreground/40 mx-auto" />
            <h3 className="text-sm font-semibold mt-3">Butuh laporan khusus?</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
              Hubungi tim Super Admin untuk membuat laporan kustom sesuai kebutuhan Anda.
              Laporan dapat difilter berdasarkan provinsi, lokasi, tanggal, dan kategori.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

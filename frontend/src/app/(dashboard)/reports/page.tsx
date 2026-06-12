"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText, Download, MapPin, Users, AlertTriangle,
  Truck, Wrench, BarChart3,
} from "lucide-react";

const reports = [
  {
    id: "rpt-1",
    title: "Laporan Status Lokasi Nasional",
    description: "Rekap status seluruh lokasi tes per provinsi beserta detail masalah",
    icon: MapPin,
    category: "Lokasi",
    lastUpdated: "6 Sep 2026, 10:00",
    format: "PDF",
  },
  {
    id: "rpt-2",
    title: "Laporan Kehadiran Peserta",
    description: "Data kehadiran peserta per lokasi, sesi, dan waktu scan",
    icon: Users,
    category: "Kehadiran",
    lastUpdated: "6 Sep 2026, 12:00",
    format: "Excel",
  },
  {
    id: "rpt-3",
    title: "Laporan Insiden & SLA",
    description: "Detail tiket insiden, waktu respons, dan kepatuhan SLA per lokasi",
    icon: AlertTriangle,
    category: "Insiden",
    lastUpdated: "6 Sep 2026, 09:30",
    format: "PDF",
  },
  {
    id: "rpt-4",
    title: "Laporan Status Logistik",
    description: "Status pengiriman barang, manifest, dan penerimaan per lokasi",
    icon: Truck,
    category: "Logistik",
    lastUpdated: "6 Sep 2026, 08:00",
    format: "Excel",
  },
  {
    id: "rpt-5",
    title: "Laporan Progress Instalasi",
    description: "Progress instalasi per lokasi dengan milestone dan target waktu",
    icon: Wrench,
    category: "Instalasi",
    lastUpdated: "6 Sep 2026, 07:00",
    format: "PDF",
  },
  {
    id: "rpt-6",
    title: "Dashboard Eksekutif",
    description: "Ringkasan keseluruhan untuk pimpinan - visualisasi dan KPI utama",
    icon: BarChart3,
    category: "Eksekutif",
    lastUpdated: "6 Sep 2026, 12:00",
    format: "PDF",
  },
];

export default function ReportsPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Laporan</h1>
        <p className="text-muted-foreground text-sm mt-1">Unduh dan akses berbagai laporan pelaksanaan seleksi</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((report) => (
          <Card key={report.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <report.icon className="h-5 w-5 text-primary" />
                </div>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                  {report.format}
                </Badge>
              </div>
              <CardTitle className="text-sm font-semibold mt-3">{report.title}</CardTitle>
              <CardDescription className="text-xs">{report.description}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">Update: {report.lastUpdated}</span>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                  <Download className="h-3 w-3" />
                  Unduh
                </Button>
              </div>
            </CardContent>
          </Card>
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
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MapPin, Users, AlertTriangle, Truck, CheckCircle2, Clock, TrendingUp, Activity,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { useDashboardStats, useInstallationSummary, useTickets, usePersonnelSummary, useLocations } from "@/lib/hooks";
import { useAuthStore } from "@/lib/stores/auth";
import type { IncidentTicket, Location } from "@/types/models";
import { TicketStatusLabels, TicketStatus, LocationStatus } from "@/types/enums";
import Link from "next/link";

const STATUS_PIE_CONFIG: Array<{ status: LocationStatus; name: string; color: string }> = [
  { status: LocationStatus.READY, name: "Siap", color: "#10b981" },
  { status: LocationStatus.INSTALLATION_IN_PROGRESS, name: "Instalasi", color: "#f59e0b" },
  { status: LocationStatus.PREPARATION, name: "Persiapan", color: "#94a3b8" },
  { status: LocationStatus.CLOSED, name: "Ditutup", color: "#cbd5e1" },
];

export default function DashboardPage() {
  // Use real API data
  const stats = useDashboardStats();
  const { data: installSummaryResponse } = useInstallationSummary();
  const { data: ticketsResponse } = useTickets();
  const { data: personnelSummaryResponse } = usePersonnelSummary();
  const { data: locationsResponse } = useLocations({});
  const personnelSummary = personnelSummaryResponse?.data;

  // User yang terikat ke satu titik lokasi hanya melihat data lokasinya
  const scopedLocationId = useAuthStore((s) => s.user?.locationId);
  const inScope = <T extends { locationId: string }>(rows: T[]) =>
    scopedLocationId ? rows.filter((r) => r.locationId === scopedLocationId) : rows;

  // Akumulasi persentase instalasi (rata-rata 4 milestone) per lokasi
  const installSummaryData = inScope(Array.isArray(installSummaryResponse?.data) ? installSummaryResponse.data : []);
  const displayTickets = inScope(Array.isArray(ticketsResponse?.data) ? ticketsResponse.data : []);
  const locations: Location[] = Array.isArray(locationsResponse?.data) ? locationsResponse.data : [];

  const locationNames: Record<string, string> = Object.fromEntries(
    locations.map((l) => [l.id, l.name])
  );

  const statusPieData = STATUS_PIE_CONFIG.map((cfg) => ({
    name: cfg.name,
    color: cfg.color,
    value: locations.filter((l) => l.status === cfg.status).length,
  }));

  const personnelAttendanceData = inScope(personnelSummary?.byLocation ?? []).map(
    (loc: { locationName: string; total: number; present: number }) => ({
      lokasi: loc.locationName,
      hadir: loc.present,
      tidakHadir: loc.total - loc.present,
    })
  );

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Ringkasan pelaksanaan seleksi secara nasional</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground font-medium">Total Lokasi</p>
                <p className="text-xl md:text-3xl font-bold mt-1">{stats?.totalLocations?.toLocaleString("id-ID") || '0'}</p>
              </div>
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-blue-50 flex items-center justify-center">
                <MapPin className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              <span className="text-xs text-emerald-600 font-medium">{(stats?.activeLocations || 0).toLocaleString("id-ID")} siap</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground font-medium">Tenaga Teknis</p>
                <p className="text-xl md:text-3xl font-bold mt-1">{personnelSummary?.total ?? 0}</p>
              </div>
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-emerald-50 flex items-center justify-center">
                <Users className="h-5 w-5 md:h-6 md:w-6 text-emerald-600" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3">
              <TrendingUp className="h-3 w-3 text-emerald-500" />
              <span className="text-xs text-emerald-600 font-medium">{personnelSummary?.presentToday ?? 0} hadir hari ini</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground font-medium">Tiket Terbuka</p>
                <p className="text-xl md:text-3xl font-bold mt-1">{stats?.openTickets ?? 0}</p>
              </div>
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-red-50 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 md:h-6 md:w-6 text-red-600" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3">
              <Activity className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">{stats?.resolvedTickets ?? 0} resolved</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground font-medium">Pengiriman</p>
                <p className="text-xl md:text-3xl font-bold mt-1">{stats?.shipmentInTransit ?? 0}</p>
              </div>
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-amber-50 flex items-center justify-center">
                <Truck className="h-5 w-5 md:h-6 md:w-6 text-amber-600" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3">
              <Clock className="h-3 w-3 text-amber-500" />
              <span className="text-xs text-amber-600 font-medium">dalam perjalanan</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Progress Titik Lokasi</CardTitle>
            <CardDescription className="text-xs">Akumulasi persentase instalasi seluruh barang di lokasi — 100% berarti instalasi selesai</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {installSummaryData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  Belum ada data lokasi
                </div>
              ) : (
              <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 600, height: 300 }}>
                <BarChart
                  layout="vertical"
                  data={installSummaryData.map((d: { locationName: string; averagePercentage: number }) => ({
                    lokasi: d.locationName,
                    pct: d.averagePercentage,
                    sisa: 100 - d.averagePercentage,
                  }))}
                  margin={{ top: 5, right: 40, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis type="category" dataKey="lokasi" tick={{ fontSize: 10 }} width={130} />
                  <Tooltip
                    formatter={(value: unknown) => [`${value}%`]}
                    contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Bar dataKey="pct" stackId="a" fill="#10b981" name="Selesai" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="sisa" stackId="a" fill="#e2e8f0" name="Belum" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Status Lokasi</CardTitle>
            <CardDescription className="text-xs">Distribusi status seluruh lokasi</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              {locations.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  Belum ada data lokasi
                </div>
              ) : (
              <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 300, height: 200 }}>
                <PieChart>
                  <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: "8px", fontSize: "12px" }} />
                </PieChart>
              </ResponsiveContainer>
              )}
            </div>
            <div className="space-y-2 mt-2">
              {statusPieData.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="font-medium">{item.value.toLocaleString("id-ID")}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Presensi Tenaga Teknis</CardTitle>
            <CardDescription className="text-xs">Jumlah tenaga teknis hadir per titik lokasi</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              {personnelAttendanceData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  Belum ada data tenaga teknis
                </div>
              ) : (
              <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 500, height: 220 }}>
                <BarChart data={personnelAttendanceData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="lokasi" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: "8px", fontSize: "12px" }} />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Bar dataKey="hadir" stackId="a" fill="#10b981" name="Hadir" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="tidakHadir" stackId="a" fill="#fca5a5" name="Tidak Hadir" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Tiket Insiden Terbaru</CardTitle>
                <CardDescription className="text-xs">5 tiket terakhir yang dilaporkan</CardDescription>
              </div>
              <Link href="/incidents" className="text-xs text-primary hover:underline font-medium">Lihat semua</Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {displayTickets.slice(0, 5).map((ticket: IncidentTicket) => (
                <div key={ticket.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50/80">
                  <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${
                    ticket.status === TicketStatus.RESOLVED ? "bg-emerald-500" :
                    ticket.status === TicketStatus.ESCALATED ? "bg-red-500" :
                    ticket.status === TicketStatus.IN_PROGRESS ? "bg-amber-500" : "bg-blue-500"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{ticket.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">{locationNames[ticket.locationId] || ticket.locationId}</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">{TicketStatusLabels[ticket.status]}</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
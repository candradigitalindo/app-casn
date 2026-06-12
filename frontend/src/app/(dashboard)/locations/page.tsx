"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import {
  Search, MapPin, Users, Plus, Pencil, Trash2, Eye, MoreVertical, Loader2, ListChecks,
  Info, Navigation, Building2, Globe, CalendarDays
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { locationStatusTextColors } from "@/lib/status-colors";
import { LocationStatusLabels, LocationStatus, StagePhaseLabels } from "@/types/enums";
import type { Location } from "@/types/models";
import { useLocations, useCreateLocation, useUpdateLocation, useDeleteLocation, usePermissions, useStagesSummary } from "@/lib/hooks";

const EMPTY_FORM: Omit<Location, "id" | "createdAt" | "updatedAt"> = {
  code: "",
  name: "",
  province: "",
  city: "",
  address: "",
  latitude: 0,
  longitude: 0,
  status: LocationStatus.PREPARATION,
  capacity: 0,
  startDate: "",
  endDate: "",
};

const CAPACITY_OPTIONS = [100, 200, 300, 400, 500];

export default function LocationsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LocationStatus | "ALL">("ALL");

  // Dialog states
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewingLocation, setViewingLocation] = useState<Location | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: response, isLoading } = useLocations(
    statusFilter !== "ALL"
      ? { status: statusFilter, search: search || undefined }
      : { search: search || undefined }
  );
  const createLocation = useCreateLocation();
  const updateLocation = useUpdateLocation();
  const deleteLocation = useDeleteLocation();
  const { canWrite } = usePermissions();

  const locations = response?.data ?? [];
  const filtered = locations;

  // Ringkasan tahapan per lokasi untuk progress bar di kartu
  const { data: stagesSummaryRes } = useStagesSummary();
  const stageMap = useMemo(
    () =>
      Object.fromEntries(
        (Array.isArray(stagesSummaryRes?.data) ? stagesSummaryRes.data : []).map((s) => [s.locationId, s])
      ),
    [stagesSummaryRes]
  );

  const openCreate = useCallback(() => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((loc: Location) => {
    setEditingId(loc.id);
    setForm({
      code: loc.code,
      name: loc.name,
      province: loc.province,
      city: loc.city,
      address: loc.address,
      latitude: loc.latitude,
      longitude: loc.longitude,
      status: loc.status,
      capacity: loc.capacity,
      startDate: loc.startDate ?? "",
      endDate: loc.endDate ?? "",
    });
    setFormOpen(true);
  }, []);

  const openDetail = useCallback((loc: Location) => {
    setViewingLocation(loc);
    setDetailOpen(true);
  }, []);

  const openDelete = useCallback((id: string) => {
    setDeletingId(id);
    setDeleteOpen(true);
  }, []);

  const handleSave = useCallback(() => {
    if (!form.code || !form.name || !form.province || !form.city || !form.address) return;
    if (editingId) {
      updateLocation.mutate({ id: editingId, data: form }, {
        onSuccess: () => { setFormOpen(false); setEditingId(null); },
      });
    } else {
      createLocation.mutate(form, {
        onSuccess: () => { setFormOpen(false); },
      });
    }
  }, [form, editingId, createLocation, updateLocation]);

  const handleDelete = useCallback(() => {
    if (!deletingId) return;
    deleteLocation.mutate(deletingId, {
      onSuccess: () => { setDeleteOpen(false); setDeletingId(null); },
    });
  }, [deletingId, deleteLocation]);

  const updateForm = (field: string, value: string | number | LocationStatus) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Titik Lokasi</h1>
          <p className="text-muted-foreground text-sm mt-1">Kelola seluruh lokasi pelaksanaan seleksi</p>
        </div>
        {canWrite && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Tambah Lokasi
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", count: locations.length, color: "text-foreground" },
          { label: "Siap", count: locations.filter(l => l.status === LocationStatus.READY).length, color: "text-emerald-600" },
          { label: "Instalasi", count: locations.filter(l => l.status === LocationStatus.INSTALLATION_IN_PROGRESS).length, color: "text-amber-600" },
          { label: "Persiapan", count: locations.filter(l => l.status === LocationStatus.PREPARATION).length, color: "text-slate-600" },
        ].map((item) => (
          <Card key={item.label} className="py-3">
            <CardContent className="p-0 text-center">
              <p className={`text-2xl font-bold ${item.color}`}>{item.count}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari lokasi, provinsi, atau kode..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <Button variant={statusFilter === "ALL" ? "default" : "outline"} size="sm" onClick={() => setStatusFilter("ALL")}>Semua</Button>
          {Object.entries(LocationStatusLabels).map(([key, label]) => (
            <Button key={key} variant={statusFilter === key ? "default" : "outline"} size="sm" onClick={() => setStatusFilter(key as LocationStatus)}>{label}</Button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Location Cards */}
      {!isLoading && <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((location) => {
          const stage = stageMap[location.id];
          const stagePct = stage && stage.totalPhases > 0
            ? Math.round((stage.completedPhases / stage.totalPhases) * 100)
            : 0;
          return (
          <Card key={location.id} className="hover:shadow-md transition-shadow group">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">{location.code}</span>
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${locationStatusTextColors[location.status]}`}>
                      {LocationStatusLabels[location.status]}
                    </Badge>
                  </div>
                  <Link href={`/locations/detail?id=${location.id}`}>
                    <h3 className="text-sm font-semibold mt-1.5 truncate hover:text-primary hover:underline">{location.name}</h3>
                  </Link>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{location.address}</p>
                </div>
                <DropdownMenu>
                <DropdownMenuTrigger className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-md hover:bg-accent inline-flex items-center justify-center">
                  <MoreVertical className="h-4 w-4" />
                </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => router.push(`/locations/detail?id=${location.id}`)}>
                      <ListChecks className="h-4 w-4 mr-2" />
                      Tahapan Pekerjaan
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openDetail(location)}>
                      <Eye className="h-4 w-4 mr-2" />
                      Info Singkat
                    </DropdownMenuItem>
                    {canWrite && (
                      <DropdownMenuItem onClick={() => openEdit(location)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                    )}
                    {canWrite && (
                      <DropdownMenuItem
                        onClick={() => openDelete(location.id)}
                        className="text-red-600 focus:text-red-600 focus:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Hapus
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {/* Progress tahapan pekerjaan */}
              {stage && (
                <div className="mt-3.5 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">
                      Tahapan: <span className="font-medium text-foreground">{StagePhaseLabels[stage.currentPhase]}</span>
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {stage.completedPhases}/{stage.totalPhases} fase
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${stagePct === 100 ? 'bg-emerald-500' : 'bg-primary'}`}
                      style={{ width: `${stagePct}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-x-4 gap-y-1 flex-wrap mt-4 pt-3 border-t">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{location.city}, {location.province}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  <span>{location.capacity} peserta/sesi</span>
                </div>
                {location.startDate && location.endDate && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5" />
                    <span>
                      {new Date(location.startDate).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                      {" – "}
                      {new Date(location.endDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          );
        })}
      </div>}

      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-12">
          <MapPin className="h-12 w-12 text-muted-foreground/50 mx-auto" />
          <p className="text-muted-foreground mt-3">Tidak ada lokasi yang ditemukan</p>
        </div>
      )}

      {/* ==================== CREATE / EDIT DIALOG ==================== */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-5xl p-0 gap-0 border-none shadow-2xl overflow-hidden">
          <DialogHeader className="p-4 bg-primary/5 border-b flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                {editingId ? <Pencil className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">{editingId ? "Perbarui Lokasi" : "Tambah Lokasi Baru"}</DialogTitle>
                <p className="text-[10px] text-muted-foreground uppercase tracking-tight font-medium">Sistem Aplikasi Pengelolaan dan Pengendalian Pelaksanaan Seleksi</p>
              </div>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-12">
            {/* Column 1: Form Inputs (Left) */}
            <div className="md:col-span-7 p-6 space-y-6 border-r">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-primary font-bold text-[11px] uppercase tracking-wider">
                  <Building2 className="h-3.5 w-3.5" />
                  Detail Identitas & Geografis
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Kode</Label>
                    <Input placeholder="JKT-001" className="h-9 text-sm bg-muted/20" value={form.code} onChange={(e) => updateForm("code", e.target.value)} />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Nama Titik Lokasi</Label>
                    <Input placeholder="Universitas Indonesia - Depok" className="h-9 text-sm bg-muted/20" value={form.name} onChange={(e) => updateForm("name", e.target.value)} />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase">Alamat Lengkap</Label>
                  <Textarea placeholder="Jl. Margonda Raya..." className="min-h-[60px] text-sm bg-muted/20 resize-none" value={form.address} onChange={(e) => updateForm("address", e.target.value)} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Provinsi</Label>
                    <Input placeholder="DKI Jakarta" className="h-9 text-sm bg-muted/20" value={form.province} onChange={(e) => updateForm("province", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Kota/Kabupaten</Label>
                    <Input placeholder="Jakarta Selatan" className="h-9 text-sm bg-muted/20" value={form.city} onChange={(e) => updateForm("city", e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Latitude</Label>
                    <div className="relative">
                      <Navigation className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                      <Input type="number" step="any" className="pl-8 h-9 text-sm bg-muted/20" value={form.latitude || ""} onChange={(e) => updateForm("latitude", parseFloat(e.target.value) || 0)} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Longitude</Label>
                    <div className="relative">
                      <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                      <Input type="number" step="any" className="pl-8 h-9 text-sm bg-muted/20" value={form.longitude || ""} onChange={(e) => updateForm("longitude", parseFloat(e.target.value) || 0)} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Column 2: Status & Results (Right) */}
            <div className="md:col-span-5 p-6 space-y-6 bg-muted/5 flex flex-col">
              <div className="space-y-6 flex-1">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Status Pelaksanaan</Label>
                  <Select value={form.status as string} onValueChange={(val) => updateForm("status", val as LocationStatus)}>
                    <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(LocationStatusLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key} className="text-xs">{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-primary font-bold text-[11px] uppercase tracking-wider">
                    <CalendarDays className="h-3.5 w-3.5" />
                    Jadwal Seleksi
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-muted-foreground uppercase">Tanggal Mulai</Label>
                      <Input type="date" className="h-9 text-sm bg-muted/20" value={form.startDate ?? ""} onChange={(e) => updateForm("startDate", e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-muted-foreground uppercase">Tanggal Selesai</Label>
                      <Input type="date" className="h-9 text-sm bg-muted/20" value={form.endDate ?? ""} onChange={(e) => updateForm("endDate", e.target.value)} />
                    </div>
                  </div>
                  {form.startDate && form.endDate && (() => {
                    const days = Math.round((new Date(form.endDate).getTime() - new Date(form.startDate).getTime()) / 86400000) + 1;
                    return days > 0 ? (
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
                        <CalendarDays className="h-3 w-3" />
                        <span className="font-semibold text-foreground">{days} hari</span> pelaksanaan
                      </p>
                    ) : (
                      <p className="text-[11px] text-red-500 mt-1">Tanggal selesai harus setelah tanggal mulai</p>
                    );
                  })()}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold text-primary uppercase tracking-wider">Kapasitas Peserta</Label>
                  <Select value={String(form.capacity)} onValueChange={(val) => updateForm("capacity", parseInt(val || "0"))}>
                    <SelectTrigger className="h-12 text-lg font-bold border-primary/20 bg-primary/5">
                      <SelectValue placeholder="Pilih Kapasitas..." />
                    </SelectTrigger>
                    <SelectContent>
                      {CAPACITY_OPTIONS.map((cap) => (
                        <SelectItem key={cap} value={String(cap)} className="font-semibold">{cap} Peserta / Sesi</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground italic mt-2 flex items-start gap-1.5 leading-tight">
                    <Info className="h-3 w-3 mt-0.5 shrink-0" />
                    Kapasitas ini akan menentukan standar operasional dan alokasi sumber daya di lokasi tersebut.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-primary/10 bg-primary/5 p-4 space-y-2">
                <div className="flex items-center gap-2 text-primary">
                  <Building2 className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-tight">Konfigurasi Sistem</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Data yang Anda masukkan akan tercatat sebagai profil dasar lokasi. Detail inventaris barang lengkap (38+ item) dapat dikelola melalui menu <strong>Logistik</strong> setelah lokasi ini terdaftar.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-5 bg-muted/20 border-t flex-row sm:justify-end gap-3 shrink-0">
            <Button variant="outline" size="sm" className="h-9 px-5 text-xs" onClick={() => setFormOpen(false)}>Batal</Button>
            <Button
              size="sm"
              className="px-6 h-9 text-xs font-bold shadow-lg shadow-primary/20"
              onClick={handleSave}
              disabled={!form.code || !form.name || !form.province || !form.city || !form.address || createLocation.isPending || updateLocation.isPending}
            >
              {(createLocation.isPending || updateLocation.isPending) && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              {editingId ? "Simpan Perubahan" : "Simpan Lokasi Baru"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== DETAIL DIALOG ==================== */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Detail Lokasi
            </DialogTitle>
          </DialogHeader>
          {viewingLocation && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">{viewingLocation.code}</span>
                <Badge variant="outline" className={`text-xs px-2 py-0.5 ${locationStatusTextColors[viewingLocation.status]}`}>
                  {LocationStatusLabels[viewingLocation.status]}
                </Badge>
              </div>
              <div>
                <h3 className="text-lg font-semibold">{viewingLocation.name}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">{viewingLocation.address}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                <div>
                  <p className="text-xs text-muted-foreground">Provinsi</p>
                  <p className="text-sm font-medium">{viewingLocation.province}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Kota</p>
                  <p className="text-sm font-medium">{viewingLocation.city}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Kapasitas</p>
                  <p className="text-sm font-medium">{viewingLocation.capacity} peserta</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Koordinat</p>
                  <p className="text-sm font-medium font-mono">{viewingLocation.latitude}, {viewingLocation.longitude}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                <div>
                  <p className="text-xs text-muted-foreground">Dibuat</p>
                  <p className="text-sm font-medium">{new Date(viewingLocation.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Diperbarui</p>
                  <p className="text-sm font-medium">{new Date(viewingLocation.updatedAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
                </div>
              </div>
              {canWrite && (
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => { setDetailOpen(false); openEdit(viewingLocation); }}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => { setDetailOpen(false); openDelete(viewingLocation.id); }}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Hapus
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ==================== DELETE CONFIRMATION DIALOG ==================== */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Hapus Lokasi</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus lokasi ini? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Batal</Button>
            <Button variant="destructive" onClick={handleDelete}>Ya, Hapus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
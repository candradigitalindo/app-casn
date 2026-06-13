"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Users, Plus, Pencil, Trash2, ChevronDown, ChevronUp,
  CalendarDays, CheckCircle2, XCircle, User, Phone,
  AlertCircle, Loader2, Download, ClipboardList, MapPin,
  FileUp, Eye,
} from "lucide-react";
import { toast } from "sonner";
import {
  PersonnelRole, PersonnelRoleLabels, PersonnelRoleColors, STAFF_REQUIREMENTS,
} from "@/types/enums";
import {
  usePersonnel, usePersonnelAttendance, useAllPersonnelAttendance,
  useCreatePersonnel, useUpdatePersonnel, useDeletePersonnel, useUpsertAttendance,
  useDeleteAttendance, usePermissions, usePersonnelSummary,
} from "@/lib/hooks";
import { useLocations } from "@/lib/hooks";
import type { Location, Personnel, PersonnelAttendance } from "@/types/models";

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function dateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const cur = new Date(start);
  const last = new Date(end);
  while (cur <= last) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

function getRequirement(capacity: number): Record<PersonnelRole, number> {
  const caps = [100, 200, 300, 400, 500];
  const match = caps.find((c) => capacity <= c) ?? 500;
  return STAFF_REQUIREMENTS[match] ?? STAFF_REQUIREMENTS[100];
}

// ─────────────────────────────────────────────────────────────
// Dialog CRUD Tenaga Teknis
// ─────────────────────────────────────────────────────────────
function PersonnelDialog({
  open, onOpenChange, locationId, editing,
  onSave, isPending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  locationId: string;
  editing: Personnel | null;
  onSave: (d: { name: string; role: PersonnelRole; phone: string; notes: string }) => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState({
    name: editing?.name ?? "",
    role: editing?.role ?? PersonnelRole.TENAGA_IT,
    phone: editing?.phone ?? "",
    notes: editing?.notes ?? "",
  });

  const valid = !!form.name.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">{editing ? "Edit Tenaga Teknis" : "Tambah Tenaga Teknis"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold text-muted-foreground uppercase">Nama Lengkap *</Label>
            <Input
              placeholder="Nama personel"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold text-muted-foreground uppercase">Posisi *</Label>
            <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v as PersonnelRole }))}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.values(PersonnelRole).map((r) => (
                  <SelectItem key={r} value={r} className="text-sm">{PersonnelRoleLabels[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold text-muted-foreground uppercase">No. HP</Label>
            <Input
              placeholder="08xxxxxxxxxx"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold text-muted-foreground uppercase">Catatan</Label>
            <Input
              placeholder="Opsional"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="h-9 text-sm"
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button size="sm" disabled={!valid || isPending} onClick={() => onSave(form)}>
            {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            {editing ? "Simpan" : "Tambah"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────
// Download CSV helper
// ─────────────────────────────────────────────────────────────
// Backend menyimpan date sebagai DateTime (ISO "2026-06-11T00:00:00.000Z"),
// sedangkan UI memakai string "YYYY-MM-DD" — normalisasi sebelum dibandingkan.
function isSameDay(attDate: string, ymd: string): boolean {
  return attDate.slice(0, 10) === ymd;
}

function downloadCSV(
  location: Location,
  personnel: Personnel[],
  allAttendance: PersonnelAttendance[],
  dates: string[],
) {
  const header = ['Nama', 'Posisi', 'No. HP', ...dates.map(formatDate), 'Total Hadir', 'Total Hari'];
  const rows = personnel.map((p) => {
    const cells = dates.map((d) => {
      const att = allAttendance.find((a) => a.personnelId === p.id && isSameDay(a.date, d));
      return att ? (att.present ? 'Hadir' : 'Tidak Hadir') : '-';
    });
    const totalHadir = cells.filter((c) => c === 'Hadir').length;
    return [p.name, PersonnelRoleLabels[p.role], p.phone ?? '', ...cells, String(totalHadir), String(dates.length)];
  });
  const summary = [
    'TOTAL HADIR', '', '',
    ...dates.map((d) => {
      const n = allAttendance.filter((a) => isSameDay(a.date, d) && a.present).length;
      return `${n}/${personnel.length}`;
    }),
    '', '',
  ];

  const csv = [header, ...rows, [], summary]
    .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Presensi_${location.code}_${location.name.replace(/\s+/g, '_')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────
// Card per lokasi
// ─────────────────────────────────────────────────────────────
function LocationAttendanceCard({ location }: { location: Location }) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'harian' | 'rekap'>('harian');
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Personnel | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const { canWrite } = usePermissions();

  const { data: personnelRes } = usePersonnel(location.id);
  const { data: attendanceRes } = usePersonnelAttendance(location.id, selectedDate);
  const { data: allAttendanceRes } = useAllPersonnelAttendance(location.id, expanded && activeTab === 'rekap');

  const createPersonnel = useCreatePersonnel(location.id);
  const updatePersonnel = useUpdatePersonnel(location.id);
  const deletePersonnel = useDeletePersonnel(location.id);
  const upsertAttendance = useUpsertAttendance(location.id, selectedDate);
  const deleteAttendance = useDeleteAttendance(location.id, selectedDate);
  const [proofView, setProofView] = useState<{ att: PersonnelAttendance; name: string } | null>(null);

  const personnel: Personnel[] = personnelRes?.data ?? [];
  const attendanceMap = useMemo(() => {
    const recs: PersonnelAttendance[] = attendanceRes?.data ?? [];
    return Object.fromEntries(recs.map((a) => [a.personnelId, a]));
  }, [attendanceRes]);

  const dates = location.startDate && location.endDate
    ? dateRange(location.startDate, location.endDate)
    : [];

  const dateInRange = dates.length === 0 || dates.includes(selectedDate);

  const requirement = getRequirement(location.capacity);
  const totalRequired = Object.values(requirement).reduce((a, b) => a + b, 0);
  const presentCount = Object.values(attendanceMap).filter((a) => a.present).length;

  function handleSave(form: { name: string; role: PersonnelRole; phone: string; notes: string }) {
    if (editing) {
      updatePersonnel.mutate(
        { id: editing.id, data: { name: form.name, role: form.role, phone: form.phone, notes: form.notes } },
        { onSuccess: () => { setDialogOpen(false); setEditing(null); } }
      );
    } else {
      createPersonnel.mutate(
        { locationId: location.id, ...form },
        { onSuccess: () => setDialogOpen(false) }
      );
    }
  }

  // Absensi model upload: admin mengunggah bukti kehadiran per orang.
  // Ada bukti = hadir; hapus bukti = catatan kehadiran dihapus.
  function handleProofFile(p: Personnel, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 10 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      upsertAttendance.mutate({
        personnelId: p.id,
        locationId: location.id,
        date: selectedDate,
        present: true,
        fileUrl: reader.result as string,
        fileName: file.name,
      });
    };
    reader.readAsDataURL(file);
  }

  function handleDeleteProof(p: Personnel) {
    const att = attendanceMap[p.id];
    if (!att) return;
    if (!confirm(`Hapus bukti kehadiran ${p.name}?`)) return;
    deleteAttendance.mutate(att.id);
  }

  const roleOrder: PersonnelRole[] = [
    PersonnelRole.PENGAWAS_BKN, PersonnelRole.KOORDINATOR, PersonnelRole.TENAGA_IT,
    PersonnelRole.ELEKTRIKAL, PersonnelRole.TENAGA_SARPRAS,
  ];

  const sortedPersonnel = [...personnel].sort(
    (a, b) => roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role)
  );

  const reqFulfilled = Object.fromEntries(
    Object.values(PersonnelRole).map((r) => [r, personnel.filter((p) => p.role === r).length])
  ) as Record<PersonnelRole, number>;

  const allAttendance: PersonnelAttendance[] = allAttendanceRes?.data ?? [];

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div
        className="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-start gap-3 min-w-0">
          <div className="p-2 bg-primary/10 rounded-lg shrink-0">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm truncate">{location.name}</p>
              <Badge variant="outline" className="text-[10px] font-mono py-0">{location.code}</Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">{location.city} · Kapasitas {location.capacity} peserta/sesi</p>
            {location.startDate && location.endDate && (
              <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                <CalendarDays className="h-3 w-3" />
                {formatDate(location.startDate)} – {formatDate(location.endDate)}
                <span className="font-medium text-foreground ml-1">
                  ({Math.round((new Date(location.endDate).getTime() - new Date(location.startDate).getTime()) / 86400000) + 1} hari)
                </span>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-5 shrink-0 ml-4">
          {/* Statistik ringkas: angka besar + label kecil, warna = status */}
          <div className="hidden md:flex items-center gap-5">
            <div className="text-right">
              <p className={`text-base font-bold tabular-nums leading-none ${
                personnel.length >= totalRequired ? 'text-emerald-600' : 'text-amber-600'
              }`}>
                {personnel.length}<span className="text-muted-foreground/60 font-medium text-xs">/{totalRequired}</span>
              </p>
              <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wide">SDM Terdaftar</p>
            </div>
            {dateInRange && personnel.length > 0 && (
              <>
                <div className="h-8 w-px bg-border" />
                <div className="text-right">
                  <p className={`text-base font-bold tabular-nums leading-none ${
                    presentCount === personnel.length ? 'text-emerald-600' : presentCount > 0 ? 'text-amber-600' : 'text-muted-foreground'
                  }`}>
                    {presentCount}<span className="text-muted-foreground/60 font-medium text-xs">/{personnel.length}</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wide">Hadir Hari Ini</p>
                </div>
              </>
            )}
          </div>
          {expanded ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
        </div>
      </div>

      {/* Expanded */}
      {expanded && (
        <div className="border-t">

          {/* Tab bar */}
          <div className="px-5 pt-3 pb-0 bg-muted/10 border-b flex items-center justify-between gap-3">
            <div className="flex gap-1">
              {(['harian', 'rekap'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-2 text-xs font-semibold rounded-t border-b-2 transition-colors ${
                    activeTab === tab
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab === 'harian' ? (
                    <span className="flex items-center gap-1.5"><CalendarDays className="h-3 w-3" />Presensi Harian</span>
                  ) : (
                    <span className="flex items-center gap-1.5"><ClipboardList className="h-3 w-3" />Rekap & Unduh</span>
                  )}
                </button>
              ))}
            </div>
            {canWrite && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs mb-1"
                onClick={() => { setEditing(null); setDialogOpen(true); }}
              >
                <Plus className="h-3 w-3 mr-1" /> Tambah Tenaga Teknis
              </Button>
            )}
          </div>

          {/* Requirement warning */}
          {Object.values(PersonnelRole).some((r) => reqFulfilled[r] < requirement[r]) && (
            <div className="px-5 py-2 bg-amber-50 border-b flex items-center gap-2">
              <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <p className="text-[11px] text-amber-700">
                Kekurangan Tenaga Teknis: {Object.values(PersonnelRole)
                  .filter((r) => reqFulfilled[r] < requirement[r])
                  .map((r) => `${PersonnelRoleLabels[r]} ${reqFulfilled[r]}/${requirement[r]}`)
                  .join(', ')}
              </p>
            </div>
          )}

          {/* ── TAB: Presensi Harian ── */}
          {activeTab === 'harian' && (
            <>
              <div className="px-5 py-3 bg-muted/5 border-b flex items-center gap-2">
                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                <Label className="text-[10px] font-bold text-muted-foreground uppercase">Tanggal</Label>
                <Input
                  type="date"
                  value={selectedDate}
                  min={location.startDate || undefined}
                  max={location.endDate || undefined}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="h-7 text-xs w-36"
                />
              </div>

              {sortedPersonnel.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                  Belum ada Tenaga Teknis terdaftar di lokasi ini
                </div>
              ) : (
                <div className="divide-y">
                  {sortedPersonnel.map((p) => {
                    const att = attendanceMap[p.id];
                    const hadir = !!att?.present;
                    return (
                      <div key={p.id} className="px-5 py-3 flex items-center gap-3">
                        <div className={`shrink-0 p-1 ${hadir ? 'text-emerald-600' : 'text-gray-300'}`}>
                          {hadir ? <CheckCircle2 className="h-5 w-5" />
                            : <div className="h-5 w-5 rounded-full border-2 border-gray-300" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium">{p.name}</p>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${PersonnelRoleColors[p.role]}`}>
                              {PersonnelRoleLabels[p.role]}
                            </span>
                          </div>
                          {p.phone && (
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Phone className="h-3 w-3" />{p.phone}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Status / aksi bukti kehadiran */}
                          {hadir ? (
                            <>
                              <button
                                onClick={() => att?.fileUrl && setProofView({ att, name: p.name })}
                                disabled={!att?.fileUrl}
                                title={att?.fileUrl ? "Lihat bukti kehadiran" : undefined}
                                className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 transition-colors ${
                                  att?.fileUrl ? 'hover:bg-emerald-100 cursor-pointer' : 'cursor-default'
                                }`}
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                Hadir
                                {att?.fileUrl && <Eye className="h-3 w-3 opacity-60" />}
                              </button>
                              {canWrite && att && (
                                <button
                                  className="p-1.5 rounded hover:bg-red-50 transition-colors text-muted-foreground hover:text-red-600"
                                  title="Hapus bukti kehadiran"
                                  onClick={() => handleDeleteProof(p)}
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </>
                          ) : canWrite && dateInRange ? (
                            <label className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border text-[11px] font-medium text-muted-foreground hover:text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50 cursor-pointer transition-colors">
                              <FileUp className="h-3 w-3" />
                              Upload Bukti
                              <input
                                type="file"
                                accept="image/*,.pdf"
                                className="sr-only"
                                onChange={(e) => handleProofFile(p, e)}
                              />
                            </label>
                          ) : (
                            <span className="text-[11px] text-muted-foreground/60">Belum ada bukti</span>
                          )}

                          {/* Aksi CRUD personel — dipisah dari aksi bukti */}
                          {canWrite && (
                            <>
                              <div className="h-4 w-px bg-border mx-0.5" />
                              <button className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                                title="Edit personel"
                                onClick={() => { setEditing(p); setDialogOpen(true); }}>
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button className="p-1.5 rounded hover:bg-red-50 transition-colors text-muted-foreground hover:text-red-600"
                                title="Hapus personel"
                                onClick={() => setDeleteTarget(p.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ── TAB: Rekap & Unduh ── */}
          {activeTab === 'rekap' && (
            <>
              {!location.startDate || !location.endDate ? (
                <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                  Atur tanggal mulai dan selesai di pengaturan lokasi untuk melihat rekap.
                </div>
              ) : sortedPersonnel.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                  Belum ada Tenaga Teknis terdaftar.
                </div>
              ) : (
                <>
                  {/* Download button */}
                  <div className="px-5 py-3 border-b flex items-center justify-between bg-muted/5">
                    <p className="text-[11px] text-muted-foreground">
                      Rekap presensi {formatDate(location.startDate)} – {formatDate(location.endDate)}
                      {' '}({dates.length} hari · {sortedPersonnel.length} tenaga teknis)
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1"
                      onClick={() => downloadCSV(location, sortedPersonnel, allAttendance, dates)}
                    >
                      <Download className="h-3 w-3" /> Unduh CSV
                    </Button>
                  </div>

                  {/* Matrix table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-muted/20 border-b">
                          <th className="text-left px-4 py-2.5 font-bold text-muted-foreground uppercase text-[10px] sticky left-0 bg-muted/20 min-w-40">Nama</th>
                          <th className="text-left px-3 py-2.5 font-bold text-muted-foreground uppercase text-[10px] min-w-28">Posisi</th>
                          {dates.map((d) => (
                            <th key={d} className="px-2 py-2.5 font-bold text-muted-foreground text-[10px] text-center min-w-14">
                              {formatDate(d)}
                            </th>
                          ))}
                          <th className="px-3 py-2.5 font-bold text-muted-foreground uppercase text-[10px] text-center min-w-16">Hadir</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {sortedPersonnel.map((p) => {
                          const totalHadir = dates.filter((d) =>
                            allAttendance.find((a) => a.personnelId === p.id && isSameDay(a.date, d) && a.present)
                          ).length;
                          return (
                            <tr key={p.id} className="hover:bg-muted/10">
                              <td className="px-4 py-2 font-medium sticky left-0 bg-white">{p.name}</td>
                              <td className="px-3 py-2">
                                <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${PersonnelRoleColors[p.role]}`}>
                                  {PersonnelRoleLabels[p.role]}
                                </span>
                              </td>
                              {dates.map((d) => {
                                const att = allAttendance.find((a) => a.personnelId === p.id && isSameDay(a.date, d));
                                return (
                                  <td key={d} className="px-2 py-2 text-center">
                                    {att?.present === true
                                      ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mx-auto" />
                                      : att?.present === false
                                      ? <XCircle className="h-3.5 w-3.5 text-red-400 mx-auto" />
                                      : <span className="text-gray-300">—</span>}
                                  </td>
                                );
                              })}
                              <td className="px-3 py-2 text-center font-bold">
                                <span className={totalHadir === dates.length ? 'text-emerald-600' : totalHadir === 0 ? 'text-red-500' : 'text-amber-600'}>
                                  {totalHadir}/{dates.length}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      {/* Summary row */}
                      <tfoot>
                        <tr className="bg-muted/20 border-t font-bold">
                          <td className="px-4 py-2 text-[11px] sticky left-0 bg-muted/20" colSpan={2}>Total Hadir</td>
                          {dates.map((d) => {
                            const n = allAttendance.filter((a) => isSameDay(a.date, d) && a.present).length;
                            return (
                              <td key={d} className="px-2 py-2 text-center text-[11px]">
                                <span className={n === sortedPersonnel.length && n > 0 ? 'text-emerald-600' : n === 0 ? 'text-gray-400' : 'text-amber-600'}>
                                  {n}/{sortedPersonnel.length}
                                </span>
                              </td>
                            );
                          })}
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </>
              )}
            </>
          )}

          {/* Requirement summary bar */}
          <div className="px-5 py-2.5 bg-muted/10 border-t flex items-center flex-wrap gap-x-4 gap-y-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Formasi
            </span>
            {roleOrder.map((r) => (
              <div key={r} className="flex items-center gap-1.5">
                <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${PersonnelRoleColors[r]}`}>
                  {PersonnelRoleLabels[r]}
                </span>
                <span className={`text-[10px] font-bold tabular-nums ${reqFulfilled[r] >= requirement[r] ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {reqFulfilled[r]}/{requirement[r]}
                </span>
                {reqFulfilled[r] >= requirement[r] && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CRUD dialog */}
      {dialogOpen && (
        <PersonnelDialog
          open={dialogOpen}
          onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditing(null); }}
          locationId={location.id}
          editing={editing}
          onSave={handleSave}
          isPending={createPersonnel.isPending || updatePersonnel.isPending}
        />
      )}

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Hapus Tenaga Teknis?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {sortedPersonnel.find((p) => p.id === deleteTarget)?.name} akan dihapus beserta seluruh data kehadirannya.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>Batal</Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={deletePersonnel.isPending}
              onClick={() => deletePersonnel.mutate(deleteTarget!, { onSuccess: () => setDeleteTarget(null) })}
            >
              {deletePersonnel.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Viewer bukti kehadiran (gambar inline, PDF via iframe) */}
      <Dialog open={!!proofView} onOpenChange={(v) => { if (!v) setProofView(null); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">Bukti Kehadiran — {proofView?.name}</DialogTitle>
            <p className="text-xs text-muted-foreground font-mono">
              {proofView?.att.date && new Date(proofView.att.date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
              {proofView?.att.fileName ? ` — ${proofView.att.fileName}` : ""}
            </p>
          </DialogHeader>
          {proofView?.att.fileUrl?.startsWith("data:image") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={proofView.att.fileUrl} alt={proofView.att.fileName ?? "Bukti kehadiran"} className="max-h-[70vh] w-full object-contain rounded-md border" />
          ) : proofView?.att.fileUrl ? (
            <iframe src={proofView.att.fileUrl} title={proofView.att.fileName ?? "Bukti kehadiran"} className="h-[70vh] w-full rounded-md border" />
          ) : null}
          <DialogFooter>
            {proofView?.att.fileUrl && (
              <a href={proofView.att.fileUrl} download={proofView.att.fileName ?? "bukti-kehadiran"}>
                <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" /> Unduh</Button>
              </a>
            )}
            <Button size="sm" onClick={() => setProofView(null)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// Halaman utama
// ─────────────────────────────────────────────────────────────
export default function AttendancePage() {
  const [search, setSearch] = useState("");
  const { data: locRes, isLoading: locLoading } = useLocations({});
  const { data: summaryRes } = usePersonnelSummary();

  const locations: Location[] = useMemo(() => {
    const all = locRes?.data ?? [];
    if (!search) return all;
    const q = search.toLowerCase();
    return all.filter((l) => l.name.toLowerCase().includes(q) || l.city.toLowerCase().includes(q));
  }, [locRes, search]);

  const summaryData = summaryRes?.data ?? { total: 0, presentToday: 0 };
  const activeLocationsCount = (locRes?.data ?? []).filter((l) => l.startDate && l.endDate).length;

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kehadiran Tenaga Teknis</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Pantau ketersediaan dan presensi harian personel di seluruh titik lokasi
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm bg-primary/5">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <MapPin className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{locations.length}</p>
              <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">Titik Lokasi</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-blue-50/50">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-700">{summaryData.total}</p>
              <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">Total Personel</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-emerald-50/50">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-700">{summaryData.presentToday}</p>
              <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">Hadir Hari Ini</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-amber-50/50">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
              <CalendarDays className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-700">{activeLocationsCount}</p>
              <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">Jadwal Aktif</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari lokasi..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Location cards */}
      {locLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : locations.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground">Tidak ada lokasi ditemukan</div>
      ) : (
        <div className="space-y-3">
          {locations.map((loc) => (
            <LocationAttendanceCard key={loc.id} location={loc} />
          ))}
        </div>
      )}
    </div>
  );
}

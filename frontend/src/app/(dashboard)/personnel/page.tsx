"use client";

import { useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  SearchableSelect, type SearchableSelectOption,
} from "@/components/ui/searchable-select";
import {
  Users, Plus, Pencil, Trash2, Search, Loader2,
  GraduationCap, MapPin, Phone, FileText, Upload, ExternalLink, Award,
} from "lucide-react";
import { toast } from "sonner";
import {
  useAllPersonnel, useSavePersonnel, useDeletePersonnelGlobal,
  useLocations, usePermissions,
} from "@/lib/hooks";
import { personnelApi, type CreatePersonnelDto } from "@/lib/api/personnel";
import {
  PersonnelRole, PersonnelRoleLabels, PersonnelRoleColors,
  Gender, GenderLabels, EducationLevel, EducationLevelLabels,
} from "@/types/enums";
import type { Personnel } from "@/types/models";
import { toDateInputValue } from "@/lib/format";

const formatThousands = (raw: string) =>
  raw === "" ? "" : new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(Number(raw));
const parseDigits = (v: string) => v.replace(/\D/g, "");

const ROLE_OPTIONS: SearchableSelectOption[] = Object.values(PersonnelRole).map((r) => ({
  value: r, label: PersonnelRoleLabels[r],
}));
const GENDER_OPTIONS: SearchableSelectOption[] = Object.values(Gender).map((g) => ({
  value: g, label: GenderLabels[g],
}));
const EDUCATION_OPTIONS: SearchableSelectOption[] = Object.values(EducationLevel).map((e) => ({
  value: e, label: EducationLevelLabels[e],
}));

interface FormState {
  name: string; role: PersonnelRole | "";
  phone: string; email: string; nik: string;
  birthPlace: string; birthDate: string; gender: Gender | "";
  address: string;
  educationLevel: EducationLevel | ""; educationMajor: string; educationInstitution: string;
  diplomaFileUrl: string; diplomaFileName: string;
  honor: string; recommendedRole: PersonnelRole | "";
  notes: string;
}

const EMPTY_FORM: FormState = {
  name: "", role: "",
  phone: "", email: "", nik: "",
  birthPlace: "", birthDate: "", gender: "",
  address: "",
  educationLevel: "", educationMajor: "", educationInstitution: "",
  diplomaFileUrl: "", diplomaFileName: "",
  honor: "", recommendedRole: "",
  notes: "",
};

export default function PersonnelMasterPage() {
  const { canWrite } = usePermissions();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Personnel | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Personnel | null>(null);
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM });
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useAllPersonnel({
    ...(search ? { search } : {}),
    ...(roleFilter ? { role: roleFilter as PersonnelRole } : {}),
    ...(locationFilter === "UNASSIGNED"
      ? { unassigned: true }
      : locationFilter ? { locationId: locationFilter } : {}),
  });
  const { data: locationsRes } = useLocations({ limit: 100 });
  const save = useSavePersonnel();
  const remove = useDeletePersonnelGlobal();

  const personnel: Personnel[] = data?.data ?? [];
  const locations = useMemo(() => locationsRes?.data ?? [], [locationsRes]);

  const locationFilterOptions = useMemo<SearchableSelectOption[]>(
    () => [
      { value: "", label: "Semua penugasan" },
      { value: "UNASSIGNED", label: "Belum ditugaskan" },
      ...locations.map((l) => ({ value: l.id, label: `${l.code} · ${l.name}` })),
    ],
    [locations],
  );
  const roleFilterOptions = useMemo<SearchableSelectOption[]>(
    () => [{ value: "", label: "Semua jabatan" }, ...ROLE_OPTIONS],
    [],
  );

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setDialogOpen(true);
  }

  function openEdit(p: Personnel) {
    setEditing(p);
    setForm({
      name: p.name,
      role: p.role,
      phone: p.phone ?? "",
      email: p.email ?? "",
      nik: p.nik ?? "",
      birthPlace: p.birthPlace ?? "",
      birthDate: p.birthDate ? toDateInputValue(p.birthDate) : "",
      gender: p.gender ?? "",
      address: p.address ?? "",
      educationLevel: p.educationLevel ?? "",
      educationMajor: p.educationMajor ?? "",
      educationInstitution: p.educationInstitution ?? "",
      diplomaFileUrl: p.diplomaFileUrl ?? "",
      diplomaFileName: p.diplomaFileName ?? "",
      honor: p.honorPerDay ? String(Math.round(Number(p.honorPerDay))) : "",
      recommendedRole: p.recommendedRole ?? "",
      notes: p.notes ?? "",
    });
    setDialogOpen(true);
  }

  async function handleDiplomaFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const res = await personnelApi.uploadDiploma(file);
      setForm((f) => ({ ...f, diplomaFileUrl: res.data.url, diplomaFileName: file.name }));
      toast.success("File ijazah ter-upload");
    } catch {
      toast.error("Upload ijazah gagal");
    } finally {
      setUploading(false);
    }
  }

  const formValid = form.name.trim().length >= 2 && form.role !== "";

  function handleSubmit() {
    if (!formValid) return;
    // Penugasan lokasi sengaja TIDAK dikirim dari halaman ini —
    // create = belum ditugaskan; edit = penugasan tidak berubah.
    // Penugasan dikelola di halaman Presensi.
    const payload: CreatePersonnelDto = {
      name: form.name.trim(),
      role: form.role as PersonnelRole,
      phone: form.phone.trim(),
      email: form.email.trim() || null,
      nik: form.nik.trim(),
      birthPlace: form.birthPlace.trim(),
      birthDate: form.birthDate || null,
      gender: (form.gender || null) as Gender | null,
      address: form.address.trim(),
      educationLevel: (form.educationLevel || null) as EducationLevel | null,
      educationMajor: form.educationMajor.trim(),
      educationInstitution: form.educationInstitution.trim(),
      diplomaFileUrl: form.diplomaFileUrl || null,
      diplomaFileName: form.diplomaFileName || null,
      honorPerDay: form.honor ? Number(form.honor) : null,
      recommendedRole: (form.recommendedRole || null) as PersonnelRole | null,
      notes: form.notes.trim(),
    };
    save.mutate({ id: editing?.id, data: payload }, {
      onSuccess: () => {
        toast.success(editing ? "Data tenaga teknis diperbarui" : "Tenaga teknis ditambahkan");
        setDialogOpen(false);
      },
    });
  }

  function handleDelete() {
    if (!deleteTarget) return;
    remove.mutate(deleteTarget.id, {
      onSuccess: () => { toast.success("Tenaga teknis dihapus"); setDeleteTarget(null); },
    });
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Data Tenaga Teknis</h1>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Master tenaga teknis sesuai Kepsesma 240/2026: data pribadi, ijazah (min. SMA sederajat),
            honor, penugasan titik lokasi, dan grade jabatan rekomendasi. Presensi harian ada di menu
            Presensi Tenaga Teknis.
          </p>
        </div>
        {canWrite && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" /> Tambah Tenaga Teknis
          </Button>
        )}
      </div>

      {/* Filter */}
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama atau NIK..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="w-full lg:w-56">
          <SearchableSelect
            options={roleFilterOptions}
            value={roleFilter}
            onValueChange={setRoleFilter}
            placeholder="Filter jabatan..."
          />
        </div>
        <div className="w-full lg:w-72">
          <SearchableSelect
            options={locationFilterOptions}
            value={locationFilter}
            onValueChange={setLocationFilter}
            placeholder="Filter penugasan..."
            searchPlaceholder="Cari lokasi..."
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : personnel.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Belum ada tenaga teknis terdaftar.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Nama</TableHead>
                  <TableHead className="w-40">Jabatan</TableHead>
                  <TableHead className="w-44">Pendidikan</TableHead>
                  <TableHead className="w-32 text-right">Honor/Hari (Rp)</TableHead>
                  <TableHead className="w-52">Penugasan</TableHead>
                  <TableHead className="w-40">Grade Rekomendasi</TableHead>
                  <TableHead className="w-24 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {personnel.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <p className="font-medium text-sm">{p.name}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                        {p.nik && <span className="text-[11px] text-muted-foreground font-mono">NIK {p.nik}</span>}
                        {p.phone && (
                          <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {p.phone}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${PersonnelRoleColors[p.role]}`}>
                        {PersonnelRoleLabels[p.role]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {p.educationLevel ? (
                        <div className="text-xs">
                          <span className="inline-flex items-center gap-1 font-medium">
                            <GraduationCap className="h-3 w-3" /> {EducationLevelLabels[p.educationLevel]}
                          </span>
                          {p.educationInstitution && (
                            <p className="text-[11px] text-muted-foreground truncate max-w-[160px]">
                              {p.educationInstitution}
                            </p>
                          )}
                          {p.diplomaFileUrl && (
                            <a
                              href={p.diplomaFileUrl} target="_blank" rel="noreferrer"
                              className="text-[11px] text-blue-600 hover:underline inline-flex items-center gap-0.5"
                            >
                              <FileText className="h-3 w-3" /> Ijazah <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-amber-600">Belum diisi</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {p.honorPerDay ? formatThousands(String(Math.round(Number(p.honorPerDay)))) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {p.location ? (
                        <span className="text-xs inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="font-mono text-[11px]">{p.location.code}</span>
                          <span className="truncate max-w-[130px]">{p.location.name}</span>
                        </span>
                      ) : (
                        <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                          Belum ditugaskan
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {p.recommendedRole ? (
                        <span className="text-xs inline-flex items-center gap-1">
                          <Award className="h-3 w-3 text-amber-500" />
                          {PersonnelRoleLabels[p.recommendedRole]}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {canWrite && (
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(p)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon" variant="ghost"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setDeleteTarget(p)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">{personnel.length} tenaga teknis</p>

      {/* Dialog Tambah/Edit — modal besar agar seluruh data tampil */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[96vw] max-w-[96vw] sm:max-w-[1100px] h-[92vh] max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 pt-5 pb-4 border-b shrink-0">
            <DialogTitle className="text-base">
              {editing ? `Edit Tenaga Teknis — ${editing.name}` : "Tambah Tenaga Teknis"}
            </DialogTitle>
            <DialogDescription className="text-sm">
              Data sesuai Kepsesma 240/2026 — pendidikan minimal SMA sederajat dan wajib mudah dihubungi.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            {/* ── Data Pribadi ── */}
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Data Pribadi</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Nama Lengkap <span className="text-destructive">*</span></Label>
                  <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>NIK</Label>
                  <Input
                    inputMode="numeric" maxLength={16} placeholder="16 digit"
                    value={form.nik}
                    onChange={(e) => setForm((f) => ({ ...f, nik: parseDigits(e.target.value) }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Jenis Kelamin</Label>
                  <SearchableSelect
                    options={GENDER_OPTIONS}
                    value={form.gender || null}
                    onValueChange={(v) => setForm((f) => ({ ...f, gender: v as Gender }))}
                    placeholder="Pilih..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Tempat Lahir</Label>
                  <Input value={form.birthPlace} onChange={(e) => setForm((f) => ({ ...f, birthPlace: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Tanggal Lahir</Label>
                  <Input
                    type="date"
                    value={form.birthDate}
                    onChange={(e) => setForm((f) => ({ ...f, birthDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>No. HP <span className="text-[10px] text-muted-foreground">(wajib mudah dihubungi)</span></Label>
                  <Input
                    inputMode="tel"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Alamat</Label>
                  <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
                </div>
              </div>
            </section>

            {/* ── Pendidikan & Ijazah ── */}
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Pendidikan &amp; Ijazah <span className="normal-case font-normal">(min. SMA sederajat — Kepsesma G.1.8)</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label>Jenjang</Label>
                  <SearchableSelect
                    options={EDUCATION_OPTIONS}
                    value={form.educationLevel || null}
                    onValueChange={(v) => setForm((f) => ({ ...f, educationLevel: v as EducationLevel }))}
                    placeholder="Pilih..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Jurusan</Label>
                  <Input value={form.educationMajor} onChange={(e) => setForm((f) => ({ ...f, educationMajor: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Institusi/Sekolah</Label>
                  <Input value={form.educationInstitution} onChange={(e) => setForm((f) => ({ ...f, educationInstitution: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>File Ijazah</Label>
                  <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleDiplomaFile} />
                  {form.diplomaFileUrl ? (
                    <div className="flex items-center gap-1.5">
                      <a
                        href={form.diplomaFileUrl} target="_blank" rel="noreferrer"
                        className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1 truncate max-w-[140px]"
                      >
                        <FileText className="h-3.5 w-3.5 shrink-0" /> {form.diplomaFileName || "Lihat ijazah"}
                      </a>
                      <Button
                        type="button" size="icon" variant="ghost" className="h-7 w-7 text-red-600"
                        onClick={() => setForm((f) => ({ ...f, diplomaFileUrl: "", diplomaFileName: "" }))}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button" size="sm" variant="outline" className="w-full"
                      disabled={uploading}
                      onClick={() => fileRef.current?.click()}
                    >
                      {uploading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1.5" />}
                      Upload (PDF/JPG/PNG)
                    </Button>
                  )}
                </div>
              </div>
            </section>

            {/* ── Jabatan, Honor & Penugasan ── */}
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Jabatan, Honor &amp; Penugasan
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label>Jabatan Saat Ini <span className="text-destructive">*</span></Label>
                  <SearchableSelect
                    options={ROLE_OPTIONS}
                    value={form.role || null}
                    onValueChange={(v) => setForm((f) => ({ ...f, role: v as PersonnelRole }))}
                    placeholder="Pilih jabatan..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Grade Jabatan Rekomendasi</Label>
                  <SearchableSelect
                    options={ROLE_OPTIONS}
                    value={form.recommendedRole || null}
                    onValueChange={(v) => setForm((f) => ({ ...f, recommendedRole: v as PersonnelRole }))}
                    placeholder="Pilih rekomendasi..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Honor per Hari (Rp)</Label>
                  <Input
                    type="text" inputMode="numeric" placeholder="0"
                    className="text-right tabular-nums"
                    value={formatThousands(form.honor)}
                    onChange={(e) => setForm((f) => ({ ...f, honor: parseDigits(e.target.value) }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Penugasan Titik Lokasi</Label>
                  <p className="text-xs text-muted-foreground border rounded-md px-3 py-2 bg-muted/30">
                    {editing?.location
                      ? `${editing.location.code} · ${editing.location.name}`
                      : "Belum ditugaskan"}{" "}
                    — penugasan dilakukan lewat halaman <span className="font-medium">Presensi</span>.
                  </p>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Catatan</Label>
                <Textarea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
            </section>
          </div>

          <DialogFooter className="gap-2 items-center px-6 py-3 border-t shrink-0 bg-card">
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button size="sm" disabled={!formValid || save.isPending || uploading} onClick={handleSubmit}>
              {save.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {editing ? "Simpan" : "Tambah"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Hapus */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Hapus Tenaga Teknis</DialogTitle>
            <DialogDescription className="text-sm">
              Hapus <span className="font-semibold">{deleteTarget?.name}</span> beserta seluruh riwayat
              presensinya? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>Batal</Button>
            <Button size="sm" variant="destructive" disabled={remove.isPending} onClick={handleDelete}>
              {remove.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

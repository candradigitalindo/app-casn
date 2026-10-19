"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  SearchableSelect, type SearchableSelectOption,
} from "@/components/ui/searchable-select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Database, Plus, Pencil, Trash2, Search, Loader2, ShieldCheck, ChevronLeft, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  useProvinces, useRegencies, useCreateRegency, useUpdateRegency, useDeleteRegency, usePermissions,
} from "@/lib/hooks";
import type { Province, Regency, RegencyType } from "@/lib/api/master-data";

const PAGE_SIZE = 50;
const EMPTY_FORM = { code: "", name: "", type: "KABUPATEN" as RegencyType, provinceId: "" };

const TYPE_OPTIONS: SearchableSelectOption[] = [
  { value: "KABUPATEN", label: "Kabupaten" },
  { value: "KOTA", label: "Kota" },
];

const TYPE_FILTER_OPTIONS: SearchableSelectOption[] = [
  { value: "ALL", label: "Semua Tipe" },
  ...TYPE_OPTIONS,
];

export default function KabupatenKotaPage() {
  const { isSuperAdmin } = usePermissions();
  const [search, setSearch] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Regency | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Regency | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const { data: provData } = useProvinces();
  const { data, isLoading } = useRegencies({
    provinceId: provinceFilter !== "ALL" ? provinceFilter : undefined,
    type: typeFilter !== "ALL" ? (typeFilter as RegencyType) : undefined,
    search: search || undefined,
  });
  const create = useCreateRegency();
  const update = useUpdateRegency();
  const remove = useDeleteRegency();

  const provinces: Province[] = useMemo(() => provData?.data ?? [], [provData]);
  const regencies: Regency[] = useMemo(() => data?.data ?? [], [data]);

  const provinceOptions = useMemo<SearchableSelectOption[]>(
    () => provinces.map((p) => ({ value: p.id, label: p.name, keywords: p.code })),
    [provinces]
  );

  const provinceFilterOptions = useMemo<SearchableSelectOption[]>(
    () => [{ value: "ALL", label: "Semua Provinsi" }, ...provinceOptions],
    [provinceOptions]
  );

  const totalPages = Math.max(1, Math.ceil(regencies.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = regencies.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  if (!isSuperAdmin) {
    return (
      <div className="p-8 flex flex-col items-center justify-center text-center gap-2 min-h-[60vh]">
        <ShieldCheck className="h-10 w-10 text-muted-foreground" />
        <h1 className="text-lg font-semibold">Akses Ditolak</h1>
        <p className="text-sm text-muted-foreground max-w-sm">Master data hanya dapat diakses oleh Super Admin.</p>
      </div>
    );
  }

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM, provinceId: provinceFilter !== "ALL" ? provinceFilter : "" });
    setDialogOpen(true);
  }

  function openEdit(r: Regency) {
    setEditing(r);
    setForm({ code: r.code, name: r.name, type: r.type, provinceId: r.provinceId });
    setDialogOpen(true);
  }

  const formValid = !!form.code.trim() && !!form.name.trim() && !!form.provinceId;

  function handleSubmit() {
    if (!formValid) return;
    const payload = {
      code: form.code.trim(),
      name: form.name.trim(),
      type: form.type,
      provinceId: form.provinceId,
    };
    if (editing) {
      update.mutate({ id: editing.id, data: payload }, {
        onSuccess: () => { toast.success("Kabupaten/kota diperbarui"); setDialogOpen(false); },
      });
    } else {
      create.mutate(payload, {
        onSuccess: () => { toast.success("Kabupaten/kota ditambahkan"); setDialogOpen(false); },
      });
    }
  }

  function handleDelete() {
    if (!deleteTarget) return;
    remove.mutate(deleteTarget.id, {
      onSuccess: () => { toast.success("Kabupaten/kota dihapus"); setDeleteTarget(null); },
    });
  }

  const isPending = create.isPending || update.isPending;

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Master Data — Kabupaten / Kota</h1>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Daftar kabupaten/kota seluruh Indonesia (kode Kemendagri)
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Tambah Kabupaten/Kota
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama atau kode..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <SearchableSelect
          options={provinceFilterOptions}
          value={provinceFilter}
          onValueChange={(v) => { setProvinceFilter(v || "ALL"); setPage(1); }}
          searchPlaceholder="Cari provinsi..."
          className="sm:w-60"
        />
        <SearchableSelect
          options={TYPE_FILTER_OPTIONS}
          value={typeFilter}
          onValueChange={(v) => { setTypeFilter(v || "ALL"); setPage(1); }}
          className="sm:w-44"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : paged.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Tidak ada kabupaten/kota ditemukan.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Kode</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead className="w-32">Tipe</TableHead>
                  <TableHead className="w-48">Provinsi</TableHead>
                  <TableHead className="w-28 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-sm">{r.code}</TableCell>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={r.type === "KOTA"
                          ? "text-xs text-blue-700 bg-blue-50 border-blue-200"
                          : "text-xs text-emerald-700 bg-emerald-50 border-emerald-200"}
                      >
                        {r.type === "KOTA" ? "Kota" : "Kabupaten"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.province?.name ?? "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(r)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon" variant="ghost"
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setDeleteTarget(r)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {regencies.length} kabupaten/kota{regencies.length > PAGE_SIZE ? ` — halaman ${safePage} dari ${totalPages}` : ""}
        </p>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <Button
              size="icon" variant="outline" className="h-8 w-8"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              size="icon" variant="outline" className="h-8 w-8"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Dialog Tambah/Edit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">{editing ? "Edit Kabupaten/Kota" : "Tambah Kabupaten/Kota"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Provinsi <span className="text-destructive">*</span></Label>
              <SearchableSelect
                options={provinceOptions}
                value={form.provinceId || null}
                onValueChange={(v) => setForm((f) => ({ ...f, provinceId: v }))}
                placeholder="Pilih provinsi..."
                searchPlaceholder="Cari provinsi..."
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Kode <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="cth: 11.01"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tipe <span className="text-destructive">*</span></Label>
                <SearchableSelect
                  options={TYPE_OPTIONS}
                  value={form.type}
                  onValueChange={(v) => setForm((f) => ({ ...f, type: (v || "KABUPATEN") as RegencyType }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Nama <span className="text-destructive">*</span></Label>
              <Input
                placeholder="cth: Kabupaten Aceh Selatan"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button size="sm" disabled={!formValid || isPending} onClick={handleSubmit}>
              {isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {editing ? "Simpan" : "Tambah"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Hapus */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Hapus Kabupaten/Kota</DialogTitle>
            <DialogDescription className="text-sm">
              Hapus <span className="font-semibold">{deleteTarget?.name}</span>? Tindakan ini tidak dapat dibatalkan.
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

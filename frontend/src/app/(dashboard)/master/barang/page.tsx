"use client";

import { useState } from "react";
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
import { Boxes, Plus, Pencil, Trash2, Search, Loader2, ShieldCheck, Cpu, Armchair } from "lucide-react";
import { toast } from "sonner";
import {
  useMasterItems, useCreateMasterItem, useUpdateMasterItem, useDeleteMasterItem, usePermissions,
} from "@/lib/hooks";
import {
  SarprasCategoryLabels,
  type MasterItem, type MasterItemPayload, type SarprasCategory,
} from "@/lib/api/master-data";

const TIERS = [100, 200, 300, 400, 500] as const;
type QtyField = "qty100" | "qty200" | "qty300" | "qty400" | "qty500";

const CATEGORY_OPTIONS: SearchableSelectOption[] = (
  Object.entries(SarprasCategoryLabels) as [SarprasCategory, string][]
).map(([value, label]) => ({ value, label }));

const CategoryBadgeStyles: Record<SarprasCategory, string> = {
  SARPRAS_IT: "bg-blue-100 text-blue-700 border-blue-200",
  SARPRAS_NON_IT: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const EMPTY_FORM = {
  no: "",
  name: "",
  unit: "unit",
  category: "SARPRAS_NON_IT" as SarprasCategory,
  qty100: "0", qty200: "0", qty300: "0", qty400: "0", qty500: "0",
  notes: "",
  isActive: true,
};

export default function MasterBarangPage() {
  const { isSuperAdmin } = usePermissions();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<SarprasCategory | "ALL">("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MasterItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MasterItem | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const { data, isLoading } = useMasterItems({
    search: search || undefined,
    includeInactive: true,
    ...(categoryFilter !== "ALL" ? { category: categoryFilter } : {}),
  });
  const create = useCreateMasterItem();
  const update = useUpdateMasterItem();
  const remove = useDeleteMasterItem();

  const items: MasterItem[] = data?.data ?? [];

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
    const nextNo = items.length > 0 ? Math.max(...items.map((i) => i.no)) + 1 : 1;
    setForm({ ...EMPTY_FORM, no: String(nextNo) });
    setDialogOpen(true);
  }

  function openEdit(item: MasterItem) {
    setEditing(item);
    setForm({
      no: String(item.no),
      name: item.name,
      unit: item.unit,
      category: item.category,
      qty100: String(item.qty100),
      qty200: String(item.qty200),
      qty300: String(item.qty300),
      qty400: String(item.qty400),
      qty500: String(item.qty500),
      notes: item.notes ?? "",
      isActive: item.isActive,
    });
    setDialogOpen(true);
  }

  const formValid =
    form.name.trim().length >= 3 &&
    form.unit.trim().length >= 1 &&
    Number(form.no) >= 1 &&
    TIERS.every((t) => Number(form[`qty${t}` as QtyField]) >= 0);

  function handleSubmit() {
    if (!formValid) return;
    const payload: MasterItemPayload = {
      no: Number(form.no),
      name: form.name.trim(),
      unit: form.unit.trim(),
      category: form.category,
      qty100: Number(form.qty100),
      qty200: Number(form.qty200),
      qty300: Number(form.qty300),
      qty400: Number(form.qty400),
      qty500: Number(form.qty500),
      isActive: form.isActive,
      ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
    };
    if (editing) {
      update.mutate({ id: editing.id, data: payload }, {
        onSuccess: () => { toast.success("Item master diperbarui"); setDialogOpen(false); },
      });
    } else {
      create.mutate(payload, {
        onSuccess: () => { toast.success("Item master ditambahkan"); setDialogOpen(false); },
      });
    }
  }

  function handleDelete() {
    if (!deleteTarget) return;
    remove.mutate(deleteTarget.id, {
      onSuccess: () => { toast.success("Item master dihapus"); setDeleteTarget(null); },
    });
  }

  const isPending = create.isPending || update.isPending;

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Boxes className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Master Data — Barang Sarpras</h1>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            38 item standar sarana prasarana per tier kapasitas (Lampiran E Kepsesma BKN No 240 Tahun 2026).
            Perubahan di sini menjadi acuan barang di seluruh titik lokasi.
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Tambah Item
        </Button>
      </div>

      {/* Filter */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama item..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1">
          {([
            { key: "ALL" as const, label: "Semua", icon: Boxes },
            { key: "SARPRAS_IT" as const, label: "Sarpras IT", icon: Cpu },
            { key: "SARPRAS_NON_IT" as const, label: "Sarpras Non IT", icon: Armchair },
          ]).map(({ key, label, icon: Icon }) => (
            <Button
              key={key}
              size="sm"
              variant={categoryFilter === key ? "default" : "outline"}
              onClick={() => setCategoryFilter(key)}
            >
              <Icon className="h-3.5 w-3.5 mr-1.5" /> {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Tidak ada item ditemukan.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">No</TableHead>
                  <TableHead className="min-w-[280px]">Uraian</TableHead>
                  <TableHead className="w-32">Kategori</TableHead>
                  <TableHead className="w-20">Satuan</TableHead>
                  {TIERS.map((t) => (
                    <TableHead key={t} className="w-16 text-center">{t}</TableHead>
                  ))}
                  <TableHead className="w-20 text-center">Status</TableHead>
                  <TableHead className="w-24 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id} className={!item.isActive ? "opacity-50" : undefined}>
                    <TableCell className="font-mono text-sm">{item.no}</TableCell>
                    <TableCell>
                      <p className="font-medium text-sm leading-snug">{item.name}</p>
                      {item.notes && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{item.notes}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${CategoryBadgeStyles[item.category]}`}>
                        {SarprasCategoryLabels[item.category]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{item.unit}</TableCell>
                    {TIERS.map((t) => (
                      <TableCell key={t} className="text-center tabular-nums text-sm">
                        {item[`qty${t}` as QtyField]}
                      </TableCell>
                    ))}
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-[10px]">
                        {item.isActive ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(item)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon" variant="ghost"
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setDeleteTarget(item)}
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
      <p className="text-xs text-muted-foreground">
        {items.length} item
        {categoryFilter === "ALL" && (
          <>
            {" "}({items.filter((i) => i.category === "SARPRAS_IT").length} Sarpras IT,{" "}
            {items.filter((i) => i.category === "SARPRAS_NON_IT").length} Sarpras Non IT)
          </>
        )}
        {" "}· Kolom 100–500 = kuantitas per tier jumlah peserta per sesi
      </p>

      {/* Dialog Tambah/Edit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">{editing ? "Edit Item Master" : "Tambah Item Master"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label>No Urut <span className="text-destructive">*</span></Label>
                <Input
                  type="number" min={1}
                  value={form.no}
                  onChange={(e) => setForm((f) => ({ ...f, no: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Satuan <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="cth: unit / m2 / paket"
                  value={form.unit}
                  onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <label className="flex items-center gap-2 h-9 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                    className="h-4 w-4"
                  />
                  Aktif
                </label>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Uraian Item <span className="text-destructive">*</span></Label>
              <Textarea
                rows={2}
                placeholder="cth: Sewa laptop client untuk peserta ujian termasuk jaringan LAN dan elektrikal"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Kategori <span className="text-destructive">*</span></Label>
              <SearchableSelect
                options={CATEGORY_OPTIONS}
                value={form.category}
                onValueChange={(v) => setForm((f) => ({ ...f, category: (v || "SARPRAS_NON_IT") as SarprasCategory }))}
              />
              <p className="text-[11px] text-muted-foreground">
                Menjadi data dasar pemetaan vendor: Sarpras IT (laptop, jaringan, CCTV, dsb.) vs
                Sarpras Non IT (tenda, meja kursi, genset, gedung, dsb.)
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Kuantitas per Tier Kapasitas (peserta per sesi)</Label>
              <div className="grid grid-cols-5 gap-3">
                {TIERS.map((t) => (
                  <div key={t} className="space-y-1">
                    <p className="text-[11px] text-muted-foreground text-center">{t}</p>
                    <Input
                      type="number" min={0}
                      className="text-center"
                      value={form[`qty${t}` as QtyField]}
                      onChange={(e) => setForm((f) => ({ ...f, [`qty${t}`]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Catatan / Spesifikasi Ringkas</Label>
              <Textarea
                rows={2}
                placeholder="cth: Minimal 900 VA; cadangan 5% wajib touchscreen"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
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
            <DialogTitle className="text-base">Hapus Item Master</DialogTitle>
            <DialogDescription className="text-sm">
              Hapus item <span className="font-semibold">No {deleteTarget?.no} — {deleteTarget?.name}</span>?
              Barang yang sudah tergenerate di titik lokasi tidak ikut terhapus, tetapi item ini tidak lagi
              menjadi acuan saat sinkronisasi. Pertimbangkan menonaktifkan (uncheck Aktif) daripada menghapus.
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

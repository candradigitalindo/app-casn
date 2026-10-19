"use client";

import { useEffect, useMemo, useState } from "react";
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
  Handshake, Plus, Pencil, Trash2, Search, Loader2, ShieldCheck,
  Cpu, Armchair, Star, MapPin, Phone, Package,
} from "lucide-react";
import { toast } from "sonner";
import {
  useVendors, useCreateVendor, useUpdateVendor, useDeleteVendor,
  useVendorItems, useSetVendorItems, useMasterItems,
  useProvinces, usePermissions,
} from "@/lib/hooks";
import {
  SarprasCategoryLabels,
  type MasterItem, type SarprasCategory,
} from "@/lib/api/master-data";
import {
  PriceUnitLabels,
  type PriceUnit, type Vendor, type VendorItemInput, type VendorPayload,
} from "@/lib/api/vendors";

const CategoryBadgeStyles: Record<SarprasCategory, string> = {
  SARPRAS_IT: "bg-blue-100 text-blue-700 border-blue-200",
  SARPRAS_NON_IT: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

interface VendorForm {
  name: string;
  categories: SarprasCategory[];
  npwp: string;
  nib: string;
  kbli: string;
  address: string;
  provinceId: string;
  picName: string;
  picPhone: string;
  email: string;
  rating: string;
  isActive: boolean;
  notes: string;
  coverageProvinceIds: string[];
}

const EMPTY_FORM: VendorForm = {
  name: "", categories: [], npwp: "", nib: "", kbli: "", address: "",
  provinceId: "", picName: "", picPhone: "", email: "", rating: "",
  isActive: true, notes: "", coverageProvinceIds: [],
};

// Format angka gaya Indonesia (pemisah ribuan titik) tanpa prefix "Rp".
// State menyimpan digit mentah; tampilan diformat saat render.
const formatThousands = (raw: string) =>
  raw === "" ? "" : new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(Number(raw));
const parseDigits = (v: string) => v.replace(/\D/g, "");

// ─────────────────────────────────────────────────────────────
// Dialog Barang & Harga vendor: daftar item master sesuai kategori
// vendor, dengan jumlah sanggup pasok + harga satuan per hari.
// ─────────────────────────────────────────────────────────────
interface ItemRowState {
  offered: boolean;
  qty: string;
  price: string;
  unit: PriceUnit;
}

function VendorItemsDialog({
  vendor, onClose,
}: {
  vendor: Vendor;
  onClose: () => void;
}) {
  const { data: masterRes, isLoading: masterLoading } = useMasterItems({});
  const { data: itemsRes, isLoading: itemsLoading } = useVendorItems(vendor.id);
  const save = useSetVendorItems();
  const [rows, setRows] = useState<Record<string, ItemRowState>>({});

  const masterItems: MasterItem[] = useMemo(
    () => (masterRes?.data ?? []).filter((m) => vendor.categories.includes(m.category)),
    [masterRes, vendor.categories],
  );

  // Prefill dari data tersimpan setelah kedua query selesai.
  useEffect(() => {
    if (!masterRes || !itemsRes) return;
    const saved = new Map(
      (itemsRes.data ?? []).map((vi) => [vi.masterItemId, vi]),
    );
    setRows(
      Object.fromEntries(
        (masterRes.data ?? []).map((m) => {
          const vi = saved.get(m.id);
          return [m.id, {
            offered: !!vi,
            qty: vi ? String(vi.qty) : "",
            price: vi ? String(Number(vi.unitPrice)) : "",
            unit: (vi?.priceUnit ?? "PER_HARI") as PriceUnit,
          }];
        }),
      ),
    );
  }, [masterRes, itemsRes]);

  const offeredCount = masterItems.filter((m) => rows[m.id]?.offered).length;
  const allValid = masterItems.every((m) => {
    const r = rows[m.id];
    if (!r?.offered) return true;
    return Number(r.qty) >= 1 && r.price !== "" && Number(r.price) >= 0;
  });

  function setRow(id: string, patch: Partial<ItemRowState>) {
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  function handleSave() {
    const items: VendorItemInput[] = masterItems
      .filter((m) => rows[m.id]?.offered)
      .map((m) => ({
        masterItemId: m.id,
        qty: Number(rows[m.id].qty),
        unitPrice: Number(rows[m.id].price),
        priceUnit: rows[m.id].unit,
      }));
    save.mutate({ id: vendor.id, items }, {
      onSuccess: () => { toast.success("Barang & harga vendor disimpan"); onClose(); },
    });
  }

  const loading = masterLoading || itemsLoading;
  const categoriesShown = (Object.keys(SarprasCategoryLabels) as SarprasCategory[])
    .filter((c) => vendor.categories.includes(c));

  // Modal hampir layar penuh: header & footer tetap, isi scrollable,
  // dua kategori tampil berdampingan pada layar lebar agar seluruh
  // daftar item terlihat sekaligus.
  const twoColumns = categoriesShown.length > 1;

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="w-[96vw] max-w-[96vw] sm:max-w-[1500px] h-[92vh] max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-4 border-b shrink-0">
          <DialogTitle className="text-base">Barang &amp; Harga — {vendor.name}</DialogTitle>
          <DialogDescription className="text-sm">
            Centang barang yang sanggup dipasok vendor, isi jumlah maksimal dan harga satuan
            per hari. Daftar ini menjadi dasar harga saat menyusun penawaran.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className={`grid gap-6 items-start ${twoColumns ? "xl:grid-cols-2" : ""}`}>
              {categoriesShown.map((cat) => {
                const items = masterItems.filter((m) => m.category === cat);
                if (items.length === 0) return null;
                const catOffered = items.filter((m) => rows[m.id]?.offered).length;
                return (
                  <div key={cat} className="space-y-2 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className={`text-[11px] ${CategoryBadgeStyles[cat]}`}>
                        {SarprasCategoryLabels[cat]} · {catOffered}/{items.length} item
                      </Badge>
                      <div className="flex gap-2">
                        <Button
                          type="button" size="sm" variant="outline" className="h-7 text-xs"
                          onClick={() => setRows((prev) => {
                            const next = { ...prev };
                            for (const m of items) next[m.id] = { ...next[m.id], offered: true };
                            return next;
                          })}
                        >
                          Centang Semua
                        </Button>
                        <Button
                          type="button" size="sm" variant="outline" className="h-7 text-xs"
                          onClick={() => setRows((prev) => {
                            const next = { ...prev };
                            for (const m of items) next[m.id] = { ...next[m.id], offered: false };
                            return next;
                          })}
                        >
                          Kosongkan
                        </Button>
                      </div>
                    </div>
                    <div className="border rounded-md overflow-x-auto">
                      <Table>
                        <TableHeader className="sticky top-0 z-10 bg-card shadow-[0_1px_0_0_hsl(var(--border))]">
                          <TableRow>
                            <TableHead className="w-10 bg-card"></TableHead>
                            <TableHead className="min-w-[240px] bg-card">Item</TableHead>
                            <TableHead className="w-28 text-center bg-card">Jumlah Maks</TableHead>
                            <TableHead className="w-36 text-center bg-card">Harga (Rp)</TableHead>
                            <TableHead className="w-28 text-center bg-card">Satuan</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map((m) => {
                            const r = rows[m.id] ?? { offered: false, qty: "", price: "", unit: "PER_HARI" as PriceUnit };
                            return (
                              <TableRow key={m.id} className={!r.offered ? "opacity-60" : undefined}>
                                <TableCell>
                                  <input
                                    type="checkbox"
                                    className="h-4 w-4"
                                    checked={r.offered}
                                    onChange={(e) => setRow(m.id, { offered: e.target.checked })}
                                  />
                                </TableCell>
                                <TableCell>
                                  <p className="text-sm leading-snug">
                                    <span className="font-mono text-xs text-muted-foreground mr-1.5">{m.no}.</span>
                                    {m.name}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground">satuan: {m.unit}</p>
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="text" inputMode="numeric"
                                    className="h-8 text-center tabular-nums"
                                    disabled={!r.offered}
                                    placeholder="0"
                                    value={formatThousands(r.qty)}
                                    onChange={(e) => setRow(m.id, { qty: parseDigits(e.target.value) })}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="text" inputMode="numeric"
                                    className="h-8 text-right tabular-nums"
                                    disabled={!r.offered}
                                    placeholder="0"
                                    value={formatThousands(r.price)}
                                    onChange={(e) => setRow(m.id, { price: parseDigits(e.target.value) })}
                                  />
                                </TableCell>
                                <TableCell>
                                  <select
                                    className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs disabled:opacity-50"
                                    disabled={!r.offered}
                                    value={r.unit}
                                    onChange={(e) => setRow(m.id, { unit: e.target.value as PriceUnit })}
                                  >
                                    {(Object.entries(PriceUnitLabels) as [PriceUnit, string][]).map(([v, label]) => (
                                      <option key={v} value={v}>{label}</option>
                                    ))}
                                  </select>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 items-center px-6 py-3 border-t shrink-0 bg-card">
          <p className="text-xs text-muted-foreground mr-auto">
            {offeredCount} barang ditawarkan
            {!allValid && (
              <span className="text-amber-600 ml-2">
                — lengkapi jumlah &amp; harga pada item yang dicentang
              </span>
            )}
          </p>
          <Button variant="outline" size="sm" onClick={onClose}>Batal</Button>
          <Button size="sm" disabled={loading || !allValid || save.isPending} onClick={handleSave}>
            {save.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function VendorsPage() {
  const { canManageProcurement } = usePermissions();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<SarprasCategory | "ALL">("ALL");
  const [provinceFilter, setProvinceFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Vendor | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Vendor | null>(null);
  const [itemsTarget, setItemsTarget] = useState<Vendor | null>(null);
  const [form, setForm] = useState<VendorForm>({ ...EMPTY_FORM });

  const { data, isLoading } = useVendors({
    search: search || undefined,
    includeInactive: true,
    ...(categoryFilter !== "ALL" ? { category: categoryFilter } : {}),
    ...(provinceFilter ? { provinceId: provinceFilter } : {}),
  });
  const { data: provincesRes } = useProvinces();
  const create = useCreateVendor();
  const update = useUpdateVendor();
  const remove = useDeleteVendor();

  const vendors: Vendor[] = data?.data ?? [];
  const provinces = useMemo(() => provincesRes?.data ?? [], [provincesRes]);
  const totalProvinces = provinces.length;

  const provinceOptions = useMemo<SearchableSelectOption[]>(
    () => provinces.map((p) => ({ value: p.id, label: p.name })),
    [provinces],
  );
  const provinceFilterOptions = useMemo<SearchableSelectOption[]>(
    () => [{ value: "", label: "Semua Provinsi (cakupan)" }, ...provinceOptions],
    [provinceOptions],
  );

  if (!canManageProcurement) {
    return (
      <div className="p-8 flex flex-col items-center justify-center text-center gap-2 min-h-[60vh]">
        <ShieldCheck className="h-10 w-10 text-muted-foreground" />
        <h1 className="text-lg font-semibold">Akses Ditolak</h1>
        <p className="text-sm text-muted-foreground max-w-sm">
          Modul Pengadaan hanya dapat diakses oleh Super Admin dan Tim Logistik.
        </p>
      </div>
    );
  }

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setDialogOpen(true);
  }

  function openEdit(v: Vendor) {
    setEditing(v);
    setForm({
      name: v.name,
      categories: v.categories,
      npwp: v.npwp ?? "",
      nib: v.nib ?? "",
      kbli: v.kbli ?? "",
      address: v.address ?? "",
      provinceId: v.provinceId ?? "",
      picName: v.picName ?? "",
      picPhone: v.picPhone ?? "",
      email: v.email ?? "",
      rating: v.rating ? String(v.rating) : "",
      isActive: v.isActive,
      notes: v.notes ?? "",
      coverageProvinceIds: v.coverages.map((c) => c.provinceId),
    });
    setDialogOpen(true);
  }

  function toggleCategory(cat: SarprasCategory) {
    setForm((f) => ({
      ...f,
      categories: f.categories.includes(cat)
        ? f.categories.filter((c) => c !== cat)
        : [...f.categories, cat],
    }));
  }

  function toggleCoverage(provinceId: string) {
    setForm((f) => ({
      ...f,
      coverageProvinceIds: f.coverageProvinceIds.includes(provinceId)
        ? f.coverageProvinceIds.filter((id) => id !== provinceId)
        : [...f.coverageProvinceIds, provinceId],
    }));
  }

  const formValid =
    form.name.trim().length >= 2 &&
    form.categories.length > 0 &&
    form.coverageProvinceIds.length > 0;

  function handleSubmit() {
    if (!formValid) return;
    const payload: VendorPayload = {
      name: form.name.trim(),
      categories: form.categories,
      ...(form.npwp.trim() ? { npwp: form.npwp.trim() } : {}),
      ...(form.nib.trim() ? { nib: form.nib.trim() } : {}),
      ...(form.kbli.trim() ? { kbli: form.kbli.trim() } : {}),
      ...(form.address.trim() ? { address: form.address.trim() } : {}),
      ...(form.provinceId ? { provinceId: form.provinceId } : {}),
      ...(form.picName.trim() ? { picName: form.picName.trim() } : {}),
      ...(form.picPhone.trim() ? { picPhone: form.picPhone.trim() } : {}),
      ...(form.email.trim() ? { email: form.email.trim() } : {}),
      ...(form.rating ? { rating: Number(form.rating) } : {}),
      isActive: form.isActive,
      ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
      coverageProvinceIds: form.coverageProvinceIds,
    };
    if (editing) {
      update.mutate({ id: editing.id, data: payload }, {
        onSuccess: () => { toast.success("Vendor diperbarui"); setDialogOpen(false); },
      });
    } else {
      create.mutate(payload, {
        onSuccess: () => { toast.success("Vendor ditambahkan"); setDialogOpen(false); },
      });
    }
  }

  function handleDelete() {
    if (!deleteTarget) return;
    remove.mutate(deleteTarget.id, {
      onSuccess: () => { toast.success("Vendor dihapus"); setDeleteTarget(null); },
    });
  }

  function coverageLabel(v: Vendor) {
    if (totalProvinces > 0 && v.coverages.length >= totalProvinces) {
      return `Semua provinsi (${v.coverages.length})`;
    }
    return `${v.coverages.length} provinsi`;
  }

  const isPending = create.isPending || update.isPending;

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Handshake className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Vendor Rekanan</h1>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Master vendor pemasok Sarpras IT &amp; Non IT beserta cakupan wilayahnya —
            basis harga penawaran ke instansi. Satu wilayah bisa dilayani lebih dari satu vendor.
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Tambah Vendor
        </Button>
      </div>

      {/* Filter */}
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama atau kode vendor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1">
          {([
            { key: "ALL" as const, label: "Semua", icon: Handshake },
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
        <div className="w-full lg:w-64">
          <SearchableSelect
            options={provinceFilterOptions}
            value={provinceFilter}
            onValueChange={setProvinceFilter}
            placeholder="Filter provinsi cakupan..."
            searchPlaceholder="Cari provinsi..."
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
          ) : vendors.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Belum ada vendor. Klik &ldquo;Tambah Vendor&rdquo; untuk mendaftarkan vendor rekanan pertama.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Kode</TableHead>
                  <TableHead className="min-w-[220px]">Vendor</TableHead>
                  <TableHead className="w-44">Kategori</TableHead>
                  <TableHead className="w-40">Cakupan</TableHead>
                  <TableHead className="w-24 text-center">Barang</TableHead>
                  <TableHead className="w-24 text-center">Rating</TableHead>
                  <TableHead className="w-24 text-center">Status</TableHead>
                  <TableHead className="w-24 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors.map((v) => (
                  <TableRow key={v.id} className={!v.isActive ? "opacity-50" : undefined}>
                    <TableCell className="font-mono text-sm">{v.code}</TableCell>
                    <TableCell>
                      <p className="font-medium text-sm">{v.name}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                        {v.province && (
                          <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {v.province.name}
                          </span>
                        )}
                        {v.picName && (
                          <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {v.picName}{v.picPhone ? ` · ${v.picPhone}` : ""}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {v.categories.map((c) => (
                          <Badge key={c} variant="outline" className={`text-[10px] ${CategoryBadgeStyles[c]}`}>
                            {SarprasCategoryLabels[c]}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{coverageLabel(v)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-[10px]">
                        {v._count?.items ?? 0} item
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {v.rating ? (
                        <span className="inline-flex items-center gap-1 text-sm tabular-nums">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {v.rating}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-[10px]">
                        {v.isActive ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon" variant="ghost" className="h-8 w-8"
                          title="Barang & Harga"
                          onClick={() => setItemsTarget(v)}
                        >
                          <Package className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(v)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon" variant="ghost"
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setDeleteTarget(v)}
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
      <p className="text-xs text-muted-foreground">{vendors.length} vendor</p>

      {/* Dialog Tambah/Edit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">{editing ? "Edit Vendor" : "Tambah Vendor"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Nama Vendor <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="cth: CV Sumber IT Medan"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Kategori <span className="text-destructive">*</span></Label>
                <div className="flex gap-3 h-9 items-center">
                  {(Object.entries(SarprasCategoryLabels) as [SarprasCategory, string][]).map(([cat, label]) => (
                    <label key={cat} className="flex items-center gap-1.5 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={form.categories.includes(cat)}
                        onChange={() => toggleCategory(cat)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Provinsi Domisili</Label>
                <SearchableSelect
                  options={provinceOptions}
                  value={form.provinceId || null}
                  onValueChange={(v) => setForm((f) => ({ ...f, provinceId: v }))}
                  placeholder="Pilih provinsi..."
                  searchPlaceholder="Cari provinsi..."
                />
              </div>
              <div className="space-y-1.5">
                <Label>NPWP</Label>
                <Input value={form.npwp} onChange={(e) => setForm((f) => ({ ...f, npwp: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>NIB</Label>
                <Input value={form.nib} onChange={(e) => setForm((f) => ({ ...f, nib: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>KBLI</Label>
                <Input placeholder="cth: 82302" value={form.kbli} onChange={(e) => setForm((f) => ({ ...f, kbli: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Rating (1–5)</Label>
                <Input
                  type="number" min={1} max={5}
                  value={form.rating}
                  onChange={(e) => setForm((f) => ({ ...f, rating: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Alamat</Label>
                <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Nama PIC</Label>
                <Input value={form.picName} onChange={(e) => setForm((f) => ({ ...f, picName: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Telepon PIC</Label>
                <Input value={form.picPhone} onChange={(e) => setForm((f) => ({ ...f, picPhone: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <label className="flex items-center gap-2 h-9 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  />
                  Aktif
                </label>
              </div>
            </div>

            {/* Cakupan wilayah */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>
                  Cakupan Wilayah <span className="text-destructive">*</span>{" "}
                  <span className="font-normal text-muted-foreground">
                    ({form.coverageProvinceIds.length}/{totalProvinces} provinsi)
                  </span>
                </Label>
                <div className="flex gap-2">
                  <Button
                    type="button" size="sm" variant="outline" className="h-7 text-xs"
                    onClick={() => setForm((f) => ({ ...f, coverageProvinceIds: provinces.map((p) => p.id) }))}
                  >
                    Pilih Semua Provinsi
                  </Button>
                  <Button
                    type="button" size="sm" variant="outline" className="h-7 text-xs"
                    onClick={() => setForm((f) => ({ ...f, coverageProvinceIds: [] }))}
                  >
                    Kosongkan
                  </Button>
                </div>
              </div>
              <div className="border rounded-md p-3 max-h-48 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1.5">
                {provinces.map((p) => (
                  <label key={p.id} className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5"
                      checked={form.coverageProvinceIds.includes(p.id)}
                      onChange={() => toggleCoverage(p.id)}
                    />
                    <span className="truncate">{p.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Catatan</Label>
              <Textarea
                rows={2}
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

      {/* Dialog Barang & Harga */}
      {itemsTarget && (
        <VendorItemsDialog vendor={itemsTarget} onClose={() => setItemsTarget(null)} />
      )}

      {/* Dialog Hapus */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Hapus Vendor</DialogTitle>
            <DialogDescription className="text-sm">
              Hapus vendor <span className="font-semibold">{deleteTarget?.name}</span> beserta seluruh
              cakupan wilayahnya? Riwayat harga vendor pada proyek lelang (fase berikutnya) sebaiknya
              dipertahankan — pertimbangkan menonaktifkan vendor daripada menghapus.
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

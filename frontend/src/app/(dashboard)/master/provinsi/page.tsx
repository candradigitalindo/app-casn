"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Database, Plus, Pencil, Trash2, Search, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  useProvinces, useCreateProvince, useUpdateProvince, useDeleteProvince, usePermissions,
} from "@/lib/hooks";
import type { Province } from "@/lib/api/master-data";

export default function ProvinsiPage() {
  const { isSuperAdmin } = usePermissions();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Province | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Province | null>(null);
  const [form, setForm] = useState({ code: "", name: "" });

  const { data, isLoading } = useProvinces(search || undefined);
  const create = useCreateProvince();
  const update = useUpdateProvince();
  const remove = useDeleteProvince();

  const provinces: Province[] = data?.data ?? [];

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
    setForm({ code: "", name: "" });
    setDialogOpen(true);
  }

  function openEdit(p: Province) {
    setEditing(p);
    setForm({ code: p.code, name: p.name });
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!form.code.trim() || !form.name.trim()) return;
    const payload = { code: form.code.trim(), name: form.name.trim() };
    if (editing) {
      update.mutate({ id: editing.id, data: payload }, {
        onSuccess: () => { toast.success("Provinsi diperbarui"); setDialogOpen(false); },
      });
    } else {
      create.mutate(payload, {
        onSuccess: () => { toast.success("Provinsi ditambahkan"); setDialogOpen(false); },
      });
    }
  }

  function handleDelete() {
    if (!deleteTarget) return;
    remove.mutate(deleteTarget.id, {
      onSuccess: () => { toast.success("Provinsi dihapus"); setDeleteTarget(null); },
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
            <h1 className="text-2xl font-bold tracking-tight">Master Data — Provinsi</h1>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Daftar provinsi seluruh Indonesia (kode Kemendagri)
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Tambah Provinsi
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari nama atau kode provinsi..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : provinces.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Tidak ada provinsi ditemukan.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Kode</TableHead>
                  <TableHead>Nama Provinsi</TableHead>
                  <TableHead className="w-40 text-center">Kabupaten / Kota</TableHead>
                  <TableHead className="w-28 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {provinces.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-sm">{p.code}</TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-xs">{p._count?.regencies ?? 0}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">{provinces.length} provinsi</p>

      {/* Dialog Tambah/Edit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">{editing ? "Edit Provinsi" : "Tambah Provinsi"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Kode <span className="text-destructive">*</span></Label>
              <Input
                placeholder="cth: 11"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nama Provinsi <span className="text-destructive">*</span></Label>
              <Input
                placeholder="cth: Aceh"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button size="sm" disabled={!form.code.trim() || !form.name.trim() || isPending} onClick={handleSubmit}>
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
            <DialogTitle className="text-base">Hapus Provinsi</DialogTitle>
            <DialogDescription className="text-sm">
              Hapus provinsi <span className="font-semibold">{deleteTarget?.name}</span>?
              Seluruh <span className="font-semibold">{deleteTarget?._count?.regencies ?? 0} kabupaten/kota</span> di
              dalamnya akan ikut terhapus. Tindakan ini tidak dapat dibatalkan.
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

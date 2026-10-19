"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { HardHat, Plus, Pencil, Trash2, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  usePersonnelRequirements, useCreatePersonnelRequirement,
  useUpdatePersonnelRequirement, useDeletePersonnelRequirement, usePermissions,
} from "@/lib/hooks";
import type { PersonnelRequirement, PersonnelRequirementPayload } from "@/lib/api/master-data";

const EMPTY_FORM = { capacity: "", koordinator: "1", tenagaIt: "1", elektrikal: "1", sarpras: "1" };

const FIELDS = [
  { key: "koordinator", label: "Koordinator" },
  { key: "tenagaIt", label: "Tenaga IT" },
  { key: "elektrikal", label: "Elektrikal" },
  { key: "sarpras", label: "Tenaga Sarpras" },
] as const;

export default function MasterTenagaTeknisPage() {
  const { isSuperAdmin } = usePermissions();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PersonnelRequirement | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PersonnelRequirement | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const { data, isLoading } = usePersonnelRequirements();
  const create = useCreatePersonnelRequirement();
  const update = useUpdatePersonnelRequirement();
  const remove = useDeletePersonnelRequirement();

  const rows: PersonnelRequirement[] = data?.data ?? [];

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
    setForm({ ...EMPTY_FORM });
    setDialogOpen(true);
  }

  function openEdit(r: PersonnelRequirement) {
    setEditing(r);
    setForm({
      capacity: String(r.capacity),
      koordinator: String(r.koordinator),
      tenagaIt: String(r.tenagaIt),
      elektrikal: String(r.elektrikal),
      sarpras: String(r.sarpras),
    });
    setDialogOpen(true);
  }

  const formValid =
    Number(form.capacity) >= 1 &&
    FIELDS.every(({ key }) => Number(form[key]) >= 0);

  function handleSubmit() {
    if (!formValid) return;
    const payload: PersonnelRequirementPayload = {
      capacity: Number(form.capacity),
      koordinator: Number(form.koordinator),
      tenagaIt: Number(form.tenagaIt),
      elektrikal: Number(form.elektrikal),
      sarpras: Number(form.sarpras),
    };
    if (editing) {
      update.mutate({ id: editing.id, data: payload }, {
        onSuccess: () => { toast.success("Kebutuhan tenaga teknis diperbarui"); setDialogOpen(false); },
      });
    } else {
      create.mutate(payload, {
        onSuccess: () => { toast.success("Tier kebutuhan ditambahkan"); setDialogOpen(false); },
      });
    }
  }

  function handleDelete() {
    if (!deleteTarget) return;
    remove.mutate(deleteTarget.id, {
      onSuccess: () => { toast.success("Tier kebutuhan dihapus"); setDeleteTarget(null); },
    });
  }

  const isPending = create.isPending || update.isPending;

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <HardHat className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Master Data — Kebutuhan Tenaga Teknis</h1>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Kebutuhan tenaga teknis per tier jumlah peserta per sesi (huruf D.4.e Kepsesma BKN No 240 Tahun 2026).
            Menjadi acuan indikator kecukupan SDM pada halaman Tenaga Teknis.
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Tambah Tier
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Belum ada tier kebutuhan.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-40">Peserta per Sesi</TableHead>
                  {FIELDS.map(({ key, label }) => (
                    <TableHead key={key} className="w-28 text-center">{label}</TableHead>
                  ))}
                  <TableHead className="w-24 text-center">Total</TableHead>
                  <TableHead className="w-24 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-semibold tabular-nums">{r.capacity} orang</TableCell>
                    {FIELDS.map(({ key }) => (
                      <TableCell key={key} className="text-center tabular-nums">{r[key]}</TableCell>
                    ))}
                    <TableCell className="text-center font-semibold tabular-nums">
                      {r.koordinator + r.tenagaIt + r.elektrikal + r.sarpras}
                    </TableCell>
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
      <p className="text-xs text-muted-foreground">
        {rows.length} tier · Pengawas lapangan berasal dari instansi penyelenggara (bukan kewajiban staffing penyedia)
      </p>

      {/* Dialog Tambah/Edit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              {editing ? "Edit Tier Kebutuhan" : "Tambah Tier Kebutuhan"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Jumlah Peserta per Sesi <span className="text-destructive">*</span></Label>
              <Input
                type="number" min={1} placeholder="cth: 100"
                value={form.capacity}
                onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {FIELDS.map(({ key, label }) => (
                <div key={key} className="space-y-1.5">
                  <Label>{label}</Label>
                  <Input
                    type="number" min={0}
                    value={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  />
                </div>
              ))}
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
            <DialogTitle className="text-base">Hapus Tier Kebutuhan</DialogTitle>
            <DialogDescription className="text-sm">
              Hapus tier <span className="font-semibold">{deleteTarget?.capacity} peserta per sesi</span>?
              Indikator kecukupan SDM untuk lokasi pada tier ini tidak akan tampil lagi.
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

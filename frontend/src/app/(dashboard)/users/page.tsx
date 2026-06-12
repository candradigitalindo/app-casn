"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, Search, Pencil, Trash2, UserCheck, UserX, Loader2, Users, ShieldCheck, MapPin,
} from "lucide-react";
import {
  useUsers, useCreateUser, useUpdateUser, useDeleteUser, useToggleUserActive, useLocations,
} from "@/lib/hooks";
import { CreateUserDto } from "@/lib/api/users";
import type { User } from "@/types/models";
import { UserRole, UserRoleLabels } from "@/types/enums";

const ROLE_COLORS: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]:          "bg-purple-100 text-purple-700",
  [UserRole.LOGISTICS]:            "bg-amber-100 text-amber-700",
  [UserRole.COORDINATOR]:          "bg-blue-100 text-blue-700",
  [UserRole.TECHNICAL_IT]:         "bg-cyan-100 text-cyan-700",
  [UserRole.TECHNICAL_ELECTRICAL]: "bg-orange-100 text-orange-700",
  [UserRole.TECHNICAL_SARPRAS]:    "bg-teal-100 text-teal-700",
  [UserRole.REGISTRAR]:            "bg-pink-100 text-pink-700",
  [UserRole.SUPERVISOR]:           "bg-indigo-100 text-indigo-700",
};

const EMPTY_FORM: CreateUserDto = {
  name: "", email: "", password: "", role: UserRole.COORDINATOR, phone: "", locationId: "", instansi: "",
};

// ── User Dialog (Tambah / Edit) ───────────────────────────────────────────────
function UserDialog({
  open, user, onOpenChange,
}: {
  open: boolean;
  user: User | null;
  onOpenChange: (v: boolean) => void;
}) {
  const isEdit = !!user;
  const [form, setForm] = useState<CreateUserDto>({ ...EMPTY_FORM });
  const [changePassword, setChangePassword] = useState(false);

  const create = useCreateUser();
  const update = useUpdateUser();
  const isPending = create.isPending || update.isPending;

  // Dialog selalu ter-mount, jadi prefill/reset harus bereaksi terhadap
  // prop `open` — onOpenChange internal tidak terpanggil saat dibuka dari luar.
  useEffect(() => {
    if (!open) return;
    if (user) {
      setForm({
        name: user.name, email: user.email, password: "", role: user.role,
        phone: user.phone ?? "", locationId: user.locationId ?? "", instansi: user.instansi ?? "",
      });
      setChangePassword(false);
    } else {
      setForm({ ...EMPTY_FORM });
    }
  }, [open, user]);

  function set<K extends keyof CreateUserDto>(key: K, val: CreateUserDto[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function handleSubmit() {
    if (!form.name || !form.email || !form.role) return;
    // String kosong → undefined: locationId "" akan melanggar FK di backend.
    const normalized = {
      ...form,
      phone: form.phone || undefined,
      locationId: form.locationId || undefined,
      instansi: form.instansi || undefined,
    };
    if (isEdit && user) {
      const payload: Parameters<typeof update.mutate>[0]["data"] = {
        name: normalized.name, email: normalized.email, role: normalized.role,
        phone: normalized.phone, locationId: normalized.locationId,
        instansi: normalized.instansi,
        ...(changePassword && form.password ? { password: form.password } : {}),
      };
      update.mutate({ id: user.id, data: payload }, { onSuccess: () => onOpenChange(false) });
    } else {
      if (!form.password) return;
      create.mutate(normalized, { onSuccess: () => onOpenChange(false) });
    }
  }

  const needsPassword = !isEdit || changePassword;

  const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
    [UserRole.SUPER_ADMIN]: "Akses penuh ke seluruh fitur dan manajemen pengguna.",
    [UserRole.LOGISTICS]: "Mengelola pengiriman logistik dan inventaris.",
    [UserRole.COORDINATOR]: "Koordinator titik lokasi, akses monitoring penuh.",
    [UserRole.TECHNICAL_IT]: "Tenaga teknis IT, akses instalasi dan insiden.",
    [UserRole.TECHNICAL_ELECTRICAL]: "Tenaga teknis elektrikal, akses instalasi.",
    [UserRole.TECHNICAL_SARPRAS]: "Tenaga teknis sarana prasarana, akses instalasi.",
    [UserRole.REGISTRAR]: "Petugas registrasi peserta di titik lokasi.",
    [UserRole.SUPERVISOR]: "Pengawas pelaksanaan, akses laporan dan monitoring.",
  };

  // Daftar lokasi untuk dropdown penugasan (admin tidak ter-scope)
  const { data: locResponse } = useLocations({});
  const locationOptions = locResponse?.data ?? [];
  const NO_LOCATION = "__none__";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b shrink-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-primary" />
              {isEdit ? "Edit Pengguna" : "Tambah Pengguna"}
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isEdit ? "Perbarui data dan hak akses pengguna." : "Buat akun, tentukan role dan penugasan lokasinya."}
            </p>
          </DialogHeader>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* ── Informasi Akun ── */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Informasi Akun</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nama Lengkap <span className="text-destructive">*</span></Label>
                <Input placeholder="Contoh: Ahmad Fauzi" value={form.name} onChange={(e) => set("name", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Email <span className="text-destructive">*</span></Label>
                <Input type="email" placeholder="nama@nbp.co.id" value={form.email} onChange={(e) => set("email", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Nomor Telepon</Label>
                <Input placeholder="08xx-xxxx-xxxx" value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} />
              </div>
              {needsPassword ? (
                <div className="space-y-1.5">
                  <Label>Password {!isEdit && <span className="text-destructive">*</span>}</Label>
                  <Input type="password" placeholder="Minimal 8 karakter" value={form.password} onChange={(e) => set("password", e.target.value)} />
                </div>
              ) : <div />}
            </div>
            {isEdit && (
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none w-fit">
                <input
                  type="checkbox"
                  checked={changePassword}
                  onChange={(e) => setChangePassword(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-gray-300"
                />
                Ganti password
              </label>
            )}
          </div>

          {/* ── Hak Akses & Penugasan ── */}
          <div className="space-y-3 pt-4 border-t">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Hak Akses &amp; Penugasan</p>
            <div className="space-y-1.5">
              <Label>Role <span className="text-destructive">*</span></Label>
              <Select value={form.role} onValueChange={(v) => set("role", v as UserRole)}>
                <SelectTrigger className="w-full">
                  <SelectValue>{UserRoleLabels[form.role]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.values(UserRole).map((r) => (
                    <SelectItem key={r} value={r}>{UserRoleLabels[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">{ROLE_DESCRIPTIONS[form.role]}</p>
            </div>

            {form.role === UserRole.SUPERVISOR ? (
              <div className="space-y-1.5">
                <Label>Instansi <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="Contoh: Badan Kepegawaian Negara"
                  value={form.instansi ?? ""}
                  onChange={(e) => set("instansi", e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">Nama instansi asal pengawas.</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>Titik Lokasi <span className="text-muted-foreground font-normal">(opsional)</span></Label>
                <Select
                  value={form.locationId || NO_LOCATION}
                  onValueChange={(v) => set("locationId", v === NO_LOCATION ? "" : (v ?? ""))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {form.locationId ? (
                        <span className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          {locationOptions.find((l) => l.id === form.locationId)?.name ?? form.locationId}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Tanpa lokasi — akses seluruh data</span>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_LOCATION}>
                      <span className="text-muted-foreground">Tanpa lokasi — akses seluruh data</span>
                    </SelectItem>
                    {locationOptions.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        <span className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          {l.name}
                          <span className="text-[10px] font-mono text-muted-foreground">{l.code}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Pengguna yang terikat ke satu titik lokasi hanya dapat melihat data lokasi tersebut.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-muted/20 border-t flex justify-end gap-2 shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !form.name || !form.email || !form.role ||
              (needsPassword && !form.password) ||
              (form.role === UserRole.SUPERVISOR && !form.instansi) ||
              isPending
            }
          >
            {isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            {isEdit ? "Simpan Perubahan" : "Buat Pengguna"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Delete Confirm Dialog ─────────────────────────────────────────────────────
function DeleteDialog({ user, onClose }: { user: User | null; onClose: () => void }) {
  const deleteMutation = useDeleteUser();
  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Hapus Pengguna</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">
          Akun <strong>{user?.name}</strong> ({user?.email}) akan dihapus secara permanen.
        </p>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button
            variant="destructive"
            onClick={() => user && deleteMutation.mutate(user.id, { onSuccess: onClose })}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            Hapus
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function UsersPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const { data, isLoading } = useUsers();
  const toggleActive = useToggleUserActive();

  const allUsers: User[] = data?.data ?? [];

  const filtered = useMemo(() => {
    let list = allUsers;
    if (roleFilter !== "ALL") list = list.filter((u) => u.role === roleFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    return list;
  }, [allUsers, roleFilter, search]);

  function openCreate() { setEditUser(null); setDialogOpen(true); }
  function openEdit(u: User) { setEditUser(u); setDialogOpen(true); }

  const totalByRole = useMemo(() => {
    const map: Partial<Record<UserRole, number>> = {};
    allUsers.forEach((u) => { map[u.role] = (map[u.role] ?? 0) + 1; });
    return map;
  }, [allUsers]);

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pengguna</h1>
          <p className="text-muted-foreground text-sm mt-1">Kelola akun dan hak akses pengguna sistem</p>
        </div>
        <Button onClick={openCreate} className="h-9 px-4 text-xs font-bold gap-1.5 shadow-md shrink-0">
          <Plus className="h-4 w-4" /> Tambah Pengguna
        </Button>
      </div>

      {/* Role summary chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setRoleFilter("ALL")}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors font-medium ${roleFilter === "ALL" ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted border-border"}`}
        >
          <Users className="h-3 w-3" />
          Semua ({allUsers.length})
        </button>
        {Object.values(UserRole).map((r) => {
          const count = totalByRole[r] ?? 0;
          if (count === 0) return null;
          return (
            <button
              key={r}
              onClick={() => setRoleFilter(roleFilter === r ? "ALL" : r)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors font-medium ${roleFilter === r ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted border-border"}`}
            >
              {UserRoleLabels[r]} ({count})
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cari nama atau email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* User list */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Users className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground">Tidak ada pengguna ditemukan</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((u) => (
            <Card key={u.id} className={`transition-shadow hover:shadow-md ${!u.isActive ? "opacity-60" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  {/* Avatar */}
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold text-sm">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-semibold leading-tight truncate">{u.name}</p>
                      {!u.isActive && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">Nonaktif</Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">{u.email}</p>
                    {u.instansi && <p className="text-[11px] text-muted-foreground truncate">{u.instansi}</p>}
                    {u.phone && <p className="text-[11px] text-muted-foreground">{u.phone}</p>}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <Badge className={`text-[10px] px-2 py-0.5 border-0 ${ROLE_COLORS[u.role]}`}>
                    {UserRoleLabels[u.role]}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      title={u.isActive ? "Nonaktifkan" : "Aktifkan"}
                      onClick={() => toggleActive.mutate(u.id)}
                    >
                      {u.isActive
                        ? <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                        : <UserX className="h-3.5 w-3.5 text-muted-foreground" />}
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(u)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteTarget(u)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <UserDialog
        open={dialogOpen}
        user={editUser}
        onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditUser(null); }}
      />
      <DeleteDialog user={deleteTarget} onClose={() => setDeleteTarget(null)} />
    </div>
  );
}

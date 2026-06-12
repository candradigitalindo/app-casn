"use client";

import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Wrench, CheckCircle2, Loader2, Search,
  ChevronDown, ChevronUp, Users, Circle, Pencil,
} from "lucide-react";
import { useAllLocationItems, useLocations, useUpdateLocationItem, usePermissions } from "@/lib/hooks";
import type { Location, LocationItem } from "@/types/models";

type LocStatus = 'belum' | 'berjalan' | 'selesai';

function getLocStatus(pct: number, hasItems: boolean): LocStatus {
  if (!hasItems || pct === 0) return 'belum';
  if (pct >= 100) return 'selesai';
  return 'berjalan';
}

const LOC_STATUS_STYLE: Record<LocStatus, { badge: string; icon: React.ReactNode; iconBg: string; label: string }> = {
  belum: {
    badge: 'text-gray-500 bg-gray-50 border-gray-200',
    icon: <Circle className="h-4 w-4 text-gray-400" />,
    iconBg: 'bg-gray-100',
    label: 'Belum Mulai',
  },
  berjalan: {
    badge: 'text-blue-700 bg-blue-50 border-blue-300',
    icon: <Wrench className="h-4 w-4 text-blue-500" />,
    iconBg: 'bg-blue-100',
    label: 'Sedang Berjalan',
  },
  selesai: {
    badge: 'text-emerald-700 bg-emerald-50 border-emerald-300',
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
    iconBg: 'bg-emerald-100',
    label: 'Selesai',
  },
};

function calcOverall(items: LocationItem[]): number {
  if (items.length === 0) return 0;
  return Math.round(items.reduce((s, i) => s + i.installationPct, 0) / items.length);
}

// ─────────────────────────────────────────────────────────────
// Dialog Update Persentase Item
// ─────────────────────────────────────────────────────────────
function UpdateItemDialog({
  item, locationId, open, onOpenChange,
}: {
  item: LocationItem | null;
  locationId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const update = useUpdateLocationItem(locationId);
  const [pct, setPct] = useState(item?.installationPct ?? 0);
  const [notes, setNotes] = useState(item?.notes ?? "");

  // Sinkronkan isian dengan item yang dipilih setiap dialog dibuka
  // (dialog selalu ter-mount, onOpenChange internal tidak terpanggil saat dibuka dari luar)
  useEffect(() => {
    if (open && item) { setPct(item.installationPct); setNotes(item.notes ?? ""); }
  }, [open, item]);

  if (!item) return null;

  function handleSubmit() {
    update.mutate(
      { itemId: item!.id, data: { installationPct: pct, notes: notes || undefined } },
      { onSuccess: () => onOpenChange(false) }
    );
  }

  const QUICK = [0, 25, 50, 75, 100];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm leading-snug">{item.name}</DialogTitle>
          <DialogDescription className="text-xs">
            {item.qty} {item.unit} · Update persentase instalasi
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {/* Slider + angka */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Persentase Instalasi
              </Label>
              <span className={`text-2xl font-bold tabular-nums ${pct === 100 ? 'text-emerald-600' : pct > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                {pct}%
              </span>
            </div>
            <input
              type="range" min={0} max={100} step={5}
              value={pct}
              onChange={(e) => setPct(Number(e.target.value))}
              className="w-full accent-primary h-2 rounded-full"
            />
            <Progress
              value={pct}
              className={`h-2 ${pct === 100 ? '[&>div]:bg-emerald-500' : pct > 0 ? '[&>div]:bg-blue-500' : ''}`}
            />
            {/* Quick select */}
            <div className="flex gap-2">
              {QUICK.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setPct(q)}
                  className={`flex-1 text-xs py-1.5 rounded-md border font-medium transition-colors ${
                    pct === q
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'hover:bg-muted'
                  }`}
                >{q}%</button>
              ))}
            </div>
          </div>

          {/* Catatan */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Catatan (opsional)
            </Label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="cth: Sudah terpasang, menunggu kalibrasi"
              className="w-full text-sm rounded-md border px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button disabled={update.isPending} onClick={handleSubmit}>
            {update.isPending && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────
// Kartu per lokasi
// ─────────────────────────────────────────────────────────────
function LocationInstallCard({
  location, items, canWrite,
}: {
  location: Location;
  items: LocationItem[];
  canWrite: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editItem, setEditItem] = useState<LocationItem | null>(null);

  const overall = calcOverall(items);
  const locStatus = getLocStatus(overall, items.length > 0);
  const style = LOC_STATUS_STYLE[locStatus];

  const doneCount = items.filter((i) => i.installationPct === 100).length;
  const inProgressCount = items.filter((i) => i.installationPct > 0 && i.installationPct < 100).length;

  return (
    <>
      <Card className="overflow-hidden transition-shadow hover:shadow-md">
        <CardHeader className="pb-0 pt-4 px-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className={`mt-0.5 h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${style.iconBg}`}>
                {style.icon}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm leading-snug">{location.name}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-xs font-mono text-muted-foreground">{location.code}</span>
                  <span className="text-xs text-muted-foreground">{location.city}, {location.province}</span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />{location.capacity} peserta/sesi
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline" className={`text-xs ${style.badge}`}>{style.label}</Badge>
              <span className="text-sm font-bold tabular-nums w-10 text-right">{overall}%</span>
              {items.length > 0 && (
                <button
                  onClick={() => setExpanded((v) => !v)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-5 pt-3 pb-4 space-y-3">
          <Progress
            value={overall}
            className={`h-2 ${locStatus === 'selesai' ? '[&>div]:bg-emerald-500' : locStatus === 'berjalan' ? '[&>div]:bg-blue-500' : ''}`}
          />

          {items.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Belum ada item terdaftar di lokasi ini.</p>
          ) : (
            <>
              {/* Ringkasan singkat */}
              {!expanded && (
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    {doneCount} selesai
                  </span>
                  {inProgressCount > 0 && (
                    <span className="flex items-center gap-1">
                      <Wrench className="h-3 w-3 text-blue-500" />
                      {inProgressCount} berjalan
                    </span>
                  )}
                  <span>{items.length - doneCount - inProgressCount} belum mulai</span>
                  <button
                    onClick={() => setExpanded(true)}
                    className="ml-auto text-primary hover:underline text-xs"
                  >
                    Lihat semua item →
                  </button>
                </div>
              )}

              {/* Daftar lengkap item */}
              {expanded && (
                <div className="space-y-1.5 pt-1 border-t">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground pb-0.5">
                    {items.length} Item — {doneCount} selesai · {inProgressCount} berjalan
                  </p>
                  {items.map((item) => {
                    const pct = item.installationPct;
                    const done = pct === 100;
                    const started = pct > 0;
                    return (
                      <div
                        key={item.id}
                        className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-xs ${
                          done
                            ? 'border-emerald-200 bg-emerald-50/60'
                            : started
                            ? 'border-blue-200 bg-blue-50/60'
                            : 'border-gray-100 bg-gray-50/60'
                        }`}
                      >
                        {/* Status icon */}
                        <div className="shrink-0">
                          {done
                            ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                            : started
                            ? <Wrench className="h-3.5 w-3.5 text-blue-500" />
                            : <Circle className="h-3.5 w-3.5 text-gray-300" />}
                        </div>

                        {/* Nama + qty */}
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium truncate leading-snug ${done ? 'text-emerald-800' : started ? 'text-blue-800' : 'text-gray-500'}`}>
                            {item.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-muted-foreground">{item.qty} {item.unit}</span>
                            {item.notes && (
                              <span className="text-muted-foreground/70 truncate max-w-45">· {item.notes}</span>
                            )}
                          </div>
                        </div>

                        {/* Progress mini bar + angka */}
                        <div className="flex items-center gap-2 shrink-0 w-32">
                          <Progress
                            value={pct}
                            className={`h-1.5 flex-1 ${done ? '[&>div]:bg-emerald-500' : started ? '[&>div]:bg-blue-500' : ''}`}
                          />
                          <span className={`tabular-nums font-semibold w-8 text-right ${done ? 'text-emerald-700' : started ? 'text-blue-700' : 'text-gray-300'}`}>
                            {pct}%
                          </span>
                        </div>

                        {/* Edit */}
                        {canWrite && (
                          <button
                            onClick={() => setEditItem(item)}
                            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <UpdateItemDialog
        item={editItem}
        locationId={location.id}
        open={!!editItem}
        onOpenChange={(v) => !v && setEditItem(null)}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Halaman utama
// ─────────────────────────────────────────────────────────────
export default function InstallationsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LocStatus | "ALL">("ALL");
  const { canWrite } = usePermissions();

  const { data: itemsResponse, isLoading: itemsLoading } = useAllLocationItems();
  const { data: locResponse, isLoading: locLoading } = useLocations({});

  const allItems: LocationItem[] = itemsResponse?.data ?? [];
  const allLocations: Location[] = locResponse?.data ?? [];

  const locationData = useMemo(() => {
    return allLocations.map((loc) => {
      const items = allItems.filter((i) => i.locationId === loc.id);
      const overall = calcOverall(items);
      const status = getLocStatus(overall, items.length > 0);
      return { loc, items, overall, status };
    });
  }, [allLocations, allItems]);

  const filtered = useMemo(() => {
    return locationData.filter((d) => {
      const matchStatus = statusFilter === "ALL" || d.status === statusFilter;
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        d.loc.name.toLowerCase().includes(q) ||
        d.loc.code.toLowerCase().includes(q) ||
        d.loc.city.toLowerCase().includes(q) ||
        d.loc.province.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [locationData, statusFilter, search]);

  const summary = useMemo(() => {
    const counts: Record<LocStatus, number> = { belum: 0, berjalan: 0, selesai: 0 };
    locationData.forEach((d) => { counts[d.status]++; });
    const avgOverall = locationData.length
      ? Math.round(locationData.reduce((s, d) => s + d.overall, 0) / locationData.length)
      : 0;
    return { ...counts, avgOverall };
  }, [locationData]);

  const isLoading = itemsLoading || locLoading;

  const summaryCards: { key: LocStatus | 'avg'; label: string; value: string | number; icon: React.ReactNode }[] = [
    { key: 'belum',   label: 'Belum Mulai',     value: summary.belum,              icon: <Circle className="h-5 w-5 text-gray-400" /> },
    { key: 'berjalan',label: 'Sedang Berjalan',  value: summary.berjalan,           icon: <Wrench className="h-5 w-5 text-blue-500" /> },
    { key: 'selesai', label: 'Selesai',           value: summary.selesai,            icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" /> },
    { key: 'avg',     label: 'Rata-rata Progress',value: `${summary.avgOverall}%`,  icon: <Wrench className="h-5 w-5 text-violet-500" /> },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Instalasi</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Progress instalasi item per titik lokasi — klik ikon edit untuk update persentase
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {summaryCards.map(({ key, label, value, icon }) => (
          <button
            key={key}
            onClick={() => {
              if (key === 'avg') return;
              setStatusFilter(statusFilter === key ? "ALL" : (key as LocStatus));
            }}
            className={key === 'avg' ? 'cursor-default text-left' : 'text-left'}
          >
            <Card className={`transition-all hover:shadow-md ${statusFilter === key ? 'ring-2 ring-primary' : ''}`}>
              <CardContent className="p-4 flex items-center gap-3">
                {icon}
                <div>
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight">{label}</p>
                </div>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama lokasi, kode, kota, atau provinsi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {(search || statusFilter !== "ALL") && (
          <Button variant="outline" onClick={() => { setSearch(""); setStatusFilter("ALL"); }}>
            Reset
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(({ loc, items }) => (
            <LocationInstallCard key={loc.id} location={loc} items={items} canWrite={canWrite} />
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-16">
              <Wrench className="h-12 w-12 text-muted-foreground/40 mx-auto" />
              <p className="text-muted-foreground mt-3">Tidak ada lokasi sesuai filter</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

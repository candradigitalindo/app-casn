"use client";

import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Search, Truck, Package, MapPin, CheckCircle2, Loader2,
  ChevronDown, ChevronUp, Clock, Users, Box, Plus, Pencil,
  Trash2, ArrowRight,
} from "lucide-react";
import { ShipmentStatus, ShipmentStatusLabels } from "@/types/enums";
import {
  useShipments, useLocations, useCreateShipment, useUpdateShipment,
  useDeleteShipment, useInventoryItems, usePermissions,
} from "@/lib/hooks";
import type { LogisticsShipment, Location, InventoryItem } from "@/types/models";


const STATUS_PRIORITY: Record<ShipmentStatus, number> = {
  [ShipmentStatus.PACKING]: 0,
  [ShipmentStatus.IN_TRANSIT]: 1,
  [ShipmentStatus.ARRIVED]: 2,
  [ShipmentStatus.RECEIVED]: 3,
  [ShipmentStatus.RETURNED]: 4,
};

const NEXT_STATUS: Partial<Record<ShipmentStatus, ShipmentStatus>> = {
  [ShipmentStatus.PACKING]: ShipmentStatus.IN_TRANSIT,
  [ShipmentStatus.IN_TRANSIT]: ShipmentStatus.ARRIVED,
  [ShipmentStatus.ARRIVED]: ShipmentStatus.RECEIVED,
};

const NEXT_STATUS_LABEL: Partial<Record<ShipmentStatus, string>> = {
  [ShipmentStatus.PACKING]: 'Kirim Sekarang',
  [ShipmentStatus.IN_TRANSIT]: 'Konfirmasi Tiba',
  [ShipmentStatus.ARRIVED]: 'Konfirmasi Diterima',
};

type StatusStyleKey = ShipmentStatus | 'NONE';
const STATUS_STYLES: Record<StatusStyleKey, { badge: string; icon: React.ReactNode; label: string }> = {
  NONE: {
    badge: 'text-gray-500 bg-gray-50 border-gray-200',
    icon: <Package className="h-4 w-4 text-gray-400" />,
    label: 'Belum Ada Pengiriman',
  },
  [ShipmentStatus.PACKING]: {
    badge: 'text-slate-700 bg-slate-50 border-slate-300',
    icon: <Box className="h-4 w-4 text-slate-500" />,
    label: ShipmentStatusLabels[ShipmentStatus.PACKING],
  },
  [ShipmentStatus.IN_TRANSIT]: {
    badge: 'text-blue-700 bg-blue-50 border-blue-300',
    icon: <Truck className="h-4 w-4 text-blue-500" />,
    label: ShipmentStatusLabels[ShipmentStatus.IN_TRANSIT],
  },
  [ShipmentStatus.ARRIVED]: {
    badge: 'text-amber-700 bg-amber-50 border-amber-300',
    icon: <MapPin className="h-4 w-4 text-amber-500" />,
    label: ShipmentStatusLabels[ShipmentStatus.ARRIVED],
  },
  [ShipmentStatus.RECEIVED]: {
    badge: 'text-emerald-700 bg-emerald-50 border-emerald-300',
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
    label: ShipmentStatusLabels[ShipmentStatus.RECEIVED],
  },
  [ShipmentStatus.RETURNED]: {
    badge: 'text-purple-700 bg-purple-50 border-purple-300',
    icon: <Package className="h-4 w-4 text-purple-500" />,
    label: ShipmentStatusLabels[ShipmentStatus.RETURNED],
  },
};

function getLocationStatus(shipments: LogisticsShipment[]): StatusStyleKey {
  if (shipments.length === 0) return 'NONE';
  return [...shipments].sort(
    (a, b) => STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status]
  )[0].status;
}

function calcProgress(shipments: LogisticsShipment[]) {
  const total = shipments.reduce(
    (s, shp) => s + shp.manifestItems.reduce((ss, m) => ss + m.qty, 0), 0
  );
  const received = shipments
    .filter((s) => s.status === ShipmentStatus.RECEIVED)
    .reduce((s, shp) => s + shp.manifestItems.reduce((ss, m) => ss + m.qty, 0), 0);
  return { total, received, pct: total > 0 ? Math.round((received / total) * 100) : 0 };
}

function aggregateItems(shipments: LogisticsShipment[], itemNames: Record<string, string>) {
  const map: Record<string, { name: string; qty: number; status: ShipmentStatus }[]> = {};
  shipments.forEach((shp) => {
    shp.manifestItems.forEach((m) => {
      if (!map[m.itemId]) map[m.itemId] = [];
      map[m.itemId].push({ name: itemNames[m.itemId] ?? m.itemId, qty: m.qty, status: shp.status });
    });
  });
  return Object.entries(map).map(([itemId, entries]) => {
    const totalQty = entries.reduce((s, e) => s + e.qty, 0);
    const worstStatus = entries.sort(
      (a, b) => STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status]
    )[0].status;
    return { itemId, name: entries[0].name, totalQty, status: worstStatus };
  });
}

// ─────────────────────────────────────────────────────────────
// Warna kategori barang
// ─────────────────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  LAPTOP_CLIENT:   { bg: 'bg-blue-50',    text: 'text-blue-700',   dot: 'bg-blue-500' },
  SERVER:          { bg: 'bg-violet-50',  text: 'text-violet-700', dot: 'bg-violet-500' },
  UPS:             { bg: 'bg-amber-50',   text: 'text-amber-700',  dot: 'bg-amber-500' },
  NETWORK:         { bg: 'bg-cyan-50',    text: 'text-cyan-700',   dot: 'bg-cyan-500' },
  METAL_DETECTOR:  { bg: 'bg-slate-50',   text: 'text-slate-700',  dot: 'bg-slate-500' },
  CCTV:            { bg: 'bg-indigo-50',  text: 'text-indigo-700', dot: 'bg-indigo-500' },
  AC:              { bg: 'bg-sky-50',     text: 'text-sky-700',    dot: 'bg-sky-500' },
  GENERATOR:       { bg: 'bg-orange-50',  text: 'text-orange-700', dot: 'bg-orange-500' },
};

// ─────────────────────────────────────────────────────────────
// Dialog Buat Pengiriman
// ─────────────────────────────────────────────────────────────
// Jumlah standar item sesuai tier kapasitas lokasi (100–500 peserta/sesi).
function expectedQty(item: InventoryItem, capacity?: number): number {
  const spec = item.specifications as Record<string, number> | undefined;
  if (!spec || !capacity) return item.standardQty;
  const tier = Math.min(Math.max(Math.ceil(capacity / 100), 1), 5) * 100;
  return spec[`qty${tier}`] ?? item.standardQty;
}

function CreateShipmentDialog({
  open, onOpenChange, locations, inventoryItems,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  locations: Location[];
  inventoryItems: InventoryItem[];
}) {
  const createShipment = useCreateShipment();

  const emptyQtys = () => Object.fromEntries(inventoryItems.map((i) => [i.id, 0]));

  const [destId, setDestId] = useState("");
  const [locSearch, setLocSearch] = useState("");
  const [locPickerOpen, setLocPickerOpen] = useState(false);
  const [qtys, setQtys] = useState<Record<string, number>>(emptyQtys);
  const [itemSearch, setItemSearch] = useState("");

  // Reset form setiap dialog dibuka (dialog selalu ter-mount dari parent).
  useEffect(() => {
    if (!open) return;
    setDestId(""); setLocSearch(""); setQtys(emptyQtys()); setItemSearch("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleSubmit() {
    const manifestItems = Object.entries(qtys)
      .filter(([, q]) => q > 0)
      .map(([itemId, qty]) => ({ itemId, qty }));
    createShipment.mutate(
      { originWarehouseId: 'wh-1', destinationLocationId: destId, manifestItems },
      { onSuccess: () => onOpenChange(false) }
    );
  }

  const filteredLocs = locations.filter((l) => {
    const q = locSearch.toLowerCase();
    return !q || l.name.toLowerCase().includes(q) || l.code.toLowerCase().includes(q) || l.city.toLowerCase().includes(q) || l.province.toLowerCase().includes(q);
  });

  const filteredItems = inventoryItems.filter((i) => {
    const q = itemSearch.toLowerCase();
    return !q || i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q);
  });

  const destLocation = locations.find((l) => l.id === destId);
  const selectedItems = inventoryItems.filter((i) => (qtys[i.id] ?? 0) > 0);
  const totalQty = Object.values(qtys).reduce((s, q) => s + q, 0);
  const valid = destId && totalQty > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl p-0 gap-0 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b shrink-0">
          <DialogTitle className="text-base">Buat Pengiriman Baru</DialogTitle>
          <DialogDescription className="mt-0.5 text-xs">
            Pilih titik lokasi tujuan, pilih barang, dan tentukan jumlahnya.
          </DialogDescription>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-4 space-y-5">

            {/* ── Titik Lokasi Tujuan ── */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Titik Lokasi Tujuan
              </Label>

              {/* Trigger / selected card */}
              {destLocation ? (
                <button
                  type="button"
                  onClick={() => { setLocPickerOpen(true); setLocSearch(""); }}
                  className="w-full text-left rounded-xl border-2 border-primary/30 bg-primary/5 px-4 py-3 hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <MapPin className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm leading-snug truncate">{destLocation.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{destLocation.city}, {destLocation.province}</p>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          <span className="text-[10px] font-mono bg-white border rounded px-1.5 py-0.5 text-muted-foreground">{destLocation.code}</span>
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Users className="h-2.5 w-2.5" />{destLocation.capacity} peserta/sesi
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className="shrink-0 text-[10px] text-primary font-medium mt-1">Ubah</span>
                  </div>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => { setLocPickerOpen(true); setLocSearch(""); }}
                  className="w-full flex items-center gap-3 rounded-xl border-2 border-dashed border-muted-foreground/25 px-4 py-3.5 text-left hover:border-muted-foreground/40 hover:bg-muted/30 transition-colors"
                >
                  <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Pilih lokasi tujuan</p>
                    <p className="text-[11px] text-muted-foreground/70 mt-0.5">Klik untuk memilih dari daftar</p>
                  </div>
                </button>
              )}

              {/* Picker dropdown */}
              {locPickerOpen && (
                <div className="rounded-xl border bg-white shadow-lg overflow-hidden">
                  <div className="px-3 py-2.5 border-b">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        autoFocus
                        value={locSearch}
                        onChange={(e) => setLocSearch(e.target.value)}
                        placeholder="Cari nama, kode, kota, provinsi..."
                        className="pl-8 h-8 text-sm border-0 bg-muted/40 focus-visible:ring-0"
                      />
                    </div>
                  </div>
                  <div className="max-h-52 overflow-y-auto divide-y">
                    {filteredLocs.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-4">Tidak ada lokasi ditemukan</p>
                    )}
                    {filteredLocs.map((l) => (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => {
                          // Ganti lokasi → reset isian, karena jumlah standar
                          // tiap barang mengikuti kapasitas lokasi.
                          if (l.id !== destId) setQtys(emptyQtys());
                          setDestId(l.id);
                          setLocPickerOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/40 transition-colors ${destId === l.id ? 'bg-primary/5' : ''}`}
                      >
                        <div className={`h-7 w-7 rounded-md flex items-center justify-center shrink-0 ${destId === l.id ? 'bg-primary/15' : 'bg-muted'}`}>
                          <MapPin className={`h-3.5 w-3.5 ${destId === l.id ? 'text-primary' : 'text-muted-foreground'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{l.name}</p>
                          <p className="text-[11px] text-muted-foreground">{l.city}, {l.province}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] font-mono text-muted-foreground">{l.code}</span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Users className="h-2.5 w-2.5" />{l.capacity}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="px-3 py-2 border-t bg-muted/20 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setLocPickerOpen(false)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >Tutup</button>
                  </div>
                </div>
              )}
            </div>

            {/* ── Pilih Barang ── */}
            {/* Daftar barang baru tampil setelah lokasi dipilih, karena jumlah
                standar tiap barang mengikuti tier kapasitas lokasi tujuan. */}
            {!destLocation ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/20 py-10 text-center">
                <Package className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Pilih lokasi tujuan terlebih dahulu</p>
                <p className="text-[11px] text-muted-foreground/70 max-w-xs">
                  Jumlah standar tiap barang berbeda mengikuti kapasitas peserta lokasi tujuan.
                </p>
              </div>
            ) : (
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Pilih Barang
                <span className="ml-2 normal-case font-normal tracking-normal text-muted-foreground/70">
                  standar tier {Math.min(Math.max(Math.ceil(destLocation.capacity / 100), 1), 5) * 100} peserta/sesi
                </span>
              </Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  placeholder="Cari nama atau kode barang..."
                  className="pl-8 h-8 text-sm"
                />
              </div>
              {/* Header kolom */}
              <div className="flex items-center gap-3 px-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                <span className="flex-1">Barang</span>
                <span className="w-20 text-center">Standar</span>
                <span className="w-20 text-center">Dikirim</span>
              </div>
              <div className="space-y-1.5 max-h-[45vh] overflow-y-auto pr-1">
                {filteredItems.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">Tidak ada barang ditemukan</p>
                )}
                {filteredItems.map((item) => {
                  const qty = qtys[item.id] ?? 0;
                  const colors = CATEGORY_COLORS[item.category] ?? CATEGORY_COLORS.NETWORK;
                  const selected = qty > 0;
                  const standar = expectedQty(item, destLocation?.capacity);
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors ${
                        selected ? 'border-primary/40 bg-primary/5' : 'bg-white hover:bg-muted/30'
                      }`}
                    >
                      <div className={`h-8 w-8 rounded-md flex items-center justify-center shrink-0 ${colors.bg}`}>
                        <span className={`h-2 w-2 rounded-full ${colors.dot}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-snug truncate" title={item.name}>{item.name}</p>
                        <p className={`text-[10px] font-mono ${colors.text}`}>{item.code}</p>
                      </div>
                      {/* Jumlah standar sesuai tier kapasitas lokasi — klik untuk isi */}
                      <button
                        type="button"
                        onClick={() => setQtys((q) => ({ ...q, [item.id]: standar }))}
                        title="Klik untuk mengisi jumlah sesuai standar"
                        className="w-20 shrink-0 text-center text-sm tabular-nums text-muted-foreground hover:text-primary transition-colors"
                      >
                        {standar.toLocaleString("id-ID")}
                      </button>
                      {/* Jumlah dikirim — bisa diketik */}
                      <Input
                        type="number"
                        min={0}
                        value={qty === 0 ? "" : qty}
                        placeholder="0"
                        onChange={(e) => {
                          const v = Math.max(0, parseInt(e.target.value, 10) || 0);
                          setQtys((q) => ({ ...q, [item.id]: v }));
                        }}
                        className={`w-20 h-8 shrink-0 text-center text-sm font-semibold tabular-nums ${
                          selected ? 'border-primary/50 text-primary' : ''
                        } ${qty > standar ? 'border-amber-400 text-amber-600' : ''}`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
            )}

          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 shrink-0 flex items-center justify-between gap-3 bg-muted/20">
          <p className="text-xs text-muted-foreground tabular-nums">
            {selectedItems.length > 0
              ? <><span className="font-semibold text-foreground">{selectedItems.length}</span> jenis barang · <span className="font-semibold text-foreground">{totalQty.toLocaleString("id-ID")}</span> unit</>
              : "Belum ada barang dipilih"}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="h-9">Batal</Button>
            <Button disabled={!valid || createShipment.isPending} onClick={handleSubmit} className="h-9">
              {createShipment.isPending && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              <Truck className="h-3.5 w-3.5 mr-1" />
              Buat Pengiriman
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────
// Dialog Update Status Pengiriman
// ─────────────────────────────────────────────────────────────
function AdvanceStatusDialog({
  shipment, open, onOpenChange, itemNames,
}: {
  shipment: LogisticsShipment | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  itemNames: Record<string, string>;
}) {
  const updateShipment = useUpdateShipment();
  const [notes, setNotes] = useState("");
  const [receivedBy, setReceivedBy] = useState("");

  // Reset isian setiap dialog dibuka untuk pengiriman lain
  useEffect(() => {
    if (open) { setNotes(""); setReceivedBy(""); }
  }, [open]);

  if (!shipment) return null;
  const nextStatus = NEXT_STATUS[shipment.status];
  if (!nextStatus) return null;

  const isReceiving = nextStatus === ShipmentStatus.RECEIVED;

  function handleSubmit() {
    updateShipment.mutate(
      {
        id: shipment!.id,
        data: {
          status: nextStatus!,
          ...(notes ? { trackingNotes: notes } : {}),
          ...(isReceiving && receivedBy ? { receivedBy } : {}),
        },
      },
      { onSuccess: () => { onOpenChange(false); setNotes(""); setReceivedBy(""); } }
    );
  }

  const currentStyle = STATUS_STYLES[shipment.status];
  const nextStyle = STATUS_STYLES[nextStatus];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Status Pengiriman</DialogTitle>
          <DialogDescription>{shipment.shipmentNumber}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Status transition */}
          <div className="flex items-center justify-center gap-3">
            <Badge variant="outline" className={`${currentStyle.badge} text-xs px-3 py-1`}>
              {currentStyle.label}
            </Badge>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <Badge variant="outline" className={`${nextStyle.badge} text-xs px-3 py-1`}>
              {nextStyle.label}
            </Badge>
          </div>

          {/* Manifest ringkasan */}
          <div className="rounded-lg bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Isi Pengiriman</p>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {shipment.manifestItems.map((m) => (
                <span key={m.itemId} className="inline-flex gap-1 bg-white border rounded px-2 py-0.5">
                  {itemNames[m.itemId] ?? m.itemId}
                  <span className="font-semibold text-foreground">{m.qty}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Catatan pengiriman */}
          <div className="space-y-2">
            <Label>Catatan{isReceiving ? " / Keterangan" : " Tracking"}</Label>
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                nextStatus === ShipmentStatus.IN_TRANSIT
                  ? "cth: Estimasi tiba 7 September 2026 via kargo darat"
                  : nextStatus === ShipmentStatus.ARRIVED
                  ? "cth: Barang tiba dalam kondisi baik, menunggu serah terima"
                  : "cth: Seluruh barang diterima lengkap dan sesuai manifest"
              }
            />
          </div>

          {isReceiving && (
            <div className="space-y-2">
              <Label>Diterima Oleh *</Label>
              <Input
                value={receivedBy}
                onChange={(e) => setReceivedBy(e.target.value)}
                placeholder="Nama koordinator penerima"
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button
            disabled={(isReceiving && !receivedBy) || updateShipment.isPending}
            onClick={handleSubmit}
          >
            {updateShipment.isPending && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
            {NEXT_STATUS_LABEL[shipment.status] ?? "Update Status"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────
// Dialog Edit Catatan Pengiriman
// ─────────────────────────────────────────────────────────────
function EditShipmentDialog({
  shipment, open, onOpenChange,
}: {
  shipment: LogisticsShipment | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const updateShipment = useUpdateShipment();
  const [notes, setNotes] = useState("");

  // Sinkronkan catatan dengan pengiriman yang sedang diedit
  useEffect(() => {
    if (open) setNotes(shipment?.trackingNotes ?? "");
  }, [open, shipment]);

  if (!shipment) return null;

  function handleSubmit() {
    updateShipment.mutate(
      { id: shipment!.id, data: { trackingNotes: notes } },
      { onSuccess: () => onOpenChange(false) }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Catatan Pengiriman</DialogTitle>
          <DialogDescription>{shipment.shipmentNumber}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-2">
            <Label>Catatan / Keterangan Tracking</Label>
            <Textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Tambahkan catatan status pengiriman..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button disabled={updateShipment.isPending} onClick={handleSubmit}>
            {updateShipment.isPending && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────
// Halaman Utama
// ─────────────────────────────────────────────────────────────
export default function LogisticsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusStyleKey | "ALL">("ALL");
  const [createOpen, setCreateOpen] = useState(false);
  const [advanceTarget, setAdvanceTarget] = useState<LogisticsShipment | null>(null);
  const [editTarget, setEditTarget] = useState<LogisticsShipment | null>(null);
  const { canWrite } = usePermissions();

  const { data: shipmentsResponse, isLoading: shipmentsLoading } = useShipments({});
  const { data: locationsResponse, isLoading: locationsLoading } = useLocations({});
  const { data: inventoryResponse } = useInventoryItems();

  const allShipments: LogisticsShipment[] = shipmentsResponse?.data ?? [];
  const allLocations: Location[] = locationsResponse?.data ?? [];
  const inventoryItems: InventoryItem[] = inventoryResponse?.data ?? [];

  const itemNames = useMemo(
    () => Object.fromEntries(inventoryItems.map((i) => [i.id, i.name])),
    [inventoryItems]
  );

  const locationData = useMemo(() => {
    return allLocations.map((loc) => {
      const shipments = allShipments.filter((s) => s.destinationLocationId === loc.id);
      const overallStatus = getLocationStatus(shipments);
      const progress = calcProgress(shipments);
      const items = aggregateItems(shipments, itemNames);
      return { loc, shipments, overallStatus, progress, items };
    });
  }, [allLocations, allShipments, itemNames]);

  const filtered = useMemo(() => {
    return locationData.filter((d) => {
      const matchStatus = statusFilter === "ALL" || d.overallStatus === statusFilter;
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
    const counts: Record<string, number> = { NONE: 0 };
    Object.values(ShipmentStatus).forEach((s) => { counts[s] = 0; });
    locationData.forEach((d) => { counts[d.overallStatus] = (counts[d.overallStatus] ?? 0) + 1; });
    return counts;
  }, [locationData]);

  const isLoading = shipmentsLoading || locationsLoading;

  const summaryCards = [
    { key: 'NONE' as StatusStyleKey, label: 'Belum Dikirim', icon: <Package className="h-5 w-5 text-gray-400" /> },
    { key: ShipmentStatus.PACKING, label: 'Sedang Dikemas', icon: <Box className="h-5 w-5 text-slate-500" /> },
    { key: ShipmentStatus.IN_TRANSIT, label: 'Dalam Perjalanan', icon: <Truck className="h-5 w-5 text-blue-500" /> },
    { key: ShipmentStatus.ARRIVED, label: 'Tiba di Lokasi', icon: <MapPin className="h-5 w-5 text-amber-500" /> },
    { key: ShipmentStatus.RECEIVED, label: 'Diterima', icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" /> },
  ];

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Logistik</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Status pengiriman peralatan per titik lokasi — persiapan, perjalanan, hingga diterima
          </p>
        </div>
        {canWrite && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Buat Pengiriman
          </Button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {summaryCards.map(({ key, label, icon }) => (
          <button key={key} onClick={() => setStatusFilter(statusFilter === key ? "ALL" : key)} className="text-left">
            <Card className={`transition-all hover:shadow-md ${statusFilter === key ? "ring-2 ring-primary" : ""}`}>
              <CardContent className="p-4 flex items-center gap-3">
                {icon}
                <div>
                  <p className="text-2xl font-bold">{summary[key] ?? 0}</p>
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
          <Button variant="outline" onClick={() => { setSearch(""); setStatusFilter("ALL"); }}>Reset</Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(({ loc, shipments, overallStatus, progress, items }) => (
            <LocationLogisticsCard
              key={loc.id}
              location={loc}
              shipments={shipments}
              overallStatus={overallStatus}
              progress={progress}
              items={items}
              onAdvance={canWrite ? setAdvanceTarget : undefined}
              onEdit={canWrite ? setEditTarget : undefined}
              canWrite={canWrite}
              itemNames={itemNames}
            />
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-16">
              <Truck className="h-12 w-12 text-muted-foreground/40 mx-auto" />
              <p className="text-muted-foreground mt-3">Tidak ada lokasi sesuai filter</p>
            </div>
          )}
        </div>
      )}

      <CreateShipmentDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        locations={allLocations}
        inventoryItems={inventoryItems}
      />
      <AdvanceStatusDialog
        shipment={advanceTarget}
        open={!!advanceTarget}
        onOpenChange={(v) => !v && setAdvanceTarget(null)}
        itemNames={itemNames}
      />
      <EditShipmentDialog
        shipment={editTarget}
        open={!!editTarget}
        onOpenChange={(v) => !v && setEditTarget(null)}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Kartu per titik lokasi
// ─────────────────────────────────────────────────────────────
function LocationLogisticsCard({
  location, shipments, overallStatus, progress, items, onAdvance, onEdit, canWrite, itemNames,
}: {
  location: Location;
  shipments: LogisticsShipment[];
  overallStatus: StatusStyleKey;
  progress: { total: number; received: number; pct: number };
  items: ReturnType<typeof aggregateItems>;
  onAdvance?: (s: LogisticsShipment) => void;
  onEdit?: (s: LogisticsShipment) => void;
  canWrite: boolean;
  itemNames: Record<string, string>;
}) {
  const [expanded, setExpanded] = useState(false);
  const deleteShipment = useDeleteShipment();
  const style = STATUS_STYLES[overallStatus];

  const latestShipment = shipments.length > 0
    ? [...shipments].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0]
    : null;

  const iconBg = {
    NONE: 'bg-gray-100', [ShipmentStatus.PACKING]: 'bg-slate-100',
    [ShipmentStatus.IN_TRANSIT]: 'bg-blue-100', [ShipmentStatus.ARRIVED]: 'bg-amber-100',
    [ShipmentStatus.RECEIVED]: 'bg-emerald-100', [ShipmentStatus.RETURNED]: 'bg-purple-100',
  }[overallStatus] ?? 'bg-gray-100';

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardHeader className="pb-0 pt-4 px-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className={`mt-0.5 h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
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
            {shipments.length > 0 && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                {shipments.length} pengiriman
                {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-5 pt-4 pb-4 space-y-4">
        {shipments.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Belum ada pengiriman ke titik lokasi ini.</p>
        ) : (
          <>
            {/* Progress */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Progress penerimaan</span>
                <span className="font-semibold">
                  {progress.received}/{progress.total} item
                  <span className="text-muted-foreground ml-1">({progress.pct}%)</span>
                </span>
              </div>
              <Progress value={progress.pct} className="h-2" />
            </div>

            {/* Status tiap item */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {items.map((item) => {
                const s = STATUS_STYLES[item.status];
                return (
                  <div key={item.itemId} className="flex items-center justify-between gap-2 rounded-md border px-3 py-1.5 text-xs">
                    <span className="truncate text-foreground">{item.name}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-semibold tabular-nums">{item.totalQty}</span>
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${s.badge}`}>{s.label}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Catatan terbaru */}
            {latestShipment?.trackingNotes && !expanded && (
              <div className="flex items-start gap-1.5 text-xs text-muted-foreground bg-muted/40 rounded-md px-3 py-2">
                <Clock className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>{latestShipment.trackingNotes}</span>
              </div>
            )}

            {/* Detail pengiriman (expandable) */}
            {expanded && (
              <div className="space-y-3 pt-1 border-t">
                <p className="text-xs font-medium text-muted-foreground">Riwayat Pengiriman</p>
                {[...shipments]
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((shp) => {
                    const ss = STATUS_STYLES[shp.status];
                    const totalQty = shp.manifestItems.reduce((s, m) => s + m.qty, 0);
                    const canAdvance = !!NEXT_STATUS[shp.status];
                    const canDelete = shp.status === ShipmentStatus.PACKING;
                    return (
                      <div key={shp.id} className="rounded-lg border bg-gray-50/50 px-3 py-3 space-y-2.5">
                        {/* Header row */}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            {ss.icon}
                            <span className="text-xs font-semibold">{shp.shipmentNumber}</span>
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${ss.badge}`}>
                              {ss.label}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">{totalQty} item</span>
                        </div>

                        {/* Manifest */}
                        <div className="flex flex-wrap gap-1.5">
                          {shp.manifestItems.map((m) => (
                            <span key={m.itemId} className="inline-flex gap-1 text-[11px] bg-white border rounded px-2 py-0.5 text-muted-foreground">
                              {itemNames[m.itemId] ?? m.itemId}
                              <span className="font-semibold text-foreground">{m.qty}</span>
                            </span>
                          ))}
                        </div>

                        {/* Notes */}
                        {shp.trackingNotes && (
                          <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground bg-white border rounded px-2.5 py-1.5">
                            <Clock className="h-3 w-3 shrink-0 mt-0.5" />
                            <span>{shp.trackingNotes}</span>
                          </div>
                        )}

                        {/* Timestamps */}
                        <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                          {shp.shippedAt && <span>Dikirim: {new Date(shp.shippedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>}
                          {shp.arrivedAt && <span>Tiba: {new Date(shp.arrivedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>}
                          {shp.receivedAt && <span>Diterima: {new Date(shp.receivedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>}
                          {!shp.shippedAt && <span>Dibuat: {new Date(shp.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>}
                        </div>

                        {/* Aksi */}
                        <div className="flex items-center gap-2 pt-1 border-t flex-wrap">
                          {canAdvance && onAdvance && (
                            <Button size="sm" className="h-7 text-xs" onClick={() => onAdvance(shp)}>
                              <ArrowRight className="h-3 w-3 mr-1" />
                              {NEXT_STATUS_LABEL[shp.status]}
                            </Button>
                          )}
                          {onEdit && (
                            <Button
                              size="sm" variant="outline" className="h-7 text-xs"
                              onClick={() => onEdit(shp)}
                            >
                              <Pencil className="h-3 w-3 mr-1" /> Edit Catatan
                            </Button>
                          )}
                          {canDelete && canWrite && (
                            <Button
                              size="sm" variant="outline"
                              className="h-7 text-xs text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
                              disabled={deleteShipment.isPending}
                              onClick={() => deleteShipment.mutate(shp.id)}
                            >
                              <Trash2 className="h-3 w-3 mr-1" /> Hapus
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

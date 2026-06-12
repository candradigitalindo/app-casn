"use client";

import { useMemo, useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Search, AlertTriangle, Clock, User, MapPin, Loader2,
  ChevronDown, ChevronUp, Zap, Shield, CheckCircle2,
  ArrowRight, AlertCircle, Plus, Trash2,
} from "lucide-react";
import {
  TicketStatusLabels, TicketStatus, TicketSeverityLabels,
  TicketCategoryLabels, TicketSeverity, TicketCategory,
} from "@/types/enums";
import {
  useTickets, useCreateTicket, useUpdateTicketStatus, useLocations, useDeleteTicket,
} from "@/lib/hooks";
import { usePermissions } from "@/lib/hooks";
import type { IncidentTicket, Location } from "@/types/models";
import { toast } from "sonner";

// ─────────────────────────────────────────────────────────────
// Style maps
// ─────────────────────────────────────────────────────────────
const SEVERITY_STYLE: Record<TicketSeverity, {
  badge: string; border: string; icon: React.ReactNode; label: string;
}> = {
  [TicketSeverity.LOW]: {
    badge: 'text-blue-700 bg-blue-50 border-blue-200',
    border: 'border-l-blue-400',
    icon: <Shield className="h-3.5 w-3.5 text-blue-500" />,
    label: TicketSeverityLabels[TicketSeverity.LOW],
  },
  [TicketSeverity.MEDIUM]: {
    badge: 'text-amber-700 bg-amber-50 border-amber-200',
    border: 'border-l-amber-400',
    icon: <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />,
    label: TicketSeverityLabels[TicketSeverity.MEDIUM],
  },
  [TicketSeverity.HIGH]: {
    badge: 'text-orange-700 bg-orange-50 border-orange-200',
    border: 'border-l-orange-500',
    icon: <Zap className="h-3.5 w-3.5 text-orange-500" />,
    label: TicketSeverityLabels[TicketSeverity.HIGH],
  },
  [TicketSeverity.CRITICAL]: {
    badge: 'text-red-700 bg-red-50 border-red-300',
    border: 'border-l-red-500',
    icon: <AlertCircle className="h-3.5 w-3.5 text-red-600" />,
    label: TicketSeverityLabels[TicketSeverity.CRITICAL],
  },
};

const STATUS_STYLE: Record<TicketStatus, { badge: string; dot: string; label: string }> = {
  [TicketStatus.OPEN]:        { badge: 'text-sky-700 bg-sky-50 border-sky-200',          dot: 'bg-sky-500',     label: TicketStatusLabels[TicketStatus.OPEN] },
  [TicketStatus.ASSIGNED]:    { badge: 'text-indigo-700 bg-indigo-50 border-indigo-200', dot: 'bg-indigo-500',  label: TicketStatusLabels[TicketStatus.ASSIGNED] },
  [TicketStatus.IN_PROGRESS]: { badge: 'text-amber-700 bg-amber-50 border-amber-200',   dot: 'bg-amber-500',   label: TicketStatusLabels[TicketStatus.IN_PROGRESS] },
  [TicketStatus.ESCALATED]:   { badge: 'text-red-700 bg-red-50 border-red-200',          dot: 'bg-red-500',     label: TicketStatusLabels[TicketStatus.ESCALATED] },
  [TicketStatus.RESOLVED]:    { badge: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500', label: TicketStatusLabels[TicketStatus.RESOLVED] },
  [TicketStatus.CLOSED]:      { badge: 'text-gray-600 bg-gray-50 border-gray-200',       dot: 'bg-gray-400',    label: TicketStatusLabels[TicketStatus.CLOSED] },
};

const STATUS_ORDER: TicketStatus[] = [
  TicketStatus.OPEN,
  TicketStatus.ASSIGNED,
  TicketStatus.IN_PROGRESS,
  TicketStatus.ESCALATED,
  TicketStatus.RESOLVED,
  TicketStatus.CLOSED,
];

const NEXT_STATUS: Partial<Record<TicketStatus, TicketStatus[]>> = {
  [TicketStatus.OPEN]:        [TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS, TicketStatus.ESCALATED],
  [TicketStatus.ASSIGNED]:    [TicketStatus.IN_PROGRESS, TicketStatus.ESCALATED],
  [TicketStatus.IN_PROGRESS]: [TicketStatus.RESOLVED, TicketStatus.ESCALATED],
  [TicketStatus.ESCALATED]:   [TicketStatus.IN_PROGRESS, TicketStatus.RESOLVED],
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}j lalu`;
  return `${Math.floor(h / 24)}h lalu`;
}

// ─────────────────────────────────────────────────────────────
// Dialog Update Status
// ─────────────────────────────────────────────────────────────
function UpdateStatusDialog({
  ticket, open, onOpenChange,
}: {
  ticket: IncidentTicket | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const update = useUpdateTicketStatus();
  const [nextStatus, setNextStatus] = useState<string>("");
  const [assignedTo, setAssignedTo] = useState("");
  const [resolutionNote, setResolutionNote] = useState("");

  // Reset isian setiap dialog dibuka untuk tiket lain (dialog selalu ter-mount)
  useEffect(() => {
    if (open) { setNextStatus(""); setAssignedTo(""); setResolutionNote(""); }
  }, [open]);

  if (!ticket) return null;
  const options = NEXT_STATUS[ticket.status] ?? [];

  function handleSubmit() {
    if (!ticket || !nextStatus) return;
    update.mutate(
      {
        id: ticket.id,
        status: nextStatus as TicketStatus,
        ...(assignedTo ? { assignedTo } : {}),
        ...(resolutionNote ? { resolutionNote } : {}),
      },
      { 
        onSuccess: () => {
          toast.success("Status tiket diperbarui");
          onOpenChange(false);
        }
      }
    );
  }

  const needsAssignee = nextStatus === TicketStatus.ASSIGNED;
  const needsNote = nextStatus === TicketStatus.RESOLVED;
  const valid = !!nextStatus && (!needsAssignee || assignedTo) && (!needsNote || resolutionNote);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm leading-snug">Update Status Tiket</DialogTitle>
          <DialogDescription className="text-xs">{ticket.ticketNumber} — {ticket.title}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Current → next */}
          <div className="flex items-center gap-3 text-xs">
            <Badge variant="outline" className={`${STATUS_STYLE[ticket.status].badge} text-xs`}>
              {STATUS_STYLE[ticket.status].label}
            </Badge>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <Select value={nextStatus} onValueChange={(v) => setNextStatus(v as TicketStatus)}>
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue placeholder="Pilih status baru..." />
              </SelectTrigger>
              <SelectContent>
                {options.map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${STATUS_STYLE[s].dot}`} />
                      {STATUS_STYLE[s].label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {needsAssignee && (
            <div className="space-y-1.5">
              <Label className="text-xs">Ditugaskan kepada *</Label>
              <Input
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                placeholder="Nama atau ID teknisi"
                className="h-8 text-sm"
              />
            </div>
          )}

          {needsNote && (
            <div className="space-y-1.5">
              <Label className="text-xs">Catatan Resolusi *</Label>
              <Textarea
                rows={3}
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                placeholder="Jelaskan bagaimana masalah diselesaikan..."
                className="text-sm"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button size="sm" disabled={!valid || update.isPending} onClick={handleSubmit}>
            {update.isPending && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────
// Kartu tiket
// ─────────────────────────────────────────────────────────────
function TicketCard({
  ticket, locationName, onUpdate, onDelete, canDelete,
}: {
  ticket: IncidentTicket;
  locationName: string;
  onUpdate?: (t: IncidentTicket) => void;
  onDelete?: (id: string) => void;
  canDelete?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const sev = SEVERITY_STYLE[ticket.severity];
  const sta = STATUS_STYLE[ticket.status];
  const isDone = ticket.status === TicketStatus.RESOLVED || ticket.status === TicketStatus.CLOSED;
  const canUpdate = !!NEXT_STATUS[ticket.status];

  return (
    <Card className={`overflow-hidden border-l-4 transition-shadow hover:shadow-md ${sev.border}`}>
      <CardContent className="p-0">
        {/* Main row */}
        <div className="px-5 py-4">
          <div className="flex items-start gap-3">
            {/* Severity icon */}
            <div className="mt-0.5 shrink-0">{sev.icon}</div>

            {/* Content */}
            <div className="flex-1 min-w-0 space-y-2">
              {/* Top meta row */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-mono text-muted-foreground">{ticket.ticketNumber}</span>
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${sev.badge}`}>
                  {sev.label}
                </Badge>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                  {TicketCategoryLabels[ticket.category]}
                </Badge>
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${sta.badge}`}>
                  <span className={`h-1.5 w-1.5 rounded-full mr-1 inline-block ${sta.dot}`} />
                  {sta.label}
                </Badge>

              </div>

              {/* Title */}
              <p className="font-semibold text-sm leading-snug">{ticket.title}</p>

              {/* Description */}
              <p className={`text-xs text-muted-foreground ${expanded ? '' : 'line-clamp-2'}`}>
                {ticket.description}
              </p>

              {/* Bottom info row */}
              <div className="flex items-center gap-3 flex-wrap text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />{ticket.reporterName}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />{locationName}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />{timeAgo(ticket.createdAt)}
                </span>
                {ticket.assignedTo && (
                  <span className="flex items-center gap-1 text-indigo-600">
                    <User className="h-3 w-3" /> Ditugaskan: {ticket.assignedTo}
                  </span>
                )}
              </div>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
              {canUpdate && onUpdate && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs px-2.5"
                  onClick={() => onUpdate(ticket)}
                >
                  Update
                </Button>
              )}
              {canDelete && onDelete && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                  onClick={() => {
                    if (confirm("Hapus tiket ini?")) onDelete(ticket.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              {isDone && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
              <button
                onClick={() => setExpanded((v) => !v)}
                className="text-muted-foreground hover:text-foreground p-0.5"
              >
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Expanded detail */}
        {expanded && (
          <div className="border-t bg-muted/20 px-5 py-3 space-y-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <p className="text-muted-foreground font-medium">Dibuat</p>
                <p>{new Date(ticket.createdAt).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              <div>
                <p className="text-muted-foreground font-medium">Diperbarui</p>
                <p>{timeAgo(ticket.updatedAt)}</p>
              </div>
            </div>

            {ticket.resolutionNote && (
              <div className="rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 mb-0.5">Resolusi</p>
                <p className="text-xs text-emerald-800">{ticket.resolutionNote}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// Severity config untuk form
// ─────────────────────────────────────────────────────────────
const SEV_FORM: Record<TicketSeverity, {
  card: string; ring: string; iconBg: string; desc: string;
}> = {
  [TicketSeverity.CRITICAL]: {
    card: 'border-red-200 bg-red-50/60',
    ring: 'ring-2 ring-red-400',
    iconBg: 'bg-red-100',
    desc: 'Sistem lumpuh, tidak bisa ditunda',
  },
  [TicketSeverity.HIGH]: {
    card: 'border-orange-200 bg-orange-50/60',
    ring: 'ring-2 ring-orange-400',
    iconBg: 'bg-orange-100',
    desc: 'Dampak besar, perlu segera ditangani',
  },
  [TicketSeverity.MEDIUM]: {
    card: 'border-amber-200 bg-amber-50/60',
    ring: 'ring-2 ring-amber-400',
    iconBg: 'bg-amber-100',
    desc: 'Gangguan sebagian, masih bisa berjalan',
  },
  [TicketSeverity.LOW]: {
    card: 'border-blue-200 bg-blue-50/60',
    ring: 'ring-2 ring-blue-400',
    iconBg: 'bg-blue-100',
    desc: 'Tidak mendesak, jadwalkan penanganan',
  },
};

type FormState = {
  locationId: string;
  severity: TicketSeverity;
  category: TicketCategory;
  title: string;
  description: string;
  reporterName: string;
};

// ─────────────────────────────────────────────────────────────
// Dialog Buat Tiket
// ─────────────────────────────────────────────────────────────
function CreateTicketDialog({
  open, onOpenChange, form, setForm, locations, onSubmit, isPending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  locations: Location[];
  onSubmit: () => void;
  isPending: boolean;
}) {
  const [locSearch, setLocSearch] = useState("");
  const [locPickerOpen, setLocPickerOpen] = useState(false);

  const selectedLoc = locations.find((l) => l.id === form.locationId);
  const filteredLocs = locations.filter((l) => {
    const q = locSearch.toLowerCase();
    return !q || l.name.toLowerCase().includes(q) || l.code.toLowerCase().includes(q) || l.city.toLowerCase().includes(q);
  });

  const sevOrder: TicketSeverity[] = [
    TicketSeverity.CRITICAL, TicketSeverity.HIGH, TicketSeverity.MEDIUM, TicketSeverity.LOW,
  ];
  const catEntries = Object.entries(TicketCategoryLabels) as [TicketCategory, string][];
  const valid = !!form.title && !!form.description && !!form.reporterName;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl p-0 gap-0 border-none shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">

        {/* ── Header band ── */}
        <DialogHeader className="p-4 bg-primary/5 border-b flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Laporkan Insiden</DialogTitle>
              <p className="text-[10px] text-muted-foreground uppercase tracking-tight font-medium">Sistem Aplikasi Pengelolaan dan Pengendalian Pelaksanaan Seleksi</p>
            </div>
          </div>
        </DialogHeader>

        {/* ── Two-column body ── */}
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-y-auto min-h-0">

          {/* Kolom kiri — isian utama */}
          <div className="md:col-span-7 p-6 space-y-6 border-r">

            {/* Tingkat keparahan */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-primary font-bold text-[11px] uppercase tracking-wider">
                <Zap className="h-3.5 w-3.5" />
                Tingkat Keparahan
              </div>
              <div className="grid grid-cols-2 gap-2">
                {sevOrder.map((sev) => {
                  const sf = SEV_FORM[sev];
                  const ss = SEVERITY_STYLE[sev];
                  const active = form.severity === sev;
                  return (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, severity: sev }))}
                      className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all ${
                        active ? `${sf.card} ${sf.ring}` : 'hover:bg-muted/30 border-gray-100'
                      }`}
                    >
                      <div className={`mt-0.5 h-6 w-6 rounded-md flex items-center justify-center shrink-0 ${active ? sf.iconBg : 'bg-muted/60'}`}>
                        {ss.icon}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-xs font-semibold leading-snug ${active ? '' : 'text-muted-foreground'}`}>{ss.label}</p>
                        <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">{sf.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Kategori */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-primary font-bold text-[11px] uppercase tracking-wider">
                <AlertCircle className="h-3.5 w-3.5" />
                Kategori Gangguan
              </div>
              <div className="flex flex-wrap gap-1.5">
                {catEntries.map(([k, v]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, category: k }))}
                    className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                      form.category === k
                        ? 'bg-foreground text-background border-foreground'
                        : 'hover:bg-muted border-gray-200 text-muted-foreground'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Judul + deskripsi */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-primary font-bold text-[11px] uppercase tracking-wider">
                <AlertTriangle className="h-3.5 w-3.5" />
                Detail Kejadian
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase">Judul Masalah *</Label>
                <Input
                  placeholder="cth: Laptop client no. 15 tidak menyala di Ruang B2"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="h-9 text-sm bg-muted/20"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase">Deskripsi *</Label>
                <div className="relative">
                  <Textarea
                    rows={4}
                    placeholder="Jelaskan: ruang/area spesifik, waktu kejadian, dampak pada peserta, kondisi terkini..."
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    className="text-sm bg-muted/20 resize-none pr-10"
                  />
                  <span className="absolute bottom-2 right-3 text-[10px] text-muted-foreground tabular-nums">
                    {form.description.length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Kolom kanan — konteks & pelapor */}
          <div className="md:col-span-5 p-6 space-y-6 bg-muted/5">

              {/* Pelapor */}
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Nama Pelapor *</Label>
                <div className="relative">
                  <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Nama lengkap Anda"
                    value={form.reporterName}
                    onChange={(e) => setForm((f) => ({ ...f, reporterName: e.target.value }))}
                    className="h-9 text-sm bg-muted/20 pl-8"
                  />
                </div>
              </div>

              {/* Lokasi */}
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Titik Lokasi</Label>
                {selectedLoc ? (
                  <button
                    type="button"
                    onClick={() => { setLocPickerOpen(true); setLocSearch(""); }}
                    className="w-full flex items-center gap-3 rounded-lg border bg-muted/20 px-3 py-2.5 text-left hover:bg-muted/40 transition-colors"
                  >
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate leading-snug">{selectedLoc.name}</p>
                      <p className="text-[10px] text-muted-foreground">{selectedLoc.city}, {selectedLoc.province}</p>
                    </div>
                    <span className="text-[10px] text-primary shrink-0 font-medium">Ubah</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setLocPickerOpen(true); setLocSearch(""); }}
                    className="w-full flex items-center gap-2.5 rounded-lg border border-dashed border-muted-foreground/30 px-3 py-2.5 text-left hover:bg-muted/20 transition-colors"
                  >
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-sm text-muted-foreground">Pilih lokasi kejadian</span>
                  </button>
                )}
                {locPickerOpen && (
                  <div className="rounded-lg border bg-white shadow-lg overflow-hidden">
                    <div className="px-3 py-2 border-b">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                        <Input
                          autoFocus
                          value={locSearch}
                          onChange={(e) => setLocSearch(e.target.value)}
                          placeholder="Cari nama, kode, atau kota..."
                          className="pl-7 h-7 text-xs border-0 bg-muted/40 focus-visible:ring-0"
                        />
                      </div>
                    </div>
                    <div className="max-h-40 overflow-y-auto divide-y">
                      {filteredLocs.map((l) => (
                        <button
                          key={l.id}
                          type="button"
                          onClick={() => { setForm((f) => ({ ...f, locationId: l.id })); setLocPickerOpen(false); }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-muted/40 transition-colors ${form.locationId === l.id ? 'bg-primary/5' : ''}`}
                        >
                          <MapPin className={`h-3 w-3 shrink-0 ${form.locationId === l.id ? 'text-primary' : 'text-muted-foreground'}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{l.name}</p>
                            <p className="text-[10px] text-muted-foreground">{l.city}</p>
                          </div>
                          <span className="text-[9px] font-mono text-muted-foreground shrink-0">{l.code}</span>
                        </button>
                      ))}
                    </div>
                    <div className="px-3 py-1.5 border-t bg-muted/20 flex justify-end">
                      <button type="button" onClick={() => setLocPickerOpen(false)} className="text-[10px] text-muted-foreground hover:text-foreground">Tutup</button>
                    </div>
                  </div>
                )}
              </div>

          </div>
        </div>

        {/* ── Footer ── */}
        <DialogFooter className="px-6 py-5 bg-muted/20 border-t flex-row sm:justify-end gap-3 shrink-0">
          <Button variant="outline" size="sm" className="h-9 px-5 text-xs" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button
            size="sm"
            className="h-9 px-6 text-xs font-bold shadow-lg shadow-primary/20"
            disabled={!valid || isPending}
            onClick={onSubmit}
          >
            {isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            Kirim Laporan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────
// Halaman utama
// ─────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  locationId: "",
  severity: TicketSeverity.MEDIUM,
  category: TicketCategory.IT_HARDWARE,
  title: "",
  description: "",
  reporterName: "",
};

export default function IncidentsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "ALL">("ALL");
  const [sevFilter, setSevFilter] = useState<TicketSeverity | "ALL">("ALL");
  const [createOpen, setCreateOpen] = useState(false);
  const [updateTarget, setUpdateTarget] = useState<IncidentTicket | null>(null);
  const { canWrite } = usePermissions();
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: response, isLoading } = useTickets(
    statusFilter !== "ALL" ? { status: statusFilter } : {}
  );
  const { data: locResponse } = useLocations({});
  const createTicket = useCreateTicket();
  const deleteTicket = useDeleteTicket();

  const tickets: IncidentTicket[] = response?.data ?? [];
  const locations: Location[] = locResponse?.data ?? [];
  const locMap = useMemo(
    () => Object.fromEntries(locations.map((l) => [l.id, l.name])),
    [locations]
  );

  const filtered = useMemo(() => {
    return tickets.filter((t) => {
      if (sevFilter !== "ALL" && t.severity !== sevFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        t.ticketNumber.toLowerCase().includes(q) ||
        t.reporterName.toLowerCase().includes(q) ||
        (locMap[t.locationId] ?? "").toLowerCase().includes(q)
      );
    });
  }, [tickets, sevFilter, search, locMap]);

  const counts = useMemo(() => {
    const byStatus = Object.fromEntries(
      STATUS_ORDER.map((s) => [s, tickets.filter((t) => t.status === s).length])
    ) as Record<TicketStatus, number>;
    const bySev = Object.fromEntries(
      Object.values(TicketSeverity).map((s) => [s, tickets.filter((t) => t.severity === s).length])
    ) as Record<TicketSeverity, number>;
    return { byStatus, bySev };
  }, [tickets]);

  function handleCreate() {
    if (!form.title || !form.description || !form.reporterName) return;
    createTicket.mutate(form, {
      onSuccess: () => { 
        toast.success("Tiket berhasil dibuat");
        setCreateOpen(false); 
        setForm(EMPTY_FORM); 
      },
    });
  }

  function handleDelete(id: string) {
    deleteTicket.mutate(id, {
      onSuccess: () => {
        toast.success("Tiket berhasil dihapus");
      },
    });
  }

  const activeFilters = (statusFilter !== "ALL" ? 1 : 0) + (sevFilter !== "ALL" ? 1 : 0) + (search ? 1 : 0);

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Insiden</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Kelola tiket gangguan di titik lokasi — pantau SLA dan progress penanganan
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Buat Tiket
        </Button>
      </div>

      {/* Summary severity */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* Selesai */}
        <button
          onClick={() => setStatusFilter(statusFilter === TicketStatus.RESOLVED ? "ALL" : TicketStatus.RESOLVED)}
          className="text-left"
        >
          <Card className={`transition-all hover:shadow-md h-full ${statusFilter === TicketStatus.RESOLVED ? 'ring-2 ring-primary' : ''}`}>
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
              <div>
                <p className="text-2xl font-bold">{(counts.byStatus[TicketStatus.RESOLVED] ?? 0) + (counts.byStatus[TicketStatus.CLOSED] ?? 0)}</p>
                <p className="text-[11px] text-muted-foreground leading-tight">Selesai</p>
              </div>
            </CardContent>
          </Card>
        </button>

        {/* Severity breakdown */}
        {([TicketSeverity.CRITICAL, TicketSeverity.HIGH, TicketSeverity.MEDIUM, TicketSeverity.LOW] as TicketSeverity[]).map((sev) => (
          <button
            key={sev}
            onClick={() => setSevFilter(sevFilter === sev ? "ALL" : sev)}
            className="text-left"
          >
            <Card className={`transition-all hover:shadow-md h-full ${sevFilter === sev ? 'ring-2 ring-primary' : ''}`}>
              <CardContent className="p-4 flex items-center gap-3">
                {SEVERITY_STYLE[sev].icon}
                <div>
                  <p className="text-2xl font-bold">{counts.bySev[sev] ?? 0}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight">{SEVERITY_STYLE[sev].label}</p>
                </div>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      {/* Status filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setStatusFilter("ALL")}
          className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
            statusFilter === "ALL"
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-white hover:bg-muted border-gray-200'
          }`}
        >
          Semua
          <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-black/10 text-[10px] font-bold">
            {tickets.length}
          </span>
        </button>
        {STATUS_ORDER.map((s) => {
          const st = STATUS_STYLE[s];
          const cnt = counts.byStatus[s] ?? 0;
          if (cnt === 0 && statusFilter !== s) return null;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? "ALL" : s)}
              className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-primary text-primary-foreground border-primary'
                  : `${st.badge} hover:opacity-80`
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${statusFilter === s ? 'bg-white' : st.dot}`} />
              {st.label}
              <span className={`inline-flex items-center justify-center h-4 w-4 rounded-full text-[10px] font-bold ${statusFilter === s ? 'bg-white/20' : 'bg-black/10'}`}>
                {cnt}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search + reset */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari tiket, judul, pelapor, atau lokasi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {activeFilters > 0 && (
          <Button variant="outline" onClick={() => { setStatusFilter("ALL"); setSevFilter("ALL"); setSearch(""); }}>
            Reset{activeFilters > 1 ? ` (${activeFilters})` : ""}
          </Button>
        )}
      </div>

      {/* Ticket list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <AlertTriangle className="h-12 w-12 text-muted-foreground/40 mx-auto" />
          <p className="text-muted-foreground mt-3">Tidak ada tiket ditemukan</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => (
            <TicketCard
              key={t.id}
              ticket={t}
              locationName={locMap[t.locationId] ?? t.locationId}
              onUpdate={canWrite ? setUpdateTarget : undefined}
              onDelete={handleDelete}
              canDelete={canWrite}
            />
          ))}
        </div>
      )}

      {/* Dialog Update Status */}
      <UpdateStatusDialog
        ticket={updateTarget}
        open={!!updateTarget}
        onOpenChange={(v) => !v && setUpdateTarget(null)}
      />

      {/* Dialog Buat Tiket */}
      <CreateTicketDialog
        open={createOpen}
        onOpenChange={(v) => { setCreateOpen(v); if (!v) setForm(EMPTY_FORM); }}
        form={form}
        setForm={setForm}
        locations={locations}
        onSubmit={handleCreate}
        isPending={createTicket.isPending}
      />
    </div>
  );
}

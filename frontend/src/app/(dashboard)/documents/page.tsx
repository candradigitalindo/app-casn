"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ChevronDown, ChevronUp, FileText, Upload, Trash2,
  Download, Search, Loader2, FolderOpen, MapPin, Eye,
} from "lucide-react";
import { toast } from "sonner";
import { useLocations, useDocuments, useCreateDocument, useDeleteDocument, usePermissions } from "@/lib/hooks";
import type { Location, LocationDocument } from "@/types/models";
import {
  DocumentCategory, DocumentCategoryLabels, DocumentCategoryColors,
} from "@/types/enums";
import { CreateDocumentDto } from "@/lib/api/documents";

const EMPTY_FORM: Omit<CreateDocumentDto, "locationId" | "uploadedBy"> = {
  category: DocumentCategory.LAINNYA,
  name: "",
  fileName: "",
  fileUrl: "",
  fileSizeKb: undefined,
  notes: "",
};

// ── Upload Dialog ─────────────────────────────────────────────────────────────
function UploadDocumentDialog({
  open,
  locationId,
  locationName,
  onOpenChange,
}: {
  open: boolean;
  locationId: string;
  locationName: string;
  onOpenChange: (v: boolean) => void;
}) {
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const create = useCreateDocument(locationId);

  function reset() {
    setForm({ ...EMPTY_FORM });
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 10 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((f) => ({
        ...f,
        fileName: file.name,
        fileUrl: reader.result as string,
        fileSizeKb: Math.round(file.size / 1024),
        name: f.name || file.name.replace(/\.[^.]+$/, ""),
      }));
    };
    reader.readAsDataURL(file);
  }

  function handleSubmit() {
    if (!form.name || !form.fileUrl) return;
    create.mutate(
      { ...form, locationId },
      {
        onSuccess: () => {
          reset();
          onOpenChange(false);
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-primary" />
            Upload Dokumen
          </DialogTitle>
          <p className="text-xs text-muted-foreground">{locationName}</p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* File picker */}
          <div className="space-y-1.5">
            <Label>File Dokumen</Label>
            <label className="flex items-center gap-3 w-full cursor-pointer border-2 border-dashed rounded-lg p-4 hover:border-primary/50 transition-colors">
              <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                {form.fileName ? (
                  <p className="text-sm font-medium truncate text-primary">{form.fileName}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Klik untuk pilih file atau drag &amp; drop</p>
                )}
                <p className="text-[11px] text-muted-foreground">PDF, DOCX, ZIP, JPG, PNG (maks. 10 MB)</p>
              </div>
              <input type="file" className="hidden" onChange={handleFile} />
            </label>
          </div>

          {/* Kategori */}
          <div className="space-y-1.5">
            <Label>Kategori</Label>
            <Select
              value={form.category}
              onValueChange={(v) => setForm((f) => ({ ...f, category: v as DocumentCategory }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.values(DocumentCategory).map((c) => (
                  <SelectItem key={c} value={c}>{DocumentCategoryLabels[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Nama dokumen */}
          <div className="space-y-1.5">
            <Label>Nama Dokumen</Label>
            <Input
              placeholder="Contoh: BA Uji Fungsi Peralatan"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>

          {/* Catatan */}
          <div className="space-y-1.5">
            <Label>Catatan <span className="text-muted-foreground">(opsional)</span></Label>
            <Textarea
              placeholder="Catatan tambahan tentang dokumen ini..."
              value={form.notes ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>
            Batal
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!form.name || !form.fileUrl || create.isPending}
            className="h-9 px-6 text-xs font-bold shadow-lg"
          >
            {create.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            Simpan Dokumen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Document Row ──────────────────────────────────────────────────────────────
function DocumentRow({
  doc,
  onDelete,
  onView,
}: {
  doc: LocationDocument;
  onDelete?: (doc: LocationDocument) => void;
  onView: (doc: LocationDocument) => void;
}) {
  const colorClass = DocumentCategoryColors[doc.category] ?? "bg-muted text-muted-foreground";

  return (
    <div className="flex items-center gap-3 py-3 px-4 hover:bg-muted/30 transition-colors group">
      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <FileText className="h-4.5 w-4.5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight truncate">{doc.name}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <Badge className={`text-[10px] px-1.5 py-0 border-0 ${colorClass}`}>
            {DocumentCategoryLabels[doc.category]}
          </Badge>
          <span className="text-[11px] text-muted-foreground font-mono truncate">{doc.fileName}</span>
          {doc.fileSizeKb && (
            <span className="text-[11px] text-muted-foreground">
              {doc.fileSizeKb >= 1024
                ? `${(doc.fileSizeKb / 1024).toFixed(1)} MB`
                : `${doc.fileSizeKb} KB`}
            </span>
          )}
        </div>
        {doc.notes && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{doc.notes}</p>}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-[11px] text-muted-foreground hidden sm:block">
          {new Date(doc.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
        </span>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => onView(doc)}
          title="Lihat"
        >
          <Eye className="h-3.5 w-3.5" />
        </Button>
        <a href={doc.fileUrl} download={doc.fileName} title="Unduh">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
        </a>
        {onDelete && (
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10"
            onClick={() => onDelete(doc)}
            title="Hapus"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Per-Location Card ─────────────────────────────────────────────────────────
function LocationDocumentCard({
  location,
  search,
  categoryFilter,
}: {
  location: Location;
  search: string;
  categoryFilter: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LocationDocument | null>(null);
  const [viewTarget, setViewTarget] = useState<LocationDocument | null>(null);

  const { data, isLoading } = useDocuments(expanded ? location.id : "");
  const deleteMutation = useDeleteDocument(location.id);
  const { canWrite } = usePermissions();

  const docs = useMemo(() => {
    let list = data?.data ?? [];
    if (categoryFilter !== "ALL") list = list.filter((d) => d.category === categoryFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.fileName.toLowerCase().includes(q) ||
          (d.notes ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [data, categoryFilter, search]);

  const totalCount = data?.data?.length ?? 0;

  return (
    <>
      <Card className="overflow-hidden">
        {/* Card header */}
        <button
          className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors text-left"
          onClick={() => setExpanded((v) => !v)}
        >
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <MapPin className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-tight truncate">{location.name}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {location.city}, {location.province}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {expanded && totalCount > 0 && (
              <Badge variant="secondary" className="text-[11px]">
                {totalCount} dokumen
              </Badge>
            )}
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </button>

        {/* Expanded content */}
        {expanded && (
          <div className="border-t">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-muted/20">
              <span className="text-xs text-muted-foreground">
                {isLoading ? "Memuat..." : `${docs.length} dokumen`}
                {(search || categoryFilter !== "ALL") && totalCount > docs.length && ` dari ${totalCount}`}
              </span>
              {canWrite && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1.5"
                  onClick={(e) => { e.stopPropagation(); setUploadOpen(true); }}
                >
                  <Upload className="h-3 w-3" />
                  Upload Dokumen
                </Button>
              )}
            </div>

            {/* Document list */}
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : docs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <FolderOpen className="h-10 w-10 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">
                  {totalCount === 0 ? "Belum ada dokumen di lokasi ini" : "Tidak ada dokumen yang cocok"}
                </p>
                {totalCount === 0 && canWrite && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3 h-7 text-xs gap-1.5"
                    onClick={() => setUploadOpen(true)}
                  >
                    <Upload className="h-3 w-3" />
                    Upload Dokumen Pertama
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y">
                {docs.map((doc) => (
                  <DocumentRow key={doc.id} doc={doc} onDelete={canWrite ? setDeleteTarget : undefined} onView={setViewTarget} />
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      <UploadDocumentDialog
        open={uploadOpen}
        locationId={location.id}
        locationName={location.name}
        onOpenChange={setUploadOpen}
      />

      {/* Viewer file dokumen (data URL: gambar inline, PDF via iframe) */}
      <Dialog open={!!viewTarget} onOpenChange={(open: boolean) => !open && setViewTarget(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-base">{viewTarget?.name}</DialogTitle>
            <p className="text-xs text-muted-foreground font-mono">{viewTarget?.fileName}</p>
          </DialogHeader>
          {viewTarget?.fileUrl?.startsWith("data:image") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={viewTarget.fileUrl} alt={viewTarget.name} className="max-h-[70vh] w-full object-contain rounded-md border" />
          ) : viewTarget?.fileUrl?.startsWith("data:application/pdf") ? (
            <iframe src={viewTarget.fileUrl} title={viewTarget.name} className="h-[70vh] w-full rounded-md border" />
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Pratinjau tidak tersedia untuk jenis file ini — gunakan tombol Unduh.
            </p>
          )}
          <DialogFooter>
            {viewTarget?.fileUrl?.startsWith("data:") && (
              <a href={viewTarget.fileUrl} download={viewTarget.fileName}>
                <Button variant="outline"><Download className="h-4 w-4 mr-1" /> Unduh</Button>
              </a>
            )}
            <Button onClick={() => setViewTarget(null)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open: boolean) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus Dokumen</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Dokumen <strong>{deleteTarget?.name}</strong> akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Batal</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!deleteTarget) return;
                deleteMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
              }}
            >
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DocumentsPage() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  const { data: locResponse, isLoading: locLoading } = useLocations();
  const locations: Location[] = locResponse?.data ?? [];

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dokumen</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Dokumen yang telah diunggah per titik lokasi
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama atau file dokumen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v ?? "ALL")}>
          <SelectTrigger className="sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua Kategori</SelectItem>
            {Object.values(DocumentCategory).map((c) => (
              <SelectItem key={c} value={c}>{DocumentCategoryLabels[c]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Location cards */}
      {locLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : locations.length === 0 ? (
        <div className="text-center py-16">
          <FolderOpen className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground">Belum ada titik lokasi terdaftar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {locations.map((loc) => (
            <LocationDocumentCard
              key={loc.id}
              location={loc}
              search={search}
              categoryFilter={categoryFilter}
            />
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft, MapPin, Users, CheckCircle2, Circle, Loader2, Camera,
  FileText, Plus, Trash2, Pencil, PackagePlus, Play, CheckCheck, Eye,
  ChevronLeft, ChevronRight, FileUp, Download,
} from "lucide-react";
import {
  useLocation as useLocationDetail,
  useLocationStages,
  useUpdateStage,
  useAddStagePhoto,
  useDeleteStagePhoto,
  useBeritaAcaraList,
  useCreateBeritaAcara,
  useDeleteBeritaAcara,
  useApproveBeritaAcara,
  useRejectBeritaAcara,
  useLocationItems,
  useCreateLocationItem,
  useUpdateLocationItem,
  useDeleteLocationItem,
  useSeedStandardItems,
  useUpdateCapacity,
  usePermissions,
} from "@/lib/hooks";
import { useAuthStore } from "@/lib/stores/auth";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import type { LocationStage, BeritaAcara, LocationItem } from "@/types/models";
import {
  StagePhase, StagePhaseOrder, StagePhaseLabels, StagePhaseDescriptions,
  StageStatus, StageStatusLabels,
  BeritaAcaraType, BeritaAcaraTypeLabels, StageBeritaAcaraTypes,
  ItemOwnership, ItemOwnershipLabels, ItemCondition, ItemConditionLabels,
  LocationStatusLabels, UserRoleLabels, BeritaAcaraStatus, BeritaAcaraStatusLabels,
} from "@/types/enums";

const CAPACITY_OPTIONS = [25, 50, 75, 100, 150, 200, 250, 300];

// Dokumentasi bisa berupa foto atau video (disimpan di /uploads server)
function isVideoUrl(url: string): boolean {
  return /\.(mp4|mov|webm|m4v|avi|mkv)$/i.test(url);
}

// Nama file unduhan dokumentasi: ekstensi dari URL upload atau MIME data URL
function downloadName(p: { id: string; url: string }): string {
  const ext = p.url.match(/\.(\w{2,4})(?:$|\?)/)?.[1]
    ?? p.url.match(/^data:(?:image|video)\/(\w+)/)?.[1]
    ?? "jpg";
  return `dokumentasi-${p.id}.${ext}`;
}
const PHOTOS_PER_PAGE = 6;

const statusColor: Record<StageStatus, string> = {
  [StageStatus.NOT_STARTED]: "bg-gray-100 text-gray-500 border-gray-200",
  [StageStatus.IN_PROGRESS]: "bg-amber-50 text-amber-700 border-amber-300",
  [StageStatus.COMPLETED]: "bg-emerald-50 text-emerald-700 border-emerald-300",
};

// useSearchParams wajib dibungkus Suspense saat prerender (output: export).
export default function LocationDetailPage() {
  return (
    <Suspense>
      <LocationDetail />
    </Suspense>
  );
}

function LocationDetail() {
  const searchParams = useSearchParams();
  const locationId = searchParams.get("id") ?? "";
  const user = useAuthStore((s) => s.user);
  const { canWrite } = usePermissions();

  const { data: locResponse, isLoading: locLoading } = useLocationDetail(locationId);
  const { data: stagesResponse, isLoading: stagesLoading } = useLocationStages(locationId);
  const { data: baResponse } = useBeritaAcaraList({ locationId });

  const location = locResponse?.data;
  const stages = useMemo(() => stagesResponse?.data ?? [], [stagesResponse]);
  const beritaAcaraAll = baResponse?.data ?? [];

  const [selectedPhase, setSelectedPhase] = useState<StagePhase | null>(null);

  const activePhase = useMemo(() => {
    if (selectedPhase) return selectedPhase;
    const inProgress = stages.find((s) => s.status === StageStatus.IN_PROGRESS);
    if (inProgress) return inProgress.phase;
    const notStarted = stages.find((s) => s.status === StageStatus.NOT_STARTED);
    return notStarted?.phase ?? StagePhase.PERSIAPAN;
  }, [selectedPhase, stages]);

  if (locLoading || stagesLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!location) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Lokasi tidak ditemukan.</p>
        <Link href="/locations" className="text-primary text-sm hover:underline mt-2 inline-block">
          Kembali ke daftar lokasi
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <Link href="/locations" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground w-fit">
          <ArrowLeft className="h-4 w-4" /> Daftar Lokasi
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">{location.name}</h1>
              <Badge variant="outline">{LocationStatusLabels[location.status]}</Badge>
            </div>
            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
              <span className="font-mono">{location.code}</span>
              <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{location.city}, {location.province}</span>
            </div>
          </div>
          <CapacitySelector locationId={locationId} currentCapacity={location.capacity} canWrite={canWrite} />
        </div>
      </div>

      {/* Stepper 6 tahap */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Tahapan Pekerjaan</CardTitle>
          <CardDescription className="text-xs">
            Alur pengendalian pekerjaan penyedia di titik lokasi — klik tahap untuk melihat detail
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {StagePhaseOrder.map((phase, i) => {
              const stage = stages.find((s) => s.phase === phase);
              const status = stage?.status ?? StageStatus.NOT_STARTED;
              const isActive = phase === activePhase;
              return (
                <button
                  key={phase}
                  onClick={() => setSelectedPhase(phase)}
                  className={`rounded-lg border p-3 text-left transition-all ${statusColor[status]} ${isActive ? "ring-2 ring-primary ring-offset-1" : "hover:opacity-80"}`}
                >
                  <div className="flex items-center gap-1.5">
                    {status === StageStatus.COMPLETED ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                    ) : status === StageStatus.IN_PROGRESS ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                    ) : (
                      <Circle className="h-4 w-4 shrink-0" />
                    )}
                    <span className="text-[10px] font-semibold uppercase tracking-wide">Tahap {i + 1}</span>
                  </div>
                  <p className="text-xs font-semibold mt-1 leading-tight">{StagePhaseLabels[phase]}</p>
                  <p className="text-[10px] mt-0.5">{stage ? `${stage.progress}%` : "0%"} · {StageStatusLabels[status]}</p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Panel tahap terpilih */}
      {(() => {
        const activeStage = stages.find((s) => s.phase === activePhase);
        if (!activeStage) return null;
        return (
          <StagePanel
            key={activeStage.id}
            stage={activeStage}
            locationId={locationId}
            locationName={location.name}
            beritaAcara={beritaAcaraAll}
            currentUserName={user?.name ?? "Petugas"}
            currentUserRole={user ? UserRoleLabels[user.role] : "Petugas"}
            canWrite={canWrite}
          />
        );
      })()}
    </div>
  );
}

// ============================================================
// KAPASITAS SELECTOR (dropdown di header)
// ============================================================
function CapacitySelector({ locationId, currentCapacity, canWrite }: { locationId: string; currentCapacity: number; canWrite: boolean }) {
  const updateCapacity = useUpdateCapacity();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(currentCapacity);

  function handleSave() {
    if (draft === currentCapacity) { setOpen(false); return; }
    updateCapacity.mutate({ id: locationId, capacity: draft }, { onSuccess: () => setOpen(false) });
  }

  return (
    <>
      <button
        onClick={() => { if (!canWrite) return; setDraft(currentCapacity); setOpen(true); }}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors ${canWrite ? 'hover:bg-muted/50' : 'cursor-default'}`}
      >
        <Users className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="font-medium">{currentCapacity}</span>
        <span className="text-muted-foreground">peserta/sesi</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Ubah Kapasitas Lokasi</DialogTitle>
            <DialogDescription>
              Pilih kapasitas titik lokasi. Jumlah barang yang bersifat kapasitas akan menyesuaikan otomatis.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Kapasitas Titik Lokasi</Label>
              <Select value={String(draft)} onValueChange={(v) => setDraft(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CAPACITY_OPTIONS.map((cap) => (
                    <SelectItem key={cap} value={String(cap)}>
                      {cap} peserta/sesi
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Item yang akan menyesuaikan:</p>
              <p>· Laptop client peserta: <span className="font-semibold text-foreground">{draft} unit</span></p>
              <p>· Kursi ujian (cover): <span className="font-semibold text-foreground">{draft} unit</span></p>
              <p>· Kursi transit/registrasi: <span className="font-semibold text-foreground">{Math.round(draft * 1.5)} unit</span></p>
              <p>· Container box: <span className="font-semibold text-foreground">{Math.max(1, Math.round(draft * 0.2))} unit</span></p>
              <p>· Tenda semi dekor: <span className="font-semibold text-foreground">{draft * 2} m²</span></p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button disabled={updateCapacity.isPending} onClick={handleSave}>
              {updateCapacity.isPending && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              Simpan Kapasitas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ============================================================
// PANEL DETAIL SATU TAHAP
// ============================================================
function StagePanel({
  stage, locationId, locationName, beritaAcara, currentUserName, currentUserRole, canWrite,
}: {
  stage: LocationStage;
  locationId: string;
  locationName: string;
  beritaAcara: BeritaAcara[];
  currentUserName: string;
  currentUserRole: string;
  canWrite: boolean;
}) {
  const updateStage = useUpdateStage(locationId);
  const addPhoto = useAddStagePhoto(locationId);
  const deletePhoto = useDeleteStagePhoto(locationId);

  const [progressDraft, setProgressDraft] = useState<number>(stage.progress);
  const [notesDraft, setNotesDraft] = useState<string>(stage.notes ?? "");
  const [photoOpen, setPhotoOpen] = useState(false);
  const [photoCaption, setPhotoCaption] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoPage, setPhotoPage] = useState(0);

  function handlePhotoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 100 MB");
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  // Foto/video diunggah ke penyimpanan disk server (bukan base64 di database),
  // lalu URL-nya dicatat sebagai dokumentasi tahap.
  async function handleSavePhoto() {
    if (!photoFile || !photoCaption) return;
    setPhotoUploading(true);
    try {
      const res = await apiClient.uploadFile<{ url: string }>("/api/v1/uploads", photoFile);
      addPhoto.mutate(
        { id: stage.id, url: res.data.url, caption: photoCaption },
        { onSuccess: () => { setPhotoOpen(false); setPhotoPage(0); } }
      );
    } catch {
      toast.error("Gagal mengunggah file");
    } finally {
      setPhotoUploading(false);
    }
  }

  const baTypes = StageBeritaAcaraTypes[stage.phase];
  const stageBA = beritaAcara.filter((b) => baTypes.includes(b.type));
  const isPersiapan = stage.phase === StagePhase.PERSIAPAN;

  const photos = stage.photos;
  const totalPhotoPages = Math.ceil(photos.length / PHOTOS_PER_PAGE);
  const visiblePhotos = photos.slice(photoPage * PHOTOS_PER_PAGE, (photoPage + 1) * PHOTOS_PER_PAGE);

  function handleSaveProgress() {
    updateStage.mutate({ id: stage.id, data: { progress: progressDraft, notes: notesDraft || undefined } });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Kolom kiri: status & progres */}
      <Card className="lg:col-span-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{StagePhaseLabels[stage.phase]}</CardTitle>
          <CardDescription className="text-xs">{StagePhaseDescriptions[stage.phase]}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className={statusColor[stage.status]}>
              {StageStatusLabels[stage.status]}
            </Badge>
            {canWrite && (
              <div className="flex gap-2">
                {stage.status === StageStatus.NOT_STARTED && (
                  <Button size="sm" onClick={() => updateStage.mutate({ id: stage.id, data: { status: StageStatus.IN_PROGRESS } })} disabled={updateStage.isPending}>
                    <Play className="h-3.5 w-3.5 mr-1" /> Mulai Tahap
                  </Button>
                )}
                {stage.status === StageStatus.IN_PROGRESS && (
                  <Button size="sm" onClick={() => updateStage.mutate({ id: stage.id, data: { status: StageStatus.COMPLETED } })} disabled={updateStage.isPending}>
                    <CheckCheck className="h-3.5 w-3.5 mr-1" /> Tandai Selesai
                  </Button>
                )}
                {stage.status === StageStatus.COMPLETED && (
                  <Button size="sm" variant="outline" onClick={() => updateStage.mutate({ id: stage.id, data: { status: StageStatus.IN_PROGRESS } })} disabled={updateStage.isPending}>
                    Buka Kembali
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <Label>Progres</Label>
              <span className="font-semibold">{progressDraft}%</span>
            </div>
            <Progress value={progressDraft} />
            <input
              type="range" min={0} max={100} step={5}
              value={progressDraft}
              onChange={(e) => setProgressDraft(Number(e.target.value))}
              disabled={stage.status !== StageStatus.IN_PROGRESS || !canWrite}
              className={`w-full accent-primary ${!canWrite && 'opacity-50 cursor-not-allowed'}`}
            />
          </div>

          <div className="space-y-2">
            <Label>Catatan</Label>
            <Textarea
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              placeholder="Catatan kondisi lapangan..."
              rows={3}
              readOnly={!canWrite}
            />
          </div>

          {canWrite && (
            <Button size="sm" className="w-full" onClick={handleSaveProgress} disabled={updateStage.isPending}>
              {updateStage.isPending && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              Simpan Progres & Catatan
            </Button>
          )}

          <Separator />

          <div className="text-xs text-muted-foreground space-y-1">
            {stage.startedAt && <p>Dimulai: {new Date(stage.startedAt).toLocaleString("id-ID")}</p>}
            {stage.completedAt && <p>Selesai: {new Date(stage.completedAt).toLocaleString("id-ID")}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Kolom kanan: foto + BA + barang */}
      <div className="lg:col-span-2 space-y-6">
        {/* Dokumentasi foto */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Dokumentasi Foto &amp; Video</CardTitle>
                <CardDescription className="text-xs">{photos.length} dokumentasi pada tahap ini</CardDescription>
              </div>
              {canWrite && (
                <Button size="sm" variant="outline" onClick={() => { setPhotoCaption(""); setPhotoFile(null); setPhotoPreview(""); setPhotoOpen(true); }}>
                  <Camera className="h-4 w-4 mr-1" /> Tambah
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {photos.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Belum ada dokumentasi.</p>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {visiblePhotos.map((p) => (
                    <figure key={p.id} className="space-y-1 group relative">
                      {isVideoUrl(p.url) ? (
                        <video src={p.url} controls className="rounded-lg border w-full aspect-[4/3] object-cover bg-black" />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.url} alt={p.caption} className="rounded-lg border w-full aspect-[4/3] object-cover" />
                      )}
                      <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* Unduh — tersedia untuk semua role termasuk pengawasan BKN */}
                        <a
                          href={p.url}
                          download={downloadName(p)}
                          title="Unduh"
                          className="h-6 w-6 rounded bg-black/60 text-white flex items-center justify-center hover:bg-primary"
                        >
                          <Download className="h-3 w-3" />
                        </a>
                        {canWrite && (
                          <button
                            onClick={() => deletePhoto.mutate({ stageId: stage.id, photoId: p.id })}
                            disabled={deletePhoto.isPending}
                            title="Hapus"
                            className="h-6 w-6 rounded bg-black/60 text-white flex items-center justify-center hover:bg-red-600"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      <figcaption className="text-[11px] text-muted-foreground leading-tight">{p.caption}</figcaption>
                    </figure>
                  ))}
                </div>
                {totalPhotoPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-3 border-t">
                    <Button
                      size="sm" variant="outline"
                      onClick={() => setPhotoPage((p) => Math.max(0, p - 1))}
                      disabled={photoPage === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      {photoPage + 1} / {totalPhotoPages} ({photos.length} foto)
                    </span>
                    <Button
                      size="sm" variant="outline"
                      onClick={() => setPhotoPage((p) => Math.min(totalPhotoPages - 1, p + 1))}
                      disabled={photoPage >= totalPhotoPages - 1}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Berita acara tahap ini */}
        {baTypes.length > 0 && (
          <BeritaAcaraSection
            locationId={locationId}
            locationName={locationName}
            baTypes={baTypes}
            list={stageBA}
            canWrite={canWrite}
          />
        )}

        {/* Barang di titik lokasi (tahap persiapan) */}
        {isPersiapan && <LocationItemsSection locationId={locationId} canWrite={canWrite} />}
      </div>

      {/* Dialog tambah foto */}
      <Dialog open={photoOpen} onOpenChange={setPhotoOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Tambah Dokumentasi</DialogTitle>
            <DialogDescription>
              Upload foto atau video lapangan beserta keterangannya.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Foto / Video *</Label>
              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-muted-foreground/30 rounded-lg p-4 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors">
                {photoPreview && photoFile?.type.startsWith("video") ? (
                  <video src={photoPreview} controls className="max-h-40 rounded-md" />
                ) : photoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoPreview} alt="Preview" className="max-h-40 rounded-md object-contain" />
                ) : (
                  <>
                    <Camera className="h-8 w-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Klik untuk pilih foto atau video</span>
                    <span className="text-[11px] text-muted-foreground/70">Maks. 100 MB</span>
                  </>
                )}
                <input type="file" accept="image/*,video/*" className="sr-only" onChange={handlePhotoFileChange} />
              </label>
            </div>
            <div className="space-y-2">
              <Label>Keterangan *</Label>
              <Input
                value={photoCaption}
                onChange={(e) => setPhotoCaption(e.target.value)}
                placeholder="cth: Pemasangan jaringan LAN ruang B1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPhotoOpen(false)}>Batal</Button>
            <Button
              disabled={!photoCaption || !photoFile || photoUploading || addPhoto.isPending}
              onClick={handleSavePhoto}
            >
              {(photoUploading || addPhoto.isPending) && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              {photoUploading ? "Mengunggah..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// SEKSI BERITA ACARA — upload file saja
// ============================================================
// Badge status BA mengikuti alur approval pengawas lapangan
const BA_STATUS_STYLE: Record<BeritaAcaraStatus, string> = {
  [BeritaAcaraStatus.DRAFT]: "text-slate-600 bg-slate-50 border-slate-200",
  [BeritaAcaraStatus.PENDING_APPROVAL]: "text-amber-700 bg-amber-50 border-amber-300",
  [BeritaAcaraStatus.FINAL]: "text-emerald-700 bg-emerald-50 border-emerald-300",
  [BeritaAcaraStatus.REJECTED]: "text-red-700 bg-red-50 border-red-300",
};

function BeritaAcaraSection({
  locationId, locationName, baTypes, list, canWrite,
}: {
  locationId: string;
  locationName: string;
  baTypes: BeritaAcaraType[];
  list: BeritaAcara[];
  canWrite: boolean;
}) {
  const createBA = useCreateBeritaAcara();
  const deleteBA = useDeleteBeritaAcara();
  const approveBA = useApproveBeritaAcara();
  const rejectBA = useRejectBeritaAcara();
  const { canApproveBA } = usePermissions();

  const [uploadOpen, setUploadOpen] = useState(false);
  const [preview, setPreview] = useState<BeritaAcara | null>(null);

  function handleDelete(ba: BeritaAcara) {
    if (!confirm(`Hapus "${ba.title}" beserta filenya?`)) return;
    deleteBA.mutate(ba.id, {
      onSuccess: () => toast.success("Berita acara dihapus"),
    });
  }

  function handleApprove(ba: BeritaAcara) {
    if (!confirm(`Setujui "${ba.title}"?`)) return;
    approveBA.mutate(ba.id, {
      onSuccess: () => toast.success("Berita acara disetujui"),
    });
  }

  function handleReject(ba: BeritaAcara) {
    const note = prompt(`Alasan penolakan "${ba.title}":`);
    if (!note?.trim()) return;
    rejectBA.mutate({ id: ba.id, note: note.trim() }, {
      onSuccess: () => toast.success("Berita acara ditolak"),
    });
  }

  const defaultType = baTypes[0];
  const [form, setForm] = useState({
    type: defaultType,
    title: "",
    date: new Date().toISOString().slice(0, 10),
    fileName: "",
    fileUrl: "",
  });

  function openUpload() {
    setForm({
      type: defaultType,
      title: `${BeritaAcaraTypeLabels[defaultType]} - ${locationName}`,
      date: new Date().toISOString().slice(0, 10),
      fileName: "",
      fileUrl: "",
    });
    setUploadOpen(true);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 10 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((f) => ({ ...f, fileName: file.name, fileUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  }

  function handleUpload() {
    createBA.mutate(
      {
        type: form.type,
        locationId,
        title: form.title,
        date: form.date,
        fileUrl: form.fileUrl,
        fileName: form.fileName,
      },
      { onSuccess: () => setUploadOpen(false) }
    );
  }

  const valid = form.title && form.fileUrl;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Berita Acara</CardTitle>
            <CardDescription className="text-xs">
              Upload file BA yang telah ditandatangani
            </CardDescription>
          </div>
          {canWrite && (
            <Button size="sm" onClick={openUpload}>
              <FileUp className="h-4 w-4 mr-1" /> Upload BA
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Belum ada berita acara pada tahap ini.</p>
        ) : (
          <div className="space-y-2">
            {list.map((ba) => (
              <div key={ba.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-gray-50/60">
                <div className="flex items-start gap-3 min-w-0">
                  <FileText className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{ba.title}</p>
                    <p className="text-xs text-muted-foreground font-mono">{ba.documentNumber}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <p className="text-xs text-muted-foreground">
                        {new Date(ba.date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                      </p>
                      {ba.fileName && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-blue-600">
                          <FileUp className="h-3 w-3" />{ba.fileName}
                        </span>
                      )}
                    </div>
                    {/* Jejak approval */}
                    {ba.status === BeritaAcaraStatus.FINAL && ba.approvedBy && (
                      <p className="text-[10px] text-emerald-600 mt-0.5">
                        Disetujui oleh {ba.approvedBy.name}
                        {ba.approvedAt && ` · ${new Date(ba.approvedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}`}
                      </p>
                    )}
                    {ba.status === BeritaAcaraStatus.REJECTED && (
                      <p className="text-[10px] text-red-600 mt-0.5">
                        Ditolak{ba.approvedBy ? ` oleh ${ba.approvedBy.name}` : ""}{ba.rejectionNote ? `: ${ba.rejectionNote}` : ""}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className={`text-[10px] ${BA_STATUS_STYLE[ba.status]}`}>
                    {BeritaAcaraStatusLabels[ba.status]}
                  </Badge>
                  {/* Approval pengawas lapangan */}
                  {canApproveBA && ba.status === BeritaAcaraStatus.PENDING_APPROVAL && (
                    <>
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        disabled={approveBA.isPending}
                        onClick={() => handleApprove(ba)}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Setujui
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        disabled={rejectBA.isPending}
                        onClick={() => handleReject(ba)}
                      >
                        Tolak
                      </Button>
                    </>
                  )}
                  <Button size="sm" variant="outline" disabled={!ba.fileUrl} onClick={() => setPreview(ba)}>
                    <Eye className="h-3.5 w-3.5 mr-1" /> Lihat
                  </Button>
                  {canWrite && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:bg-red-50 hover:text-red-700"
                      disabled={deleteBA.isPending}
                      onClick={() => handleDelete(ba)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Viewer file BA yang di-upload (PDF/gambar sebagai data URL) */}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-base">{preview?.title}</DialogTitle>
            <DialogDescription className="font-mono text-xs">
              {preview?.documentNumber}{preview?.fileName ? ` — ${preview.fileName}` : ""}
            </DialogDescription>
          </DialogHeader>
          {preview?.fileUrl?.startsWith("data:image") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview.fileUrl} alt={preview.fileName ?? preview.title} className="max-h-[70vh] w-full object-contain rounded-md border" />
          ) : preview?.fileUrl ? (
            <iframe src={preview.fileUrl} title={preview.fileName ?? preview.title} className="h-[70vh] w-full rounded-md border" />
          ) : null}
          <DialogFooter>
            {preview?.fileUrl && (
              <a href={preview.fileUrl} download={preview.fileName ?? "berita-acara"}>
                <Button variant="outline"><FileUp className="h-4 w-4 mr-1 rotate-180" /> Unduh</Button>
              </a>
            )}
            <Button onClick={() => setPreview(null)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog upload BA — sederhana: file + judul + tanggal */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Berita Acara</DialogTitle>
            <DialogDescription>Upload file dokumen BA yang telah ditandatangani (PDF/gambar).</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* File upload */}
            <div className="space-y-2">
              <Label>File Dokumen *</Label>
              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-muted-foreground/30 rounded-lg p-6 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors">
                <FileUp className="h-8 w-8 text-muted-foreground" />
                {form.fileName ? (
                  <span className="text-sm font-medium text-primary">{form.fileName}</span>
                ) : (
                  <span className="text-sm text-muted-foreground">Klik untuk pilih file PDF atau gambar</span>
                )}
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="sr-only"
                  onChange={handleFileChange}
                />
              </label>
            </div>

            {baTypes.length > 1 && (
              <div className="space-y-2">
                <Label>Jenis BA</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm((f) => ({
                    ...f,
                    type: (v ?? defaultType) as BeritaAcaraType,
                    title: `${BeritaAcaraTypeLabels[(v ?? defaultType) as BeritaAcaraType]} - ${locationName}`,
                  }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {baTypes.map((t) => (
                      <SelectItem key={t} value={t}>{BeritaAcaraTypeLabels[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-2 sm:col-span-2">
                <Label>Judul Dokumen *</Label>
                <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Tanggal *</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>Batal</Button>
            <Button disabled={!valid || createBA.isPending} onClick={handleUpload}>
              {createBA.isPending && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              Upload & Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ============================================================
// SEKSI BARANG DI TITIK LOKASI (CRUD)
// ============================================================
function LocationItemsSection({ locationId, canWrite }: { locationId: string; canWrite: boolean }) {
  const { data: itemsResponse, isLoading } = useLocationItems(locationId);
  const createItem = useCreateLocationItem(locationId);
  const updateItem = useUpdateLocationItem(locationId);
  const deleteItem = useDeleteLocationItem(locationId);
  const seedStandard = useSeedStandardItems(locationId);

  const items = itemsResponse?.data ?? [];

  const emptyForm = { name: "", qty: 1, unit: "unit", ownership: ItemOwnership.SEWA, condition: ItemCondition.BAIK, notes: "" };
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<LocationItem | null>(null);
  const [form, setForm] = useState(emptyForm);

  const [seedOpen, setSeedOpen] = useState(false);
  const [selectedCapacity, setSelectedCapacity] = useState(100);

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  }

  function openEdit(item: LocationItem) {
    setEditing(item);
    setForm({ name: item.name, qty: item.qty, unit: item.unit, ownership: item.ownership, condition: item.condition, notes: item.notes ?? "" });
    setFormOpen(true);
  }

  function handleSubmit() {
    const payload = { ...form, notes: form.notes || undefined };
    if (editing) {
      updateItem.mutate({ itemId: editing.id, data: payload }, { onSuccess: () => setFormOpen(false) });
    } else {
      createItem.mutate(payload, { onSuccess: () => setFormOpen(false) });
    }
  }

  function handleSeed() {
    seedStandard.mutate(selectedCapacity, { onSuccess: () => setSeedOpen(false) });
  }

  const pending = createItem.isPending || updateItem.isPending;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-base">Barang di Titik Lokasi</CardTitle>
            <CardDescription className="text-xs">{items.length} item terdaftar</CardDescription>
          </div>
          {canWrite && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setSeedOpen(true)}>
                <PackagePlus className="h-3.5 w-3.5 mr-1" />
                Isi 38 Item Standar
              </Button>
              <Button size="sm" onClick={openAdd}>
                <Plus className="h-4 w-4 mr-1" /> Tambah Barang
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Belum ada barang. Gunakan tombol &ldquo;Isi 38 Item Standar&rdquo; untuk memuat daftar sesuai Lampiran 2 dokumen katalog.
          </p>
        ) : (
          <div className="max-h-96 overflow-y-auto rounded border">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead className="w-8">No.</TableHead>
                  <TableHead>Uraian</TableHead>
                  <TableHead className="w-20 text-right">Jumlah</TableHead>
                  <TableHead className="w-20">Satuan</TableHead>
                  <TableHead className="w-28">Status</TableHead>
                  <TableHead className="w-24">Kondisi</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item: LocationItem, i: number) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-xs text-muted-foreground">{i + 1}.</TableCell>
                    <TableCell className="text-xs">{item.name}</TableCell>
                    <TableCell className="text-xs text-right">{item.qty}</TableCell>
                    <TableCell className="text-xs">{item.unit}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{ItemOwnershipLabels[item.ownership]}</Badge></TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${item.condition === ItemCondition.BAIK ? "text-emerald-700 border-emerald-300" : "text-red-700 border-red-300"}`}>
                        {ItemConditionLabels[item.condition]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {canWrite && (
                        <div className="flex gap-1">
                          <Button size="icon-sm" variant="ghost" onClick={() => openEdit(item)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon-sm" variant="ghost" className="text-red-600 hover:text-red-700" onClick={() => deleteItem.mutate(item.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Dialog pilih kapasitas sebelum seed */}
      <Dialog open={seedOpen} onOpenChange={setSeedOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Isi 38 Item Standar</DialogTitle>
            <DialogDescription>
              Pilih kapasitas titik lokasi. Jumlah item yang bersifat kapasitas akan menyesuaikan otomatis.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Kapasitas Titik Lokasi</Label>
              <Select
                value={String(selectedCapacity)}
                onValueChange={(v) => setSelectedCapacity(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CAPACITY_OPTIONS.map((cap) => (
                    <SelectItem key={cap} value={String(cap)}>
                      {cap} peserta/sesi
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Item yang menyesuaikan kapasitas:</p>
              <p>· Laptop client peserta: <span className="font-semibold text-foreground">{selectedCapacity} unit</span></p>
              <p>· Kursi ujian (cover): <span className="font-semibold text-foreground">{selectedCapacity} unit</span></p>
              <p>· Kursi transit/registrasi: <span className="font-semibold text-foreground">{Math.round(selectedCapacity * 1.5)} unit</span></p>
              <p>· Container box: <span className="font-semibold text-foreground">{Math.max(1, Math.round(selectedCapacity * 0.2))} unit</span></p>
              <p>· Tenda semi dekor: <span className="font-semibold text-foreground">{selectedCapacity * 2} m²</span></p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSeedOpen(false)}>Batal</Button>
            <Button disabled={seedStandard.isPending} onClick={handleSeed}>
              {seedStandard.isPending && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              Isi Sekarang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog tambah/edit barang */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Ubah Barang" : "Tambah Barang"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>Uraian Barang *</Label>
              <Textarea rows={2} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Jumlah *</Label>
                <Input type="number" min={1} value={form.qty} onChange={(e) => setForm((f) => ({ ...f, qty: Number(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>Satuan</Label>
                <Input value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Kepemilikan</Label>
                <Select value={form.ownership} onValueChange={(v) => setForm((f) => ({ ...f, ownership: (v ?? ItemOwnership.SEWA) as ItemOwnership }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.values(ItemOwnership).map((o) => (
                      <SelectItem key={o} value={o}>{ItemOwnershipLabels[o]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Kondisi</Label>
                <Select value={form.condition} onValueChange={(v) => setForm((f) => ({ ...f, condition: (v ?? ItemCondition.BAIK) as ItemCondition }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.values(ItemCondition).map((c) => (
                      <SelectItem key={c} value={c}>{ItemConditionLabels[c]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Catatan</Label>
              <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="opsional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Batal</Button>
            <Button disabled={!form.name || pending} onClick={handleSubmit}>
              {pending && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              {editing ? "Simpan Perubahan" : "Tambah"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
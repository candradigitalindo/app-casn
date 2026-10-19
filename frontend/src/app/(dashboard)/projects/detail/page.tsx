'use client';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient, handleQueryError, ApiError } from '@/lib/api-client';
import {
  projectApi,
  projectLabels,
  money,
  PlanLocation,
  Requirement,
  Offer,
  Project,
} from '@/lib/api/projects';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useAuthStore } from '@/lib/stores/auth';
import { useProvinces, useRegencies } from '@/lib/hooks/useMasterData';
import { FeaturePage, QueryStatus } from '@/components/feature-page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

function AllocationEditor({
  project,
  requirement,
  close,
}: {
  project: Project;
  requirement: Requirement;
  close: () => void;
}) {
  const client = useQueryClient();
  const offers = useQuery({
    queryKey: ['projects', project.id, 'offers', requirement.id],
    queryFn: () =>
      apiClient.get<Offer[]>(
        `/api/v1/projects/${project.id}/requirements/${requirement.id}/offers`,
      ),
  });
  const [rows, setRows] = useState<
    Record<string, { qty: number; price: string; priceUnit: string }>
  >(() =>
    Object.fromEntries(
      requirement.allocations.map((a) => [
        a.vendorItemId ?? '',
        { qty: a.qty, price: a.unitPrice, priceUnit: a.priceUnit },
      ]),
    ),
  );
  const [margin, setMargin] = useState(requirement.marginPct ?? '');
  const update = useMutation({
    mutationFn: async () => {
      const allocations = Object.entries(rows)
        .filter(
          ([id, row]) =>
            row.qty > 0 && offers.data?.data.some((offer) => offer.id === id),
        )
        .map(([vendorItemId, row]) => ({
          vendorItemId,
          qty: row.qty,
          unitPrice: Number(row.price),
          priceUnit: row.priceUnit,
        }));
      await apiClient.post(
        `/api/v1/projects/${project.id}/requirements/${requirement.id}/allocations`,
        { allocations },
      );
      await apiClient.patch(
        `/api/v1/projects/${project.id}/requirements/${requirement.id}`,
        { marginPct: margin === '' ? null : Number(margin) },
      );
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['projects'] });
      close();
      toast.success('Alokasi tersimpan');
    },
    onError: (error) => {
      client.invalidateQueries({ queryKey: ['projects'] });
      handleQueryError(error as unknown as ApiError);
    },
  });
  const total = Object.entries(rows)
    .filter(([id]) => offers.data?.data.some((offer) => offer.id === id))
    .reduce((n, [, row]) => n + row.qty, 0);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Alokasi {requirement.name}</DialogTitle>
        </DialogHeader>
        <p className="text-sm">
          Kebutuhan {requirement.qty} {requirement.unit} · Dialokasikan {total}.
          Harga dapat disesuaikan sebelum pengajuan.
        </p>
        <QueryStatus
          loading={offers.isLoading}
          error={offers.isError}
          retry={() => offers.refetch()}
        />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            update.mutate();
          }}
          className="space-y-4"
        >
          {offers.data?.data.map((offer) => {
            const row = rows[offer.id] ?? {
              qty: 0,
              price: String(offer.unitPrice),
              priceUnit: offer.priceUnit,
            };
            const change = (patch: Partial<typeof row>) =>
              setRows((prev) => ({
                ...prev,
                [offer.id]: { ...row, ...patch },
              }));
            return (
              <div key={offer.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex justify-between gap-2">
                  <strong className="text-sm">{offer.vendor.name}</strong>
                  <span className="text-xs">
                    Tersedia {offer.availableQty} ·{' '}
                    {money(offer.effectivePerEvent)}/event/unit
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <label className="text-xs">
                    Jumlah
                    <Input
                      type="number"
                      min={0}
                      max={offer.availableQty}
                      value={row.qty}
                      onChange={(e) => change({ qty: Number(e.target.value) })}
                      required
                    />
                  </label>
                  <label className="text-xs">
                    Harga satuan
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={row.price}
                      onChange={(e) => change({ price: e.target.value })}
                      required
                    />
                  </label>
                  <label className="text-xs">
                    Basis harga
                    <select
                      className="border rounded-md w-full h-9"
                      value={row.priceUnit}
                      onChange={(e) => change({ priceUnit: e.target.value })}
                    >
                      <option value="PER_HARI">Per hari</option>
                      <option value="PER_EVENT">Per event</option>
                    </select>
                  </label>
                </div>
              </div>
            );
          })}
          {offers.data?.data.length === 0 && (
            <p className="text-amber-700 text-sm">
              Belum ada katalog vendor aktif yang sesuai kategori dan wilayah.
              Lengkapi data vendor terlebih dahulu.
            </p>
          )}
          {requirement.allocations.some(
            (a) => !offers.data?.data.some((o) => o.id === a.vendorItemId),
          ) &&
            offers.data && (
              <p className="text-amber-700 text-sm">
                Ada pemasok yang sudah tidak tersedia. Atur jumlah pemasok
                pengganti; alokasi lama akan dihapus saat menyimpan.
              </p>
            )}
          <label className="block text-sm">
            Markup item (%) · kosong mengikuti proyek
            <Input
              type="number"
              min={0}
              max={999.99}
              step="0.01"
              value={margin}
              onChange={(e) => setMargin(e.target.value)}
            />
          </label>
          <Button
            type="submit"
            disabled={
              update.isPending ||
              offers.isLoading ||
              offers.isError ||
              total > requirement.qty
            }
          >
            Simpan alokasi
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function LocationEditor({
  project,
  location,
  close,
}: {
  project: Project;
  location?: PlanLocation;
  close: () => void;
}) {
  const client = useQueryClient();
  const provinces = useProvinces();
  const [province, setProvince] = useState(location?.provinceId ?? '');
  const regencies = useRegencies({ provinceId: province }, !!province);
  const [regency, setRegency] = useState(location?.regencyId ?? '');
  const save = useMutation({
    mutationFn: (data: object) =>
      location
        ? apiClient.patch(
            `/api/v1/projects/${project.id}/locations/${location.id}`,
            data,
          )
        : apiClient.post(`/api/v1/projects/${project.id}/locations`, data),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['projects'] });
      close();
    },
    onError: handleQueryError,
  });
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {location ? 'Ubah' : 'Tambah'} lokasi rencana
          </DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            const selected = regencies.data?.data.find((r) => r.id === regency);
            save.mutate({
              name: form.get('name'),
              provinceId: province,
              regencyId: regency || null,
              city: selected?.name ?? form.get('city'),
              capacity: Number(form.get('capacity')),
              days: Number(form.get('days')),
              address: form.get('address'),
              latitude:
                form.get('latitude') === ''
                  ? undefined
                  : Number(form.get('latitude')),
              longitude:
                form.get('longitude') === ''
                  ? undefined
                  : Number(form.get('longitude')),
            });
          }}
        >
          <label className="block text-sm">
            Nama lokasi
            <Input
              name="name"
              defaultValue={location?.name}
              minLength={2}
              required
            />
          </label>
          <label className="block text-sm">
            Provinsi
            <select
              aria-label="Provinsi"
              className="border rounded-md p-2 w-full"
              value={province}
              required
              onChange={(e) => {
                setProvince(e.target.value);
                setRegency('');
              }}
            >
              <option value="">Pilih provinsi</option>
              {provinces.data?.data.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Kabupaten / kota
            <select
              aria-label="Kabupaten / kota"
              className="border rounded-md p-2 w-full"
              value={regency}
              onChange={(e) => setRegency(e.target.value)}
            >
              <option value="">Isi nama kota manual</option>
              {regencies.data?.data.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          {!regency && (
            <label className="block text-sm">
              Nama kota
              <Input
                name="city"
                defaultValue={location?.city}
                minLength={2}
                required
              />
            </label>
          )}
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              Kapasitas (1–500)
              <Input
                name="capacity"
                type="number"
                min={1}
                max={500}
                defaultValue={location?.capacity ?? 100}
                required
              />
            </label>
            <label className="text-sm">
              Durasi hari (minimal 5)
              <Input
                name="days"
                type="number"
                min={5}
                max={3650}
                defaultValue={location?.days ?? 5}
                required
              />
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            Kebutuhan mengikuti tier kapasitas standar. Jumlah alokasi yang
            sudah ada dipertahankan.
          </p>
          <label className="block text-sm">
            Alamat
            <Input name="address" defaultValue={location?.address} required />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              Latitude
              <Input
                name="latitude"
                type="number"
                step="any"
                min={-90}
                max={90}
                defaultValue={location?.latitude}
                required
              />
            </label>
            <label className="text-sm">
              Longitude
              <Input
                name="longitude"
                type="number"
                step="any"
                min={-180}
                max={180}
                defaultValue={location?.longitude}
                required
              />
            </label>
          </div>
          <Button type="submit" disabled={save.isPending}>
            Simpan lokasi
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ProjectDetail() {
  const id = useSearchParams().get('id') ?? '';
  const client = useQueryClient();
  const { canManageProcurement } = usePermissions();
  const scoped = useAuthStore((s) => s.user?.locationId);
  const query = useQuery({
    queryKey: ['projects', id],
    queryFn: () => projectApi.get(id),
    enabled: !!id && canManageProcurement && !scoped,
  });
  const [locationEditor, setLocationEditor] = useState<
    PlanLocation | 'new' | null
  >(null);
  const [requirement, setRequirement] = useState<Requirement | null>(null);
  const action = useMutation({
    mutationFn: ({ path, data }: { path: string; data?: object }) =>
      projectApi.action(id, path, data),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['projects'] });
      client.invalidateQueries({ queryKey: ['locations'] });
      toast.success('Perubahan tersimpan');
    },
    onError: handleQueryError,
  });
  const update = useMutation({
    mutationFn: (data: object) => projectApi.update(id, data),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Pengaturan tersimpan');
    },
    onError: handleQueryError,
  });
  const remove = useMutation({
    mutationFn: (locationId: string) =>
      apiClient.delete(`/api/v1/projects/${id}/locations/${locationId}`),
    onSuccess: () => client.invalidateQueries({ queryKey: ['projects'] }),
    onError: handleQueryError,
  });
  if (!canManageProcurement || scoped)
    return (
      <FeaturePage title="Proyek">
        Anda tidak memiliki akses pengadaan proyek.
      </FeaturePage>
    );
  const project = query.data?.data;
  const editable =
    project && ['DRAFT', 'PENYUSUNAN_PENAWARAN'].includes(project.status);
  const busy = action.isPending || update.isPending || remove.isPending;
  return (
    <FeaturePage
      title={project?.name ?? 'Detail proyek'}
      description={
        project
          ? `${project.code} · ${project.agencyName} · ${projectLabels[project.status]}`
          : undefined
      }
    >
      <Link className="text-sm text-primary" href="/projects">
        ← Daftar proyek
      </Link>
      <QueryStatus
        loading={query.isLoading}
        error={query.isError}
        retry={() => query.refetch()}
      />
      {!id && <p>ID proyek belum dipilih.</p>}
      {project && (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              ['Biaya pengadaan', project.summary.costTotal],
              ['Penawaran', project.summary.sellTotal],
              ['Laba kotor', project.summary.profit],
              ['HPS', project.hpsAmount ?? null],
            ].map(([label, value]) => (
              <div className="border bg-white rounded-xl p-4" key={label}>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="font-semibold mt-2">
                  {value === null ? 'Belum diisi' : money(value)}
                </p>
              </div>
            ))}
          </div>
          {!!project.summary.missingLines && (
            <p className="text-amber-700">
              {project.summary.missingLines} item belum teralokasi penuh.
            </p>
          )}
          {project.summary.overHps && (
            <p className="text-red-700">
              Total penawaran melebihi HPS. Sesuaikan harga atau markup.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {editable && (
              <>
                <Button
                  disabled={busy}
                  onClick={() => setLocationEditor('new')}
                >
                  Tambah lokasi
                </Button>
                <Button
                  variant="outline"
                  disabled={busy || !project.locations.length}
                  onClick={() => action.mutate({ path: 'auto-allocate' })}
                >
                  Alokasi otomatis termurah
                </Button>
                <Button
                  disabled={
                    busy ||
                    !project.locations.length ||
                    !!project.summary.missingLines ||
                    project.summary.overHps
                  }
                  onClick={() => {
                    if (confirm('Ajukan dan kunci versi penawaran ini?'))
                      action.mutate({ path: 'submit' });
                  }}
                >
                  Ajukan penawaran
                </Button>
              </>
            )}
            {project.status === 'DIAJUKAN' && (
              <>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => {
                    const reason = prompt('Alasan revisi (minimal 5 karakter)');
                    if (reason)
                      action.mutate({ path: 'revise', data: { reason } });
                  }}
                >
                  Revisi penawaran
                </Button>
                {['MENANG', 'KALAH'].map((status) => (
                  <Button
                    key={status}
                    disabled={busy}
                    onClick={() => {
                      if (
                        confirm(
                          `Tandai proyek ${projectLabels[status].toLowerCase()}?`,
                        )
                      )
                        action.mutate({ path: 'status', data: { status } });
                    }}
                  >
                    {projectLabels[status]}
                  </Button>
                ))}
              </>
            )}
            {project.status === 'MENANG' && (
              <Button
                disabled={busy}
                onClick={() => {
                  if (
                    confirm(
                      'Buat seluruh lokasi operasional beserta barang, pemasok, dan enam tahap pelaksanaannya?',
                    )
                  )
                    action.mutate({ path: 'activate' });
                }}
              >
                Aktifkan operasional
              </Button>
            )}
            {project.status === 'OPERASIONAL' && (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() =>
                  action.mutate({ path: 'status', data: { status: 'SELESAI' } })
                }
              >
                Selesaikan proyek
              </Button>
            )}
            {['DRAFT', 'PENYUSUNAN_PENAWARAN', 'DIAJUKAN', 'MENANG'].includes(
              project.status,
            ) && (
              <Button
                variant="destructive"
                disabled={busy}
                onClick={() => {
                  if (confirm('Batalkan proyek ini?'))
                    action.mutate({
                      path: 'status',
                      data: { status: 'DIBATALKAN' },
                    });
                }}
              >
                Batalkan
              </Button>
            )}
          </div>
          {editable && (
            <details className="border bg-white rounded-xl p-4">
              <summary className="font-medium cursor-pointer">
                Pengaturan proyek & batas penawaran
              </summary>
              <form
                key={`${project.id}:${project.defaultMarginPct}:${project.hpsAmount}`}
                className="grid gap-3 md:grid-cols-3 mt-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = new FormData(e.currentTarget);
                  update.mutate({
                    name: form.get('name'),
                    agencyName: form.get('agencyName'),
                    defaultMarginPct: Number(form.get('margin')),
                    hpsAmount:
                      form.get('hps') === '' ? null : Number(form.get('hps')),
                    startDate: form.get('startDate') || null,
                    endDate: form.get('endDate') || null,
                    submissionDeadline: form.get('deadline') || null,
                  });
                }}
              >
                <label className="text-sm">
                  Nama proyek
                  <Input
                    name="name"
                    defaultValue={project.name}
                    required
                    minLength={2}
                  />
                </label>
                <label className="text-sm">
                  Instansi
                  <Input
                    name="agencyName"
                    defaultValue={project.agencyName}
                    required
                    minLength={2}
                  />
                </label>
                <label className="text-sm">
                  Markup default (%)
                  <Input
                    name="margin"
                    type="number"
                    min={0}
                    max={999.99}
                    step="0.01"
                    defaultValue={project.defaultMarginPct}
                    required
                  />
                </label>
                <label className="text-sm">
                  HPS (opsional)
                  <Input
                    name="hps"
                    type="number"
                    min={0}
                    step="0.01"
                    defaultValue={project.hpsAmount}
                  />
                </label>
                {[
                  ['startDate', 'Mulai', project.startDate],
                  ['endDate', 'Selesai', project.endDate],
                  ['deadline', 'Batas pengajuan', project.submissionDeadline],
                ].map(([name, label, value]) => (
                  <label key={name} className="text-sm">
                    {label}
                    <Input
                      name={name}
                      type="date"
                      defaultValue={value?.slice(0, 10)}
                    />
                  </label>
                ))}
                <Button type="submit" disabled={busy}>
                  Simpan pengaturan
                </Button>
              </form>
            </details>
          )}
          <div className="space-y-5">
            {project.locations.map((loc) => (
              <section
                key={loc.id}
                className="border bg-white rounded-xl overflow-hidden"
              >
                <div className="p-4 border-b flex flex-wrap gap-3 justify-between">
                  <div>
                    <h2 className="font-semibold">{loc.name}</h2>
                    <p className="text-xs text-muted-foreground">
                      {loc.city}, {loc.province.name} · {loc.capacity} peserta ·{' '}
                      {loc.days} hari · {money(loc.sellTotal)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {loc.locationId && (
                      <Link
                        className="text-primary text-sm"
                        href={`/locations/detail?id=${loc.locationId}`}
                      >
                        Lokasi operasional →
                      </Link>
                    )}
                    {editable && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setLocationEditor(loc)}
                        >
                          Ubah
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => {
                            if (confirm(`Hapus rencana lokasi ${loc.name}?`))
                              remove.mutate(loc.id);
                          }}
                        >
                          Hapus
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-left">
                      <tr>
                        {[
                          'Barang',
                          'Kebutuhan',
                          'Pemasok',
                          'Biaya',
                          'Markup',
                          'Penawaran',
                          '',
                        ].map((label, index) => (
                          <th className="p-3 whitespace-nowrap" key={index}>
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {loc.requirements.map((req) => (
                        <tr className="border-t" key={req.id}>
                          <td className="p-3 min-w-40">{req.name}</td>
                          <td
                            className={`p-3 ${req.missingQty ? 'text-amber-700' : 'text-green-700'}`}
                          >
                            {req.allocatedQty}/{req.qty} {req.unit}
                          </td>
                          <td className="p-3 min-w-48">
                            {req.allocations.map((a) => (
                              <p key={a.id} className="text-xs">
                                {a.vendor.name}: {a.qty} × {money(a.unitPrice)}{' '}
                                {a.priceUnit === 'PER_HARI'
                                  ? '/hari'
                                  : '/event'}
                              </p>
                            ))}
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            {money(req.costTotal)}
                          </td>
                          <td className="p-3">{req.effectiveMarginPct}%</td>
                          <td className="p-3 whitespace-nowrap">
                            {money(req.sellTotal)}
                          </td>
                          <td className="p-3">
                            {editable && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setRequirement(req)}
                              >
                                Atur
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </div>
          <section className="border bg-white rounded-xl p-4 space-y-3">
            <h2 className="font-semibold">Riwayat versi penawaran</h2>
            {project.proposals.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Versi tersimpan saat penawaran diajukan.
              </p>
            )}
            {project.proposals.map((p) => (
              <div
                key={p.version}
                className="flex flex-wrap justify-between gap-2 text-sm"
              >
                <span>
                  {p.documentNumber} ·{' '}
                  {new Date(p.createdAt).toLocaleDateString('id-ID')} ·{' '}
                  {money(p.sellTotal)}
                </span>
                <Link
                  className="text-primary"
                  href={`/projects/proposal?id=${project.id}&version=${p.version}`}
                >
                  Lihat / cetak
                </Link>
              </div>
            ))}
          </section>
          {locationEditor && (
            <LocationEditor
              project={project}
              location={locationEditor === 'new' ? undefined : locationEditor}
              close={() => setLocationEditor(null)}
            />
          )}
          {requirement && (
            <AllocationEditor
              project={project}
              requirement={requirement}
              close={() => setRequirement(null)}
            />
          )}
        </>
      )}
    </FeaturePage>
  );
}
export default function Page() {
  return (
    <Suspense fallback={<p className="p-8">Memuat proyek…</p>}>
      <ProjectDetail />
    </Suspense>
  );
}

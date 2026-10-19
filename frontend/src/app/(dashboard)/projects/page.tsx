'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { projectApi, projectLabels } from '@/lib/api/projects';
import { handleQueryError } from '@/lib/api-client';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useAuthStore } from '@/lib/stores/auth';
import { FeaturePage, QueryStatus } from '@/components/feature-page';
import {
  ListPagination,
  useListPage,
  useDebouncedSearch,
} from '@/components/list-pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
export default function ProjectsPage() {
  const router = useRouter();
  const { canManageProcurement } = usePermissions();
  const scoped = useAuthStore((s) => s.user?.locationId);
  const [search, setSearch] = useState('');
  const debounced = useDebouncedSearch(search);
  const [status, setStatus] = useState('');
  const [page, setPage] = useListPage(`${debounced}:${status}`);
  const [open, setOpen] = useState(false);
  const query = useQuery({
    queryKey: ['projects', 'list', page, debounced, status],
    queryFn: () =>
      projectApi.list({
        page,
        search: debounced || undefined,
        status: status || undefined,
      }),
    enabled: canManageProcurement && !scoped,
  });
  const create = useMutation({
    mutationFn: projectApi.create,
    onSuccess: (res) => router.push(`/projects/detail?id=${res.data.id}`),
    onError: handleQueryError,
  });
  if (!canManageProcurement || scoped)
    return (
      <FeaturePage title="Proyek & penawaran">
        Pengadaan proyek tersedia untuk Super Admin dan Logistik dengan cakupan
        seluruh lokasi.
      </FeaturePage>
    );
  return (
    <FeaturePage
      title="Proyek & penawaran"
      description="Rencanakan lokasi, alokasikan pemasok, ajukan penawaran, dan aktifkan proyek yang menang."
    >
      <div className="flex flex-wrap gap-3">
        <Input
          aria-label="Cari proyek"
          placeholder="Cari nama, kode, atau instansi…"
          className="max-w-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          aria-label="Status proyek"
          className="border rounded-md p-2"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Semua status</option>
          {Object.entries(projectLabels).map(([value, label]) => (
            <option value={value} key={value}>
              {label}
            </option>
          ))}
        </select>
        <Button className="ml-auto" onClick={() => setOpen(true)}>
          Tambah proyek
        </Button>
      </div>
      <QueryStatus
        loading={query.isLoading}
        error={query.isError}
        retry={() => query.refetch()}
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {query.data?.data.map((project) => (
          <Link
            key={project.id}
            href={`/projects/detail?id=${project.id}`}
            className="rounded-xl border bg-white p-5 hover:border-primary"
          >
            <p className="text-xs text-muted-foreground">
              {project.code} · {project.fiscalYear}
            </p>
            <h2 className="font-semibold text-lg mt-2">{project.name}</h2>
            <p className="text-sm text-muted-foreground">
              {project.agencyName}
            </p>
            <p className="text-sm mt-4 text-primary">
              {projectLabels[project.status]}
            </p>
            <p className="text-xs mt-2">
              {project._count?.locations ?? 0} lokasi ·{' '}
              {project._count?.proposals ?? 0} versi penawaran
            </p>
          </Link>
        ))}
      </div>
      {query.data?.data.length === 0 && (
        <p className="text-muted-foreground">Belum ada proyek yang sesuai.</p>
      )}
      <ListPagination
        page={page}
        total={query.data?.meta?.total}
        totalPages={query.data?.meta?.totalPages}
        onPage={setPage}
        loading={query.isFetching}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Proyek baru</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              create.mutate({
                name: form.get('name'),
                agencyName: form.get('agencyName'),
                fiscalYear: Number(form.get('fiscalYear')),
                defaultMarginPct: Number(form.get('defaultMarginPct')),
              });
            }}
          >
            <label className="block text-sm">
              Nama proyek
              <Input name="name" minLength={2} required />
            </label>
            <label className="block text-sm">
              Instansi
              <Input name="agencyName" minLength={2} required />
            </label>
            <label className="block text-sm">
              Tahun anggaran
              <Input
                name="fiscalYear"
                type="number"
                min={2020}
                max={2100}
                defaultValue={new Date().getFullYear()}
                required
              />
            </label>
            <label className="block text-sm">
              Markup awal (%)
              <Input
                name="defaultMarginPct"
                type="number"
                min={0}
                max={999.99}
                step="0.01"
                defaultValue={10}
                required
              />
            </label>
            <Button type="submit" disabled={create.isPending}>
              Buat proyek
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </FeaturePage>
  );
}

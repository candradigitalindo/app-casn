'use client';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { FeaturePage, QueryStatus } from '@/components/feature-page';
import { Button } from '@/components/ui/button';
interface State {
  completedAt?: string;
  status?: string;
  databaseBytes?: number;
  uploadBytes?: number;
  durationSeconds?: number;
}
interface Health {
  status: string;
  version: string;
  uptimeSeconds: number;
  storage: { availableBytes: number; totalBytes: number };
  backup?: State;
  restore?: State;
  monitor?: State;
}
export default function OperationsPage() {
  const { isSuperAdmin } = usePermissions();
  const query = useQuery({
    queryKey: ['operations'],
    queryFn: () => apiClient.get<Health>('/api/v1/health'),
    enabled: isSuperAdmin,
    refetchInterval: 60000,
  });
  if (!isSuperAdmin)
    return (
      <FeaturePage title="Operasional sistem">
        Halaman ini tersedia untuk Super Admin.
      </FeaturePage>
    );
  const health = query.data?.data;
  return (
    <FeaturePage
      title="Operasional sistem"
      description="Kesehatan layanan, backup, dan pengujian pemulihan data."
    >
      <Button
        variant="outline"
        disabled={query.isFetching}
        onClick={() => query.refetch()}
      >
        Perbarui status
      </Button>
      <QueryStatus
        loading={query.isLoading}
        error={query.isError}
        retry={() => query.refetch()}
      />
      {health && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border bg-white p-5">
              <h2 className="font-semibold">Layanan</h2>
              <p className="mt-2 text-green-700">
                Database & antrean terhubung
              </p>
              <p className="text-xs text-muted-foreground">
                Versi {health.version} · Aktif{' '}
                {Math.floor(health.uptimeSeconds / 3600)} jam
              </p>
            </div>
            <div className="rounded-xl border bg-white p-5">
              <h2 className="font-semibold">Penyimpanan tersedia</h2>
              <p className="mt-2 text-2xl">
                {(health.storage.availableBytes / 1073741824).toFixed(1)} GB
              </p>
              <p className="text-xs text-muted-foreground">
                dari {(health.storage.totalBytes / 1073741824).toFixed(1)} GB
              </p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {(
              [
                ['Backup harian', health.backup],
                ['Uji pemulihan mingguan', health.restore],
                ['Pemeriksaan berkala', health.monitor],
              ] as const
            ).map(([label, state]) => (
              <div key={label} className="rounded-xl border bg-white p-5">
                <h2 className="font-semibold">{label}</h2>
                <p className="mt-2">
                  {state?.completedAt
                    ? new Date(state.completedAt).toLocaleString('id-ID')
                    : 'Belum tersedia'}
                </p>
                <p
                  className={
                    state?.status === 'ok'
                      ? 'text-sm text-green-700'
                      : 'text-sm text-amber-700'
                  }
                >
                  {state?.status === 'ok'
                    ? 'Berhasil'
                    : (state?.status ?? 'Perlu diperiksa')}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </FeaturePage>
  );
}

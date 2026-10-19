'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, handleQueryError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/stores/auth';
import { Button } from '@/components/ui/button';
import { FeaturePage, QueryStatus } from '@/components/feature-page';
interface Session {
  id: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  lastUsedAt: string;
  current: boolean;
}
interface Attempt {
  id: string;
  success: boolean;
  ipAddress?: string;
  createdAt: string;
}
export default function AccountPage() {
  const client = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const sessions = useQuery({
    queryKey: ['sessions'],
    queryFn: () => apiClient.get<Session[]>('/api/v1/auth/sessions'),
    staleTime: 0,
  });
  const attempts = useQuery({
    queryKey: ['login-attempts'],
    queryFn: () => apiClient.get<Attempt[]>('/api/v1/auth/login-attempts'),
  });
  const revoke = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/v1/auth/sessions/${id}`),
    onSuccess: () => client.invalidateQueries({ queryKey: ['sessions'] }),
    onError: handleQueryError,
  });
  const all = useMutation({
    mutationFn: () => apiClient.post('/api/v1/auth/logout-all'),
    onSuccess: () => useAuthStore.getState().logout(),
    onError: handleQueryError,
  });
  return (
    <FeaturePage
      title="Akun & sesi"
      description={`${user?.name ?? ''} · ${user?.email ?? ''}`}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">Perangkat yang memiliki akses</h2>
        <Button
          variant="destructive"
          disabled={all.isPending}
          onClick={() => {
            if (confirm('Keluar dari semua perangkat, termasuk perangkat ini?'))
              all.mutate();
          }}
        >
          Keluar dari semua perangkat
        </Button>
      </div>
      <QueryStatus
        loading={sessions.isLoading}
        error={sessions.isError}
        retry={() => sessions.refetch()}
      />
      <div className="space-y-3">
        {sessions.data?.data.map((session) => (
          <div
            key={session.id}
            className="rounded-xl border bg-white p-4 flex flex-wrap gap-4 justify-between items-center"
          >
            <div className="min-w-0">
              <p className="font-medium">
                {session.current ? 'Perangkat ini' : 'Perangkat lain'} ·{' '}
                {session.ipAddress || 'IP tidak tersedia'}
              </p>
              <p className="text-xs text-muted-foreground break-all max-w-2xl">
                {session.userAgent || 'Perangkat tidak diketahui'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Login {new Date(session.createdAt).toLocaleString('id-ID')} ·
                Aktif {new Date(session.lastUsedAt).toLocaleString('id-ID')}
              </p>
            </div>
            <Button
              variant="outline"
              disabled={revoke.isPending}
              onClick={() => {
                if (confirm('Cabut akses perangkat ini?'))
                  revoke.mutate(session.id, {
                    onSuccess: () => {
                      if (session.current) useAuthStore.getState().logout();
                    },
                  });
              }}
            >
              Cabut akses
            </Button>
          </div>
        ))}
      </div>
      <h2 className="font-semibold">Riwayat login terakhir</h2>
      <QueryStatus
        loading={attempts.isLoading}
        error={attempts.isError}
        retry={() => attempts.refetch()}
      />
      <div className="rounded-xl border bg-white divide-y">
        {attempts.data?.data.map((attempt) => (
          <div
            key={attempt.id}
            className="p-3 flex flex-wrap justify-between gap-3 text-sm"
          >
            <span
              className={attempt.success ? 'text-green-700' : 'text-red-700'}
            >
              {attempt.success ? 'Berhasil' : 'Gagal'}
            </span>
            <span>{attempt.ipAddress}</span>
            <span>{new Date(attempt.createdAt).toLocaleString('id-ID')}</span>
          </div>
        ))}
      </div>
    </FeaturePage>
  );
}
